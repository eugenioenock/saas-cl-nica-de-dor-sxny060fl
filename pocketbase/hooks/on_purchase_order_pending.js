onRecordAfterCreateSuccess((e) => {
  if (e.record.getString('status') === 'pending_approval') {
    const clinicId = e.record.getString('clinic_id')
    let clinicName = 'Matriz / Não Identificada'
    try {
      if (clinicId) {
        const clinic = $app.findRecordById('clinic_settings', clinicId)
        clinicName = clinic.getString('name')
      }
    } catch (_) {}

    const annCol = $app.findCollectionByNameOrId('announcements')
    const ann = new Record(annCol)
    ann.set('title', 'Aprovação de Compra Pendente')
    ann.set(
      'content',
      `A clínica ${clinicName} solicitou uma nova ordem de compra que requer aprovação no sistema.`,
    )
    ann.set('priority', 'high')
    ann.set('clinic_id', '')
    $app.save(ann)
  }
  e.next()
}, 'purchase_orders')

onRecordAfterUpdateSuccess((e) => {
  const oldStatus = e.record.original().getString('status')
  const newStatus = e.record.getString('status')
  if (oldStatus !== 'pending_approval' && newStatus === 'pending_approval') {
    const clinicId = e.record.getString('clinic_id')
    let clinicName = 'Matriz / Não Identificada'
    try {
      if (clinicId) {
        const clinic = $app.findRecordById('clinic_settings', clinicId)
        clinicName = clinic.getString('name')
      }
    } catch (_) {}

    const annCol = $app.findCollectionByNameOrId('announcements')
    const ann = new Record(annCol)
    ann.set('title', 'Aprovação de Compra Pendente')
    ann.set(
      'content',
      `A clínica ${clinicName} solicitou uma nova ordem de compra que requer aprovação no sistema.`,
    )
    ann.set('priority', 'high')
    ann.set('clinic_id', '')
    $app.save(ann)
  }
  e.next()
}, 'purchase_orders')
