onRecordAfterUpdateSuccess((e) => {
  const currentQuantity = e.record.getInt('current_quantity')
  const minQuantity = e.record.getInt('min_quantity')

  if (currentQuantity <= minQuantity) {
    try {
      $app.findFirstRecordByFilter(
        'purchase_orders',
        "material_id = {:materialId} && (status = 'draft' || status = 'ordered')",
        { materialId: e.record.id },
      )
      // Already has a draft or ordered PO
      return e.next()
    } catch (_) {
      // Create a draft PO
      const collection = $app.findCollectionByNameOrId('purchase_orders')
      const po = new Record(collection)
      po.set('material_id', e.record.id)
      // Reorder quantity default logic (can be adjusted by manager later)
      po.set('quantity', minQuantity > 0 ? minQuantity * 2 : 10)
      po.set('status', 'draft')
      $app.save(po)
    }
  }

  return e.next()
}, 'clinical_inventory')
