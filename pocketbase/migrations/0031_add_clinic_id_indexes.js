migrate(
  (app) => {
    const patients = app.findCollectionByNameOrId('patients')
    patients.addIndex('idx_patients_clinic_id', false, 'clinic_id', '')
    app.save(patients)

    const appointments = app.findCollectionByNameOrId('appointments')
    appointments.addIndex('idx_appointments_clinic_id', false, 'clinic_id', '')
    app.save(appointments)

    const medical_notes = app.findCollectionByNameOrId('medical_notes')
    medical_notes.addIndex('idx_medical_notes_clinic_id', false, 'clinic_id', '')
    app.save(medical_notes)

    const finance = app.findCollectionByNameOrId('consultations_finance')
    finance.addIndex('idx_finance_clinic_id', false, 'clinic_id', '')
    app.save(finance)
  },
  (app) => {
    const patients = app.findCollectionByNameOrId('patients')
    patients.removeIndex('idx_patients_clinic_id')
    app.save(patients)

    const appointments = app.findCollectionByNameOrId('appointments')
    appointments.removeIndex('idx_appointments_clinic_id')
    app.save(appointments)

    const medical_notes = app.findCollectionByNameOrId('medical_notes')
    medical_notes.removeIndex('idx_medical_notes_clinic_id')
    app.save(medical_notes)

    const finance = app.findCollectionByNameOrId('consultations_finance')
    finance.removeIndex('idx_finance_clinic_id')
    app.save(finance)
  },
)
