migrate(
  (app) => {
    const collection = new Collection({
      name: 'purchase_orders',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'material_id',
          type: 'relation',
          required: true,
          collectionId: app.findCollectionByNameOrId('clinical_inventory').id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'quantity',
          type: 'number',
          required: true,
          min: 0,
        },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['draft', 'ordered', 'received', 'cancelled'],
          maxSelect: 1,
        },
        {
          name: 'supplier',
          type: 'text',
        },
        {
          name: 'expected_delivery',
          type: 'date',
        },
        {
          name: 'created',
          type: 'autodate',
          onCreate: true,
          onUpdate: false,
        },
        {
          name: 'updated',
          type: 'autodate',
          onCreate: true,
          onUpdate: true,
        },
      ],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('purchase_orders')
    app.delete(collection)
  },
)
