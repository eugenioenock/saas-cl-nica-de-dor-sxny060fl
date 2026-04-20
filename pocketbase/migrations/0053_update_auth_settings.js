migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')

    users.createRule =
      "@request.auth.id = '' || (clinic_id = @request.auth.clinic_id && (@request.auth.role = 'admin' || @request.auth.role = 'manager'))"
    users.updateRule =
      "id = @request.auth.id || (clinic_id = @request.auth.clinic_id && (@request.auth.role = 'admin' || @request.auth.role = 'manager'))"
    users.deleteRule =
      "id = @request.auth.id || (clinic_id = @request.auth.clinic_id && (@request.auth.role = 'admin' || @request.auth.role = 'manager'))"

    app.save(users)
  },
  (app) => {
    const users = app.findCollectionByNameOrId('users')

    users.createRule = ''
    users.updateRule = 'id = @request.auth.id'
    users.deleteRule = 'id = @request.auth.id'

    app.save(users)
  },
)
