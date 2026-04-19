onRecordDeleteRequest(
  (e) => {
    const collectionName = e.collection.name
    const recordId = e.record.id
    const clinicId = e.record.getString('clinic_id')
    const details = e.record.publicExport()
    const authRecord = e.auth

    e.next()

    if (!authRecord || authRecord.collection().name !== 'users') return

    const logsCol = $app.findCollectionByNameOrId('action_logs')
    const log = new Record(logsCol)
    log.set('user_id', authRecord.id)
    log.set('action', 'DELETE')
    log.set('collection_name', collectionName)
    log.set('record_id', recordId)
    if (clinicId) log.set('clinic_id', clinicId)
    log.set('details', details)
    $app.saveNoValidate(log)
  },
  'medical_notes',
  'patients',
)

onRecordUpdateRequest(
  (e) => {
    const collectionName = e.collection.name
    const authRecord = e.auth

    const oldQty = e.record.getFloat('current_quantity')
    const oldStatus = e.record.getString('status')

    e.next()

    if (!authRecord || authRecord.collection().name !== 'users') return

    let shouldLog = false
    let details = {}

    if (collectionName === 'clinical_inventory') {
      const newQty = e.record.getFloat('current_quantity')
      if (oldQty !== newQty) {
        shouldLog = true
        details = { old_quantity: oldQty, new_quantity: newQty }
      }
    } else if (collectionName === 'users') {
      const newStatus = e.record.getString('status')
      if (oldStatus !== newStatus) {
        shouldLog = true
        details = { old_status: oldStatus, new_status: newStatus }
      }
    }

    if (shouldLog) {
      const logsCol = $app.findCollectionByNameOrId('action_logs')
      const log = new Record(logsCol)
      log.set('user_id', authRecord.id)
      log.set('action', 'UPDATE')
      log.set('collection_name', collectionName)
      log.set('record_id', e.record.id)
      const clinicId = e.record.getString('clinic_id')
      if (clinicId) log.set('clinic_id', clinicId)
      log.set('details', details)
      $app.saveNoValidate(log)
    }
  },
  'clinical_inventory',
  'users',
)
