migrate(
  (app) => {
    const clinicSettingsId = app.findCollectionByNameOrId('clinic_settings').id

    const collection = new Collection({
      name: 'user_clinic_access',
      type: 'base',
      listRule: "@request.auth.role = 'admin' || user_id = @request.auth.id",
      viewRule: "@request.auth.role = 'admin' || user_id = @request.auth.id",
      createRule: "@request.auth.role = 'admin'",
      updateRule: "@request.auth.role = 'admin'",
      deleteRule: "@request.auth.role = 'admin'",
      fields: [
        {
          name: 'user_id',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'clinic_id',
          type: 'relation',
          required: true,
          collectionId: clinicSettingsId,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(collection)

    const users = app.findRecordsByFilter('_pb_users_auth_', "clinic_id != ''", '', 1000, 0)
    for (const user of users) {
      const access = new Record(collection)
      access.set('user_id', user.id)
      access.set('clinic_id', user.getString('clinic_id'))
      app.save(access)
    }
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('user_clinic_access')
    app.delete(collection)
  },
)
