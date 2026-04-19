routerAdd(
  'POST',
  '/backend/v1/protocols/apply',
  (e) => {
    const body = e.requestInfo().body || {}
    const patient_id = body.patient_id
    const template_id = body.template_id
    const note_content = body.note_content
    const amount = body.amount
    const billing_type = body.billing_type
    const ignore_stock = body.ignore_stock === true

    if (!patient_id || !template_id) {
      return e.badRequestError('Patient ID and Template ID are required.')
    }

    let result = {}

    $app.runInTransaction((txApp) => {
      const template = txApp.findRecordById('clinic_templates', template_id)
      const config = template.get('config_data') || {}

      const materials = config.required_materials || []
      let stockErrors = []
      let usagesToCreate = []

      // Check inventory and prepare FIFO deductions
      for (const mat of materials) {
        const matId = mat.material_id
        const requiredQty = mat.quantity

        const batches = txApp.findRecordsByFilter(
          'inventory_batches',
          'material_id = {:matId} && current_quantity > 0',
          'expiry_date',
          100,
          0,
          { matId: matId },
        )

        let totalStock = 0
        for (const b of batches) {
          totalStock += b.getFloat('current_quantity')
        }

        if (totalStock < requiredQty && !ignore_stock) {
          let matName = matId
          try {
            const mRec = txApp.findRecordById('clinical_inventory', matId)
            matName = mRec.getString('name')
          } catch (_) {}
          stockErrors.push(`${matName} (Necessário: ${requiredQty}, Disp: ${totalStock})`)
        } else if (totalStock > 0) {
          let remainingToDeduct = requiredQty
          for (const b of batches) {
            if (remainingToDeduct <= 0) break
            const available = b.getFloat('current_quantity')
            const deduct = Math.min(available, remainingToDeduct)

            b.set('current_quantity', available - deduct)
            txApp.save(b)

            usagesToCreate.push({
              batch_id: b.id,
              quantity: deduct,
            })

            remainingToDeduct -= deduct
          }
        }
      }

      if (stockErrors.length > 0 && !ignore_stock) {
        throw new BadRequestError('Estoque insuficiente', {
          _stock_warning: stockErrors.join(' | '),
        })
      }

      // Create Medical Note
      const noteCol = txApp.findCollectionByNameOrId('medical_notes')
      const note = new Record(noteCol)
      note.set('patient_id', patient_id)
      note.set('content', note_content || config.note_template || '')
      note.set('professionalId', e.auth.id)
      note.set('status', 'completed')
      note.set('clinic_id', e.auth.getString('clinic_id') || '')
      txApp.save(note)

      // Create usages
      const usageCol = txApp.findCollectionByNameOrId('inventory_usage')
      for (const u of usagesToCreate) {
        const usage = new Record(usageCol)
        usage.set('batch_id', u.batch_id)
        usage.set('patient_id', patient_id)
        usage.set('quantity_used', u.quantity)
        usage.set('professional_id', e.auth.id)
        usage.set('usage_date', new Date().toISOString())
        usage.set('medical_note_id', note.id)
        usage.set('clinic_id', e.auth.getString('clinic_id') || '')
        txApp.save(usage)
      }

      // Create Finance Charge
      const financeCol = txApp.findCollectionByNameOrId('consultations_finance')
      const finance = new Record(financeCol)
      finance.set('patient_id', patient_id)
      finance.set('medical_note_id', note.id)
      finance.set('amount', amount !== undefined ? amount : config.financial_impact?.amount || 0)
      finance.set('status', 'pending')
      finance.set(
        'billing_type',
        billing_type || config.financial_impact?.billing_type || 'private',
      )
      finance.set('clinic_id', e.auth.getString('clinic_id') || '')
      txApp.save(finance)

      result = { note_id: note.id, finance_id: finance.id, usages_created: usagesToCreate.length }
    })

    return e.json(200, result)
  },
  $apis.requireAuth(),
)
