migrate(
  (app) => {
    const collection = new Collection({
      name: 'inventory_counts',
      type: 'base',
      listRule:
        "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'professional')",
      viewRule:
        "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'professional')",
      createRule:
        "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'professional')",
      updateRule:
        "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'professional')",
      deleteRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
      fields: [
        {
          name: 'material_id',
          type: 'relation',
          required: true,
          collectionId: app.findCollectionByNameOrId('clinical_inventory').id,
          maxSelect: 1,
        },
        { name: 'expected_quantity', type: 'number', required: true },
        { name: 'actual_quantity', type: 'number', required: true },
        { name: 'discrepancy', type: 'number', required: true },
        {
          name: 'professional_id',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('inventory_counts')
    app.delete(collection)
  },
)
