migrate(
  (app) => {
    const inventoryCol = app.findCollectionByNameOrId('clinical_inventory')
    const batchCol = app.findCollectionByNameOrId('inventory_batches')

    let items = app.findRecordsByFilter('clinical_inventory', '1=1', '', 10, 0)
    if (items.length === 0) {
      const r1 = new Record(inventoryCol)
      r1.set('name', 'Seringa 5ml')
      r1.set('current_quantity', 100)
      r1.set('min_quantity', 20)
      r1.set('unit', 'un')
      app.save(r1)
      const r2 = new Record(inventoryCol)
      r2.set('name', 'Gaze Estéril')
      r2.set('current_quantity', 50)
      r2.set('min_quantity', 10)
      r2.set('unit', 'pct')
      app.save(r2)
      items = [r1, r2]
    }

    try {
      app.findFirstRecordByData('inventory_batches', 'batch_number', 'LOTE-001')
    } catch (_) {
      const b1 = new Record(batchCol)
      b1.set('material_id', items[0].id)
      b1.set('batch_number', 'LOTE-001')
      const exp1 = new Date()
      exp1.setDate(exp1.getDate() + 45)
      b1.set('expiry_date', exp1.toISOString().split('T')[0] + ' 12:00:00.000Z')
      b1.set('initial_quantity', 100)
      b1.set('current_quantity', 100)
      app.save(b1)

      if (items.length > 1) {
        const b2 = new Record(batchCol)
        b2.set('material_id', items[1].id)
        b2.set('batch_number', 'LOTE-002')
        const exp2 = new Date()
        exp2.setDate(exp2.getDate() + 15)
        b2.set('expiry_date', exp2.toISOString().split('T')[0] + ' 12:00:00.000Z')
        b2.set('initial_quantity', 50)
        b2.set('current_quantity', 50)
        app.save(b2)
      }
    }
  },
  (app) => {
    try {
      const record = app.findFirstRecordByData('inventory_batches', 'batch_number', 'LOTE-001')
      app.delete(record)
    } catch (_) {}
  },
)
