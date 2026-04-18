migrate(
  (app) => {
    const collection = new Collection({
      name: 'clinical_inventory',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'current_quantity', type: 'number', required: true },
        { name: 'min_quantity', type: 'number', required: true },
        {
          name: 'unit',
          type: 'select',
          required: true,
          values: ['un', 'ml', 'cx', 'pct'],
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('clinical_inventory')
    app.delete(collection)
  },
)
