migrate(
  (app) => {
    const collection = new Collection({
      name: 'professional_goals',
      type: 'base',
      listRule:
        "@request.auth.role = 'admin' || @request.auth.role = 'manager' || professional_id = @request.auth.id",
      viewRule:
        "@request.auth.role = 'admin' || @request.auth.role = 'manager' || professional_id = @request.auth.id",
      createRule: "@request.auth.role = 'admin' || @request.auth.role = 'manager'",
      updateRule: "@request.auth.role = 'admin' || @request.auth.role = 'manager'",
      deleteRule: "@request.auth.role = 'admin' || @request.auth.role = 'manager'",
      fields: [
        {
          name: 'professional_id',
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
          collectionId: app.findCollectionByNameOrId('clinic_settings').id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'month', type: 'text', required: true },
        { name: 'base_goal', type: 'number', required: true },
        { name: 'commission_tiers', type: 'json', required: false },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['active', 'completed'],
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_prof_goals_prof_month ON professional_goals (professional_id, month)',
      ],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('professional_goals')
    app.delete(collection)
  },
)
