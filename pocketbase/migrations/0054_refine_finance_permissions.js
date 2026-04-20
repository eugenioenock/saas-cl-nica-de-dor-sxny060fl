migrate(
  (app) => {
    const finance = app.findCollectionByNameOrId('consultations_finance')
    finance.listRule =
      "@request.auth.id != '' && @request.auth.role != 'receptionist' && (@request.auth.role = 'admin' || clinic_id = @request.auth.clinic_id) && (@request.auth.role != 'patient' || patient_id = @request.auth.patient_id)"
    finance.viewRule =
      "@request.auth.id != '' && @request.auth.role != 'receptionist' && (@request.auth.role = 'admin' || clinic_id = @request.auth.clinic_id) && (@request.auth.role != 'patient' || patient_id = @request.auth.patient_id)"
    finance.createRule =
      "@request.auth.id != '' && @request.auth.role != 'receptionist' && @request.auth.role != 'patient'"
    finance.updateRule =
      "@request.auth.id != '' && @request.auth.role != 'receptionist' && clinic_id = @request.auth.clinic_id && (@request.auth.role != 'patient' || patient_id = @request.auth.patient_id)"
    finance.deleteRule =
      "@request.auth.id != '' && @request.auth.role != 'receptionist' && clinic_id = @request.auth.clinic_id"
    app.save(finance)

    const notes = app.findCollectionByNameOrId('medical_notes')
    notes.listRule =
      "@request.auth.id != '' && @request.auth.role != 'receptionist' && clinic_id = @request.auth.clinic_id"
    notes.viewRule =
      "@request.auth.id != '' && @request.auth.role != 'receptionist' && clinic_id = @request.auth.clinic_id"
    notes.createRule = "@request.auth.id != '' && @request.auth.role != 'receptionist'"
    notes.updateRule =
      "@request.auth.id != '' && @request.auth.role != 'receptionist' && clinic_id = @request.auth.clinic_id"
    notes.deleteRule =
      "@request.auth.id != '' && @request.auth.role != 'receptionist' && clinic_id = @request.auth.clinic_id"
    app.save(notes)
  },
  (app) => {
    const finance = app.findCollectionByNameOrId('consultations_finance')
    finance.listRule =
      "@request.auth.id != '' && (@request.auth.role = 'admin' || clinic_id = @request.auth.clinic_id) && (@request.auth.role != 'patient' || patient_id = @request.auth.patient_id)"
    finance.viewRule =
      "@request.auth.id != '' && (@request.auth.role = 'admin' || clinic_id = @request.auth.clinic_id) && (@request.auth.role != 'patient' || patient_id = @request.auth.patient_id)"
    finance.createRule = "@request.auth.id != ''"
    finance.updateRule =
      "@request.auth.id != '' && clinic_id = @request.auth.clinic_id && (@request.auth.role != 'patient' || patient_id = @request.auth.patient_id)"
    finance.deleteRule = "@request.auth.id != '' && clinic_id = @request.auth.clinic_id"
    app.save(finance)

    const notes = app.findCollectionByNameOrId('medical_notes')
    notes.listRule = "@request.auth.id != '' && clinic_id = @request.auth.clinic_id"
    notes.viewRule = "@request.auth.id != '' && clinic_id = @request.auth.clinic_id"
    notes.createRule = "@request.auth.id != ''"
    notes.updateRule = "@request.auth.id != '' && clinic_id = @request.auth.clinic_id"
    notes.deleteRule = "@request.auth.id != '' && clinic_id = @request.auth.clinic_id"
    app.save(notes)
  },
)
