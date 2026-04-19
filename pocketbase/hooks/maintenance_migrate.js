routerAdd(
  'POST',
  '/backend/v1/maintenance/migrate-orphans',
  (e) => {
    const body = e.requestInfo().body || {}
    const targetClinicId = body.clinic_id
    if (!targetClinicId) return e.badRequestError('Missing clinic_id')

    if (!e.auth || e.auth.getString('role') !== 'admin') {
      return e.forbiddenError('Admin only')
    }

    const tables = [
      'patients',
      'appointments',
      'medical_notes',
      'clinical_inventory',
      'consultations_finance',
      'inventory_batches',
      'inventory_usage',
      'purchase_orders',
      'inventory_counts',
    ]
    let totalUpdated = 0

    $app.runInTransaction((txApp) => {
      for (const table of tables) {
        if (txApp.hasTable(table)) {
          const res = txApp
            .db()
            .newQuery(
              `UPDATE ${table} SET clinic_id = {:clinicId} WHERE clinic_id IS NULL OR clinic_id = ''`,
            )
            .bind({ clinicId: targetClinicId })
            .execute()
          totalUpdated += res.rowsAffected()
        }
      }
    })

    return e.json(200, { updated: totalUpdated })
  },
  $apis.requireAuth(),
)
