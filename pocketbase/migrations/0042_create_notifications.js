migrate(
  (app) => {
    const collection = new Collection({
      name: 'notifications',
      type: 'base',
      listRule: 'user_id = @request.auth.id',
      viewRule: 'user_id = @request.auth.id',
      createRule: null,
      updateRule: 'user_id = @request.auth.id',
      deleteRule: null,
      fields: [
        {
          name: 'user_id',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'title', type: 'text', required: true },
        { name: 'message', type: 'text', required: true },
        {
          name: 'type',
          type: 'select',
          required: true,
          values: ['milestone', 'bonus_tier', 'system'],
          maxSelect: 1,
        },
        { name: 'is_read', type: 'bool' },
        {
          name: 'clinic_id',
          type: 'relation',
          required: true,
          collectionId: app.findCollectionByNameOrId('clinic_settings').id,
          maxSelect: 1,
        },
        { name: 'threshold_id', type: 'text' },
        { name: 'month', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_notifications_user_read ON notifications (user_id, is_read)'],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('notifications')
    app.delete(collection)
  },
)
