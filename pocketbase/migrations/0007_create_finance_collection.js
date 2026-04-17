migrate(
  (app) => {
    const collection = new Collection({
      name: 'consultations_finance',
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
          maxSelect: 1,
        },
        {
          name: 'medical_note_id',
          type: 'relation',
          required: false,
          collectionId: app.findCollectionByNameOrId('medical_notes').id,
          maxSelect: 1,
        },
        { name: 'amount', type: 'number', required: true },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['pending', 'paid', 'cancelled'],
          maxSelect: 1,
        },
        { name: 'due_date', type: 'date' },
        {
          name: 'payment_method',
          type: 'select',
          values: ['cash', 'card', 'transfer', 'pix'],
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('consultations_finance')
    app.delete(collection)
  },
)
