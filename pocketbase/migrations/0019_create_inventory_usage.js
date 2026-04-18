migrate(
  (app) => {
    const collection = new Collection({
      name: 'inventory_usage',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'batch_id',
          type: 'relation',
          required: true,
          collectionId: app.findCollectionByNameOrId('inventory_batches').id,
          maxSelect: 1,
        },
        {
          name: 'patient_id',
          type: 'relation',
          required: true,
          collectionId: app.findCollectionByNameOrId('patients').id,
          maxSelect: 1,
        },
        {
          name: 'appointment_id',
          type: 'relation',
          collectionId: app.findCollectionByNameOrId('appointments').id,
          maxSelect: 1,
        },
        { name: 'quantity_used', type: 'number', required: true },
        {
          name: 'professional_id',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
        },
        { name: 'usage_date', type: 'date', required: true },
        { name: 'notes', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_inv_usage_batch ON inventory_usage (batch_id)',
        'CREATE INDEX idx_inv_usage_patient ON inventory_usage (patient_id)',
      ],
    })
    app.save(collection)
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('inventory_usage'))
  },
)
