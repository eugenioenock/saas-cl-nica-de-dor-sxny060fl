migrate(
  (app) => {
    const clinicCol = app.findCollectionByNameOrId('clinic_settings')

    const templates = new Collection({
      name: 'clinic_templates',
      type: 'base',
      listRule: "@request.auth.role = 'admin'",
      viewRule: "@request.auth.role = 'admin'",
      createRule: "@request.auth.role = 'admin'",
      updateRule: "@request.auth.role = 'admin'",
      deleteRule: "@request.auth.role = 'admin'",
      fields: [
        { name: 'name', type: 'text', required: true },
        {
          name: 'type',
          type: 'select',
          required: true,
          values: ['consultation_pattern', 'inventory_menu', 'general_settings'],
          maxSelect: 1,
        },
        { name: 'config_data', type: 'json', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(templates)

    const transfers = new Collection({
      name: 'unit_transfers',
      type: 'base',
      listRule:
        "@request.auth.role = 'admin' || source_clinic_id = @request.auth.clinic_id || target_clinic_id = @request.auth.clinic_id",
      viewRule:
        "@request.auth.role = 'admin' || source_clinic_id = @request.auth.clinic_id || target_clinic_id = @request.auth.clinic_id",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.role = 'admin'",
      deleteRule: "@request.auth.role = 'admin'",
      fields: [
        {
          name: 'type',
          type: 'select',
          required: true,
          values: ['inventory', 'patient_record'],
          maxSelect: 1,
        },
        {
          name: 'source_clinic_id',
          type: 'relation',
          required: true,
          collectionId: clinicCol.id,
          maxSelect: 1,
        },
        {
          name: 'target_clinic_id',
          type: 'relation',
          required: true,
          collectionId: clinicCol.id,
          maxSelect: 1,
        },
        { name: 'item_id', type: 'text', required: true },
        { name: 'quantity', type: 'number' },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['pending', 'approved', 'rejected', 'completed'],
          maxSelect: 1,
        },
        {
          name: 'requested_by',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
        },
        { name: 'approved_by', type: 'relation', collectionId: '_pb_users_auth_', maxSelect: 1 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(transfers)

    const finance = app.findCollectionByNameOrId('consultations_finance')
    finance.listRule =
      "@request.auth.id != '' && (@request.auth.role = 'admin' || clinic_id = @request.auth.clinic_id) && (@request.auth.role != 'patient' || patient_id = @request.auth.patient_id)"
    finance.viewRule =
      "@request.auth.id != '' && (@request.auth.role = 'admin' || clinic_id = @request.auth.clinic_id) && (@request.auth.role != 'patient' || patient_id = @request.auth.patient_id)"
    app.save(finance)

    const appointments = app.findCollectionByNameOrId('appointments')
    appointments.listRule =
      "@request.auth.id != '' && (@request.auth.role = 'admin' || clinic_id = @request.auth.clinic_id) && (@request.auth.role != 'patient' || patient_id = @request.auth.patient_id)"
    appointments.viewRule =
      "@request.auth.id != '' && (@request.auth.role = 'admin' || clinic_id = @request.auth.clinic_id) && (@request.auth.role != 'patient' || patient_id = @request.auth.patient_id)"
    app.save(appointments)
  },
  (app) => {
    const templates = app.findCollectionByNameOrId('clinic_templates')
    app.delete(templates)

    const transfers = app.findCollectionByNameOrId('unit_transfers')
    app.delete(transfers)

    const finance = app.findCollectionByNameOrId('consultations_finance')
    finance.listRule =
      "@request.auth.id != '' && clinic_id = @request.auth.clinic_id && (@request.auth.role != 'patient' || patient_id = @request.auth.patient_id)"
    finance.viewRule =
      "@request.auth.id != '' && clinic_id = @request.auth.clinic_id && (@request.auth.role != 'patient' || patient_id = @request.auth.patient_id)"
    app.save(finance)

    const appointments = app.findCollectionByNameOrId('appointments')
    appointments.listRule =
      "@request.auth.id != '' && clinic_id = @request.auth.clinic_id && (@request.auth.role != 'patient' || patient_id = @request.auth.patient_id)"
    appointments.viewRule =
      "@request.auth.id != '' && clinic_id = @request.auth.clinic_id && (@request.auth.role != 'patient' || patient_id = @request.auth.patient_id)"
    app.save(appointments)
  },
)
