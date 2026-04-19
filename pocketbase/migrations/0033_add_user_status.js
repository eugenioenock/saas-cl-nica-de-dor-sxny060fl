migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    if (!users.fields.getByName('status')) {
      users.fields.add(
        new SelectField({
          name: 'status',
          values: ['pending', 'active', 'rejected'],
          maxSelect: 1,
        }),
      )
    }

    app.save(users)

    // Set existing to active to not break current users
    try {
      const allUsers = app.findRecordsByFilter('_pb_users_auth_', '1=1', '', 10000, 0)
      allUsers.forEach((record) => {
        if (!record.getString('status')) {
          record.set('status', 'active')
          app.save(record)
        }
      })
    } catch (e) {
      // Ignore if no users
    }
  },
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    users.fields.removeByName('status')
    app.save(users)
  },
)
