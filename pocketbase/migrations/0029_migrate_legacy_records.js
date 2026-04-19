migrate(
  (app) => {
    let firstClinicId = ''
    try {
      const clinics = app.findRecordsByFilter('clinic_settings', '', 'created', 1, 0)
      if (clinics.length > 0) {
        firstClinicId = clinics[0].id
      }
    } catch (e) {}

    if (!firstClinicId) return

    const tables = ['patients', 'appointments', 'medical_notes', 'clinical_inventory']
    for (const table of tables) {
      if (app.hasTable(table)) {
        app
          .db()
          .newQuery(
            `UPDATE ${table} SET clinic_id = {:clinicId} WHERE clinic_id IS NULL OR clinic_id = ''`,
          )
          .bind({ clinicId: firstClinicId })
          .execute()
      }
    }
  },
  (app) => {
    // Irreversible schema data patch
  },
)
