migrate(
  (app) => {
    const collection = new Collection({
      name: 'suppliers',
      type: 'base',
      listRule: "@request.auth.id != '' && clinic_id = @request.auth.clinic_id",
      viewRule: "@request.auth.id != '' && clinic_id = @request.auth.clinic_id",
      createRule:
        "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'manager')",
      updateRule:
        "@request.auth.id != '' && clinic_id = @request.auth.clinic_id && (@request.auth.role = 'admin' || @request.auth.role = 'manager')",
      deleteRule:
        "@request.auth.id != '' && clinic_id = @request.auth.clinic_id && (@request.auth.role = 'admin' || @request.auth.role = 'manager')",
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'email', type: 'email', required: false },
        { name: 'phone', type: 'text', required: false },
        {
          name: 'materials',
          type: 'relation',
          required: false,
          collectionId: app.findCollectionByNameOrId('clinical_inventory').id,
          maxSelect: 999,
        },
        {
          name: 'clinic_id',
          type: 'relation',
          required: true,
          collectionId: app.findCollectionByNameOrId('clinic_settings').id,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(collection)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('suppliers'))
    } catch (_) {}
  },
)
