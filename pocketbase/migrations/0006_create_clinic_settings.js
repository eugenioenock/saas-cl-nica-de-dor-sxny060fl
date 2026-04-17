migrate(
  (app) => {
    const collection = new Collection({
      name: 'clinic_settings',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'name', type: 'text', required: true },
        {
          name: 'logo',
          type: 'file',
          maxSelect: 1,
          maxSize: 5242880,
          mimeTypes: ['image/png', 'image/jpeg', 'image/svg+xml'],
        },
        { name: 'address', type: 'text' },
        { name: 'phone', type: 'text' },
        { name: 'email', type: 'email' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(collection)

    const record = new Record(collection)
    record.set('name', 'Minha Clínica de Dor')
    app.save(record)
  },
  (app) => {
    try {
      const collection = app.findCollectionByNameOrId('clinic_settings')
      app.delete(collection)
    } catch (_) {}
  },
)
