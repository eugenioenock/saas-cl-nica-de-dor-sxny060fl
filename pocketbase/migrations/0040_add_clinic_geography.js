migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('clinic_settings')

    if (!col.fields.getByName('region')) {
      col.fields.add(new TextField({ name: 'region' }))
    }

    if (!col.fields.getByName('state')) {
      col.fields.add(new TextField({ name: 'state' }))
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('clinic_settings')

    if (col.fields.getByName('region')) {
      col.fields.removeByName('region')
    }

    if (col.fields.getByName('state')) {
      col.fields.removeByName('state')
    }

    app.save(col)
  },
)
