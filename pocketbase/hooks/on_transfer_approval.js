onRecordAfterUpdateSuccess((e) => {
  const record = e.record
  const original = record.original()

  if (record.getString('status') === 'approved' && original.getString('status') === 'pending') {
    const type = record.getString('type')
    const itemId = record.getString('item_id')
    const targetClinicId = record.getString('target_clinic_id')
    const approvedBy = record.getString('approved_by')

    try {
      $app.runInTransaction((txApp) => {
        if (type === 'inventory') {
          const batch = txApp.findRecordById('inventory_batches', itemId)
          batch.set('clinic_id', targetClinicId)
          txApp.save(batch)
        } else if (type === 'patient_record') {
          const patient = txApp.findRecordById('patients', itemId)
          patient.set('clinic_id', targetClinicId)
          txApp.save(patient)
        }

        const logCol = txApp.findCollectionByNameOrId('action_logs')
        const log = new Record(logCol)
        log.set('user_id', approvedBy)
        log.set('action', 'transfer_approved')
        log.set('collection_name', 'unit_transfers')
        log.set('record_id', record.id)
        log.set('details', JSON.stringify({ type, itemId, targetClinicId }))
        txApp.save(log)

        record.set('status', 'completed')
        txApp.save(record)
      })
    } catch (err) {
      console.log('Transfer processing failed: ' + err)
    }
  }
  return e.next()
}, 'unit_transfers')
