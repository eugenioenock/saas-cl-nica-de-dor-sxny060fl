migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('clinical_inventory')
    if (!col.fields.getByName('barcode')) {
      col.fields.add(new TextField({ name: 'barcode' }))
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('clinical_inventory')
    col.fields.removeByName('barcode')
    app.save(col)
  },
)
