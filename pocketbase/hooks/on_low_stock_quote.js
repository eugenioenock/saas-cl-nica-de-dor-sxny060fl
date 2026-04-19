onRecordAfterUpdateSuccess((e) => {
  const record = e.record
  const currentQty = record.getInt('current_quantity')
  const minQty = record.getInt('min_quantity')

  if (currentQty <= minQty) {
    const clinicId = record.getString('clinic_id')

    try {
      $app.findFirstRecordByFilter(
        'purchase_orders',
        "material_id = {:material} AND (status = 'draft' OR status = 'quote_requested' OR status = 'pending_approval')",
        { material: record.id },
      )
      return e.next()
    } catch (_) {}

    let suppliers
    try {
      suppliers = $app.findRecordsByFilter(
        'suppliers',
        'materials ~ {:material} AND clinic_id = {:clinic}',
        '-created',
        1,
        0,
        { material: record.id, clinic: clinicId },
      )
    } catch (_) {
      suppliers = []
    }

    const supplier = suppliers.length > 0 ? suppliers[0] : null

    const poCol = $app.findCollectionByNameOrId('purchase_orders')
    const newPo = new Record(poCol)
    newPo.set('material_id', record.id)

    const reqQty = Math.max(minQty * 2 - currentQty, 10)
    newPo.set('quantity', reqQty)
    newPo.set('status', supplier ? 'quote_requested' : 'draft')
    newPo.set('clinic_id', clinicId)
    if (supplier) {
      newPo.set('supplier_id', supplier.id)
    }
    $app.save(newPo)

    try {
      const managers = $app.findRecordsByFilter(
        'users',
        "(role = 'manager' OR role = 'admin') AND clinic_id = {:clinic}",
        '',
        10,
        0,
        { clinic: clinicId },
      )
      const notifCol = $app.findCollectionByNameOrId('notifications')

      for (let manager of managers) {
        const notif = new Record(notifCol)
        notif.set('user_id', manager.id)
        notif.set('title', 'Cotação Automática Gerada')
        const msg = supplier
          ? `Estoque baixo detectado para ${record.getString('name')}. Uma solicitação de cotação foi gerada para o fornecedor ${supplier.getString('name')}.`
          : `Estoque baixo detectado para ${record.getString('name')}. Um rascunho de pedido foi gerado (sem fornecedor vinculado).`
        notif.set('message', msg)
        notif.set('type', 'system')
        notif.set('clinic_id', clinicId)
        notif.set('is_read', false)
        $app.save(notif)
      }
    } catch (err) {
      console.log('Error notifying managers: ', err)
    }
  }

  return e.next()
}, 'clinical_inventory')
