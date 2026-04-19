migrate(
  (app) => {
    const announcements = new Collection({
      name: 'announcements',
      type: 'base',
      listRule:
        "@request.auth.id != '' && (clinic_id = '' || clinic_id = @request.auth.clinic_id || @request.auth.role = 'admin')",
      viewRule:
        "@request.auth.id != '' && (clinic_id = '' || clinic_id = @request.auth.clinic_id || @request.auth.role = 'admin')",
      createRule: "@request.auth.role = 'admin'",
      updateRule: "@request.auth.role = 'admin'",
      deleteRule: "@request.auth.role = 'admin'",
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'content', type: 'text', required: true },
        {
          name: 'priority',
          type: 'select',
          required: true,
          values: ['low', 'medium', 'high', 'urgent'],
          maxSelect: 1,
        },
        {
          name: 'clinic_id',
          type: 'relation',
          required: false,
          collectionId: app.findCollectionByNameOrId('clinic_settings').id,
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(announcements)

    const clinicSettings = app.findCollectionByNameOrId('clinic_settings')
    clinicSettings.fields.add(
      new NumberField({ name: 'revenue_alert_threshold', min: 0, max: 100 }),
    )
    app.save(clinicSettings)
  },
  (app) => {
    const announcements = app.findCollectionByNameOrId('announcements')
    app.delete(announcements)

    const clinicSettings = app.findCollectionByNameOrId('clinic_settings')
    clinicSettings.fields.removeByName('revenue_alert_threshold')
    app.save(clinicSettings)
  },
)
