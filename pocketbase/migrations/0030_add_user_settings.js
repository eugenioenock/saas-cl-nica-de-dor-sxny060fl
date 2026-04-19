migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    users.fields.add(new JSONField({ name: 'settings', required: false }))
    app.save(users)
  },
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    users.fields.removeByName('settings')
    app.save(users)
  },
)
