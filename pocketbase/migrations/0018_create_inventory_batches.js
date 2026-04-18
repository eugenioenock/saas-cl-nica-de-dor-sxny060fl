migrate(
  (app) => {
    const collection = new Collection({
      name: 'inventory_batches',
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
          maxSelect: 1,
        },
        { name: 'batch_number', type: 'text', required: true },
        { name: 'expiry_date', type: 'date', required: true },
        { name: 'initial_quantity', type: 'number', required: true },
        { name: 'current_quantity', type: 'number', required: true },
        { name: 'supplier', type: 'text' },
        { name: 'purchase_date', type: 'date' },
        { name: 'cost_price', type: 'number' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_inv_batch_material ON inventory_batches (material_id)'],
    })
    app.save(collection)
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('inventory_batches'))
  },
)
