migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('clinic_templates')
    const typeField = col.fields.getByName('type')
    if (!typeField.values.includes('anatomical_model')) {
      typeField.values.push('anatomical_model')
      app.save(col)
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('clinic_templates')
    const typeField = col.fields.getByName('type')
    typeField.values = typeField.values.filter((v) => v !== 'anatomical_model')
    app.save(col)
  },
)
