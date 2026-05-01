migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    let record
    try {
      record = app.findAuthRecordByEmail('_pb_users_auth_', 'clinicadedor@gmail.com')
    } catch (_) {
      record = new Record(users)
      record.setEmail('clinicadedor@gmail.com')
    }

    record.setPassword('DOR@Clinica#2026')
    record.setVerified(true)
    record.set('name', 'Admin Master')
    record.set('role', 'admin')
    record.set('status', 'active')

    app.save(record)
  },
  (app) => {
    try {
      const record = app.findAuthRecordByEmail('_pb_users_auth_', 'clinicadedor@gmail.com')
      app.delete(record)
    } catch (_) {}
  },
)
