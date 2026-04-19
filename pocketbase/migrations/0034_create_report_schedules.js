migrate(
  (app) => {
    const schedules = new Collection({
      name: 'report_schedules',
      type: 'base',
      listRule: "@request.auth.role = 'admin' || @request.auth.role = 'manager'",
      viewRule: "@request.auth.role = 'admin' || @request.auth.role = 'manager'",
      createRule: "@request.auth.role = 'admin' || @request.auth.role = 'manager'",
      updateRule: "@request.auth.role = 'admin' || @request.auth.role = 'manager'",
      deleteRule: "@request.auth.role = 'admin' || @request.auth.role = 'manager'",
      fields: [
        { name: 'name', type: 'text', required: true },
        {
          name: 'clinic_id',
          type: 'relation',
          required: true,
          collectionId: app.findCollectionByNameOrId('clinic_settings').id,
          maxSelect: 1,
        },
        {
          name: 'frequency',
          type: 'select',
          required: true,
          values: ['daily', 'weekly', 'monthly'],
          maxSelect: 1,
        },
        { name: 'recipients', type: 'text', required: true },
        {
          name: 'report_type',
          type: 'select',
          required: true,
          values: ['financial_summary', 'inventory_audit', 'clinical_performance'],
          maxSelect: 1,
        },
        { name: 'is_active', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(schedules)

    const logs = new Collection({
      name: 'report_logs',
      type: 'base',
      listRule: "@request.auth.role = 'admin' || @request.auth.role = 'manager'",
      viewRule: "@request.auth.role = 'admin' || @request.auth.role = 'manager'",
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        {
          name: 'schedule_id',
          type: 'relation',
          required: true,
          collectionId: schedules.id,
          maxSelect: 1,
        },
        { name: 'status', type: 'text', required: true },
        { name: 'details', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(logs)
  },
  (app) => {
    try {
      const logs = app.findCollectionByNameOrId('report_logs')
      app.delete(logs)
    } catch (_) {}
    try {
      const schedules = app.findCollectionByNameOrId('report_schedules')
      app.delete(schedules)
    } catch (_) {}
  },
)
