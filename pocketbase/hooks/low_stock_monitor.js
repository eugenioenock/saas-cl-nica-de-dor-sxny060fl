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
    } catch (_) {
      // Create a draft PO
      const collection = $app.findCollectionByNameOrId('purchase_orders')
      const po = new Record(collection)
      po.set('material_id', e.record.id)
      // Reorder quantity default logic (can be adjusted by manager later)
      po.set('quantity', minQuantity > 0 ? minQuantity * 2 : 10)
      po.set('status', 'draft')
      po.set('clinic_id', e.record.getString('clinic_id'))
      $app.save(po)
    }

    try {
      const clinicId = e.record.getString('clinic_id')
      const materialName = e.record.getString('name')

      const users = $app.findRecordsByFilter(
        'users',
        "role = 'admin' || (role = 'manager' && clinic_id = {:clinicId})",
        '',
        100,
        0,
        { clinicId: clinicId || '' },
      )

      users.forEach((user) => {
        const notifCol = $app.findCollectionByNameOrId('notifications')
        const notif = new Record(notifCol)
        notif.set('user_id', user.id)
        notif.set('title', 'Alerta de Estoque Baixo')
        notif.set(
          'message',
          `Material ${materialName} atingiu o estoque mínimo de ${minQuantity}. Estoque atual: ${currentQuantity}.`,
        )
        notif.set('type', 'system')
        if (clinicId) notif.set('clinic_id', clinicId)
        $app.saveNoValidate(notif)
      })
    } catch (err) {
      console.log('Error creating low stock notification', err)
    }
  }

  return e.next()
}, 'clinical_inventory')
