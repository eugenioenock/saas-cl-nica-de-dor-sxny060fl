routerAdd(
  'POST',
  '/backend/v1/maintenance/migrate-batch',
  (e) => {
    const body = e.requestInfo().body || {}
    const clinicId = body.clinic_id
    const batchSize = parseInt(body.batch_size) || 50

    if (!clinicId) {
      return e.badRequestError('Missing clinic_id')
    }

    const collections = ['patients', 'appointments', 'medical_notes', 'consultations_finance']
    let totalMigrated = 0
    let remaining = false

    for (let i = 0; i < collections.length; i++) {
      const col = collections[i]
      const records = $app.findRecordsByFilter(col, "clinic_id = ''", '', batchSize, 0)

      if (records.length > 0) {
        $app.runInTransaction((txApp) => {
          for (let j = 0; j < records.length; j++) {
            const record = records[j]
            record.set('clinic_id', clinicId)
            txApp.saveNoValidate(record)
            totalMigrated++
          }
        })
      }

      if (records.length === batchSize) {
        remaining = true
      }
    }

    return e.json(200, { migrated: totalMigrated, remaining: remaining })
  },
  $apis.requireAuth(),
)
