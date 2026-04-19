migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('purchase_orders')

    if (!col.fields.getByName('supplier_id')) {
      col.fields.add(
        new RelationField({
          name: 'supplier_id',
          collectionId: app.findCollectionByNameOrId('suppliers').id,
          maxSelect: 1,
        }),
      )
    }

    const statusField = col.fields.getByName('status')
    if (statusField && !statusField.values.includes('quote_requested')) {
      statusField.values.push('quote_requested')
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('purchase_orders')
    if (col.fields.getByName('supplier_id')) {
      col.fields.removeByName('supplier_id')
    }
    const statusField = col.fields.getByName('status')
    if (statusField) {
      statusField.values = statusField.values.filter((v) => v !== 'quote_requested')
    }
    app.save(col)
  },
)
