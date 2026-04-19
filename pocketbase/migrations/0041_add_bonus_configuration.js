migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('clinic_settings')
    collection.fields.add(
      new JSONField({
        name: 'bonus_config',
        maxSize: 2000000,
      }),
    )
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('clinic_settings')
    collection.fields.removeByName('bonus_config')
    app.save(collection)
  },
)
