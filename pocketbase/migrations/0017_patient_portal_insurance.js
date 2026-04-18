migrate(
  (app) => {
    const insurancePlans = new Collection({
      name: 'insurance_plans',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.role = 'admin'",
      updateRule: "@request.auth.role = 'admin'",
      deleteRule: "@request.auth.role = 'admin'",
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'active', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(insurancePlans)

    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    users.fields.add(
      new SelectField({
        name: 'role',
        values: ['admin', 'professional', 'patient'],
        maxSelect: 1,
      }),
    )
    users.fields.add(
      new RelationField({
        name: 'patient_id',
        collectionId: app.findCollectionByNameOrId('patients').id,
        maxSelect: 1,
      }),
    )
    app.save(users)

    const patients = app.findCollectionByNameOrId('patients')
    patients.fields.add(
      new RelationField({
        name: 'insurance_plan_id',
        collectionId: insurancePlans.id,
        maxSelect: 1,
      }),
    )
    patients.fields.add(
      new TextField({
        name: 'policy_number',
      }),
    )
    app.save(patients)

    const finance = app.findCollectionByNameOrId('consultations_finance')
    finance.fields.add(
      new SelectField({
        name: 'billing_type',
        values: ['private', 'insurance'],
        maxSelect: 1,
      }),
    )
    finance.fields.add(
      new RelationField({
        name: 'insurance_plan_id',
        collectionId: insurancePlans.id,
        maxSelect: 1,
      }),
    )
    const statusField = finance.fields.getByName('status')
    statusField.values = ['pending', 'paid', 'cancelled', 'glosa', 'transfer_pending']

    finance.listRule =
      "@request.auth.id != '' && (@request.auth.role != 'patient' || patient_id = @request.auth.patient_id)"
    finance.viewRule =
      "@request.auth.id != '' && (@request.auth.role != 'patient' || patient_id = @request.auth.patient_id)"
    app.save(finance)

    const appointments = app.findCollectionByNameOrId('appointments')
    appointments.listRule =
      "@request.auth.id != '' && (@request.auth.role != 'patient' || patient_id = @request.auth.patient_id)"
    appointments.viewRule =
      "@request.auth.id != '' && (@request.auth.role != 'patient' || patient_id = @request.auth.patient_id)"
    app.save(appointments)

    const feedbacks = new Collection({
      name: 'feedbacks',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule:
        "@request.auth.id != '' && (@request.auth.role != 'patient' || appointment_id.patient_id = @request.auth.patient_id)",
      updateRule:
        "@request.auth.id != '' && (@request.auth.role != 'patient' || appointment_id.patient_id = @request.auth.patient_id)",
      deleteRule: "@request.auth.role = 'admin'",
      fields: [
        {
          name: 'appointment_id',
          type: 'relation',
          required: true,
          collectionId: appointments.id,
          maxSelect: 1,
        },
        { name: 'rating', type: 'number', required: true, min: 1, max: 5 },
        { name: 'comment', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(feedbacks)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('feedbacks'))
    } catch (_) {}

    try {
      const finance = app.findCollectionByNameOrId('consultations_finance')
      finance.fields.removeByName('billing_type')
      finance.fields.removeByName('insurance_plan_id')
      const statusField = finance.fields.getByName('status')
      statusField.values = ['pending', 'paid', 'cancelled']
      finance.listRule = "@request.auth.id != ''"
      finance.viewRule = "@request.auth.id != ''"
      app.save(finance)
    } catch (_) {}

    try {
      const appointments = app.findCollectionByNameOrId('appointments')
      appointments.listRule = "@request.auth.id != ''"
      appointments.viewRule = "@request.auth.id != ''"
      app.save(appointments)
    } catch (_) {}

    try {
      const patients = app.findCollectionByNameOrId('patients')
      patients.fields.removeByName('insurance_plan_id')
      patients.fields.removeByName('policy_number')
      app.save(patients)
    } catch (_) {}

    try {
      const users = app.findCollectionByNameOrId('_pb_users_auth_')
      users.fields.removeByName('role')
      users.fields.removeByName('patient_id')
      app.save(users)
    } catch (_) {}

    try {
      app.delete(app.findCollectionByNameOrId('insurance_plans'))
    } catch (_) {}
  },
)
