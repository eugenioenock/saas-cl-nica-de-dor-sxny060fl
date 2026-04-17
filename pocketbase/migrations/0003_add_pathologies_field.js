migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('pain_points')
    if (!col.fields.getByName('pathologies')) {
      col.fields.add(
        new JSONField({
          name: 'pathologies',
          maxSize: 2000000,
        }),
      )
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('pain_points')
    const field = col.fields.getByName('pathologies')
    if (field) {
      col.fields.removeByName('pathologies')
      app.save(col)
    }
  },
)
