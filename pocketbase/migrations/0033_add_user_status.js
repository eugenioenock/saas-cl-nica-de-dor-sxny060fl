migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    if (!users.fields.getByName('status')) {
      const { SelectField } = require('pocketbase/models/schema')
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
    app
      .db()
      .newQuery("UPDATE _pb_users_auth_ SET status = 'active' WHERE status IS NULL OR status = ''")
      .execute()
  },
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    users.fields.removeByName('status')
    app.save(users)
  },
)
