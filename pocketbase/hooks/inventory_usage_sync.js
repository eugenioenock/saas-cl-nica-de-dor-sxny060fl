onRecordAfterCreateSuccess((e) => {
  const usage = e.record
  const qty = usage.getFloat('quantity_used')
  const batchId = usage.getString('batch_id')

  if (qty > 0 && batchId) {
    $app.runInTransaction((txApp) => {
      const batch = txApp.findRecordById('inventory_batches', batchId)
      const currentBatchQty = batch.getFloat('current_quantity')
      batch.set('current_quantity', Math.max(0, currentBatchQty - qty))
      txApp.saveNoValidate(batch)

      const materialId = batch.getString('material_id')
      const material = txApp.findRecordById('clinical_inventory', materialId)
      const currentMatQty = material.getFloat('current_quantity')
      material.set('current_quantity', Math.max(0, currentMatQty - qty))
      txApp.saveNoValidate(material)
    })
  }
  return e.next()
}, 'inventory_usage')
