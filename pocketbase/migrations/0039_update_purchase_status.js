migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('purchase_orders')
    const field = col.fields.getByName('status')
    field.values = ['draft', 'pending_approval', 'approved', 'ordered', 'received', 'cancelled']
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('purchase_orders')
    const field = col.fields.getByName('status')
    field.values = ['draft', 'ordered', 'received', 'cancelled']
    app.save(col)
  },
)
