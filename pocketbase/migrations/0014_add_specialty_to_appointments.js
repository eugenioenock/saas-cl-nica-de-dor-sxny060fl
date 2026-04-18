migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('appointments')
    col.fields.add(new TextField({ name: 'specialty' }))
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('appointments')
    col.fields.removeByName('specialty')
    app.save(col)
  },
)
