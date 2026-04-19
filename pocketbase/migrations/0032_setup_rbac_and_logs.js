migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    const roleField = users.fields.getByName('role')

    if (roleField) {
      roleField.values = ['admin', 'manager', 'professional', 'receptionist', 'patient']
      app.save(users)
    }
  },
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    const roleField = users.fields.getByName('role')

    if (roleField) {
      // Revert to old values
      roleField.values = ['admin', 'professional', 'patient']
      app.save(users)
    }
  },
)
