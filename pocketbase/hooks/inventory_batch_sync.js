onRecordAfterCreateSuccess((e) => {
  const batch = e.record
  const qty = batch.getFloat('initial_quantity')
  const materialId = batch.getString('material_id')

  if (qty > 0 && materialId) {
    $app.runInTransaction((txApp) => {
      const material = txApp.findRecordById('clinical_inventory', materialId)
      const currentMatQty = material.getFloat('current_quantity')
      material.set('current_quantity', currentMatQty + qty)
      txApp.saveNoValidate(material)
    })
  }
  return e.next()
}, 'inventory_batches')
