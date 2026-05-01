migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    // Idempotent: skip if user already exists
    try {
      app.findAuthRecordByEmail('_pb_users_auth_', 'clinicadedor@gmail.com')
      return // already seeded
    } catch (_) {}

    const record = new Record(users)
    record.setEmail('clinicadedor@gmail.com')
    record.setPassword('DOR@Clinica#2026')
    record.setVerified(true)
    record.set('name', 'Super Admin')
    record.set('role', 'admin')
    record.set('status', 'active')

    // Try to associate with the primary clinic_settings if one exists
    try {
      const clinics = app.findRecordsByFilter('clinic_settings', '1=1', 'created', 1, 0)
      if (clinics && clinics.length > 0) {
        record.set('clinic_id', clinics[0].id)
      }
    } catch (_) {}

    app.save(record)
  },
  (app) => {
    try {
      const record = app.findAuthRecordByEmail('_pb_users_auth_', 'clinicadedor@gmail.com')
      app.delete(record)
    } catch (_) {}
  },
)
