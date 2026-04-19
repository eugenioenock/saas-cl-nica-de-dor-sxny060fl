migrate(
  (app) => {
    const collection = new Collection({
      name: 'action_logs',
      type: 'base',
      listRule: "@request.auth.role = 'admin' || @request.auth.role = 'manager'",
      viewRule: "@request.auth.role = 'admin' || @request.auth.role = 'manager'",
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        {
          name: 'user_id',
          type: 'relation',
          required: false,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'action', type: 'text', required: true },
        { name: 'collection_name', type: 'text', required: true },
        { name: 'record_id', type: 'text', required: true },
        { name: 'details', type: 'json' },
        {
          name: 'clinic_id',
          type: 'relation',
          required: false,
          collectionId: app.findCollectionByNameOrId('clinic_settings').id,
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('action_logs')
    app.delete(collection)
  },
)
