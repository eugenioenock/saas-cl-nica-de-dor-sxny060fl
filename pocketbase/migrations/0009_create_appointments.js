migrate(
  (app) => {
    const collection = new Collection({
      name: 'appointments',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'patient_id',
          type: 'relation',
          required: true,
          collectionId: app.findCollectionByNameOrId('patients').id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'start_time', type: 'date', required: true },
        { name: 'end_time', type: 'date', required: true },
        { name: 'title', type: 'text', required: true },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['scheduled', 'confirmed', 'completed', 'cancelled'],
        },
        { name: 'notes', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_appointments_start ON appointments (start_time)'],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('appointments')
    app.delete(collection)
  },
)
