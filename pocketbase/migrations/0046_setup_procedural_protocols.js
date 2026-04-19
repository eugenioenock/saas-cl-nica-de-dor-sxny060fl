migrate(
  (app) => {
    // Update collection rules to allow manager role
    const templatesCol = app.findCollectionByNameOrId('clinic_templates')
    templatesCol.listRule = "@request.auth.role = 'admin' || @request.auth.role = 'manager'"
    templatesCol.viewRule = "@request.auth.role = 'admin' || @request.auth.role = 'manager'"
    templatesCol.createRule = "@request.auth.role = 'admin' || @request.auth.role = 'manager'"
    templatesCol.updateRule = "@request.auth.role = 'admin' || @request.auth.role = 'manager'"
    templatesCol.deleteRule = "@request.auth.role = 'admin' || @request.auth.role = 'manager'"
    app.save(templatesCol)

    // Fetch some inventory items to use in the seed
    const inventoryCol = app.findCollectionByNameOrId('clinical_inventory')
    const items = app.findRecordsByFilter('clinical_inventory', '1=1', '', 5, 0)

    let matId1 = null
    let matId2 = null

    if (items.length >= 2) {
      matId1 = items[0].id
      matId2 = items[1].id
    } else {
      // Create dummy items if none exist
      const item1 = new Record(inventoryCol)
      item1.set('name', 'Agulha Espinhal 22G')
      item1.set('current_quantity', 100)
      item1.set('min_quantity', 20)
      item1.set('unit', 'un')
      app.save(item1)
      matId1 = item1.id

      const item2 = new Record(inventoryCol)
      item2.set('name', 'Lidocaína 2%')
      item2.set('current_quantity', 50)
      item2.set('min_quantity', 10)
      item2.set('unit', 'ml')
      app.save(item2)
      matId2 = item2.id
    }

    // Seed data
    const protocols = [
      {
        name: 'Infiltração de Faceta Lombar',
        type: 'consultation_pattern',
        config_data: {
          note_template:
            'Procedimento: Infiltração de Faceta Lombar\nNível: L4-L5 bilateral\nSolução: Lidocaína 2% (2ml) + Corticoide\nIntercorrências: Nenhuma',
          required_materials: [
            { material_id: matId1, quantity: 2 },
            { material_id: matId2, quantity: 4 },
          ],
          financial_impact: {
            amount: 1500,
            billing_type: 'private',
          },
        },
      },
      {
        name: 'Bloqueio de Nervo Periférico',
        type: 'consultation_pattern',
        config_data: {
          note_template:
            'Procedimento: Bloqueio de Nervo Periférico\nNervo Alvo: \nVolume anestésico: \nResposta ao teste motor: adequada\nComplicações: Nenhuma',
          required_materials: [
            { material_id: matId1, quantity: 1 },
            { material_id: matId2, quantity: 5 },
          ],
          financial_impact: {
            amount: 800,
            billing_type: 'private',
          },
        },
      },
      {
        name: 'Consulta de Retorno Standard',
        type: 'consultation_pattern',
        config_data: {
          note_template:
            'Subjetivo: Paciente refere melhora de X% da dor.\nObjetivo: Sem déficits neurológicos novos.\nConduta: Manter medicação e reavaliar em 30 dias.',
          required_materials: [],
          financial_impact: {
            amount: 250,
            billing_type: 'private',
          },
        },
      },
    ]

    for (const p of protocols) {
      try {
        app.findFirstRecordByData('clinic_templates', 'name', p.name)
      } catch (_) {
        const record = new Record(templatesCol)
        record.set('name', p.name)
        record.set('type', p.type)
        record.set('config_data', p.config_data)
        app.save(record)
      }
    }
  },
  (app) => {
    // Revert rules
    const templatesCol = app.findCollectionByNameOrId('clinic_templates')
    templatesCol.listRule = "@request.auth.role = 'admin'"
    templatesCol.viewRule = "@request.auth.role = 'admin'"
    templatesCol.createRule = "@request.auth.role = 'admin'"
    templatesCol.updateRule = "@request.auth.role = 'admin'"
    templatesCol.deleteRule = "@request.auth.role = 'admin'"
    app.save(templatesCol)

    const names = [
      'Infiltração de Faceta Lombar',
      'Bloqueio de Nervo Periférico',
      'Consulta de Retorno Standard',
    ]
    for (const n of names) {
      try {
        const record = app.findFirstRecordByData('clinic_templates', 'name', n)
        app.delete(record)
      } catch (_) {}
    }
  },
)
