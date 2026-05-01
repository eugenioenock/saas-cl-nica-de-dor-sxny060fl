migrate(
  (app) => {
    const usersCol = app.findCollectionByNameOrId('users')
    const clinicsCol = app.findCollectionByNameOrId('clinic_settings')
    const patientsCol = app.findCollectionByNameOrId('patients')

    let clinicId = null
    try {
      const clinic = app.findFirstRecordByFilter('clinic_settings', '1=1')
      clinicId = clinic.id
    } catch (_) {
      const newClinic = new Record(clinicsCol)
      newClinic.set('name', 'SpineCare Solutions (Test)')
      app.save(newClinic)
      clinicId = newClinic.id
    }

    const seedUser = (email, role, name, cId) => {
      let userRecord = null
      try {
        userRecord = app.findAuthRecordByEmail('users', email)
      } catch (_) {
        userRecord = new Record(usersCol)
        userRecord.setEmail(email)
        userRecord.setPassword('Skip@Pass')
        userRecord.setVerified(true)
        userRecord.set('role', role)
        userRecord.set('status', 'active')
        userRecord.set('name', name)
        if (cId) {
          userRecord.set('clinic_id', cId)
        }
        app.save(userRecord)
      }

      if (cId && userRecord) {
        try {
          app.findFirstRecordByFilter(
            'user_clinic_access',
            `user_id='${userRecord.id}' && clinic_id='${cId}'`,
          )
        } catch (_) {
          try {
            const accessCol = app.findCollectionByNameOrId('user_clinic_access')
            const accessRecord = new Record(accessCol)
            accessRecord.set('user_id', userRecord.id)
            accessRecord.set('clinic_id', cId)
            app.save(accessRecord)
          } catch (e) {}
        }
      }
      return userRecord
    }

    seedUser('admin@spinecare.com', 'admin', 'Admin User', null)
    seedUser('manager@spinecare.com', 'manager', 'Manager User', clinicId)
    seedUser('professional@spinecare.com', 'professional', 'Professional User', clinicId)
    seedUser('receptionist@spinecare.com', 'receptionist', 'Receptionist User', clinicId)

    let patientRecord = null
    try {
      patientRecord = app.findFirstRecordByData('patients', 'email', 'patient@spinecare.com')
    } catch (_) {
      patientRecord = new Record(patientsCol)
      patientRecord.set('name', 'Test Patient')
      patientRecord.set('email', 'patient@spinecare.com')
      patientRecord.set('clinic_id', clinicId)
      app.save(patientRecord)
    }

    try {
      app.findAuthRecordByEmail('users', 'patient@spinecare.com')
    } catch (_) {
      const record = new Record(usersCol)
      record.setEmail('patient@spinecare.com')
      record.setPassword('Skip@Pass')
      record.setVerified(true)
      record.set('role', 'patient')
      record.set('status', 'active')
      record.set('name', 'Test Patient')
      record.set('patient_id', patientRecord.id)
      if (clinicId) {
        record.set('clinic_id', clinicId)
      }
      app.save(record)
    }
  },
  (app) => {
    const emails = [
      'admin@spinecare.com',
      'manager@spinecare.com',
      'professional@spinecare.com',
      'receptionist@spinecare.com',
      'patient@spinecare.com',
    ]
    for (const email of emails) {
      try {
        const record = app.findAuthRecordByEmail('users', email)
        app.delete(record)
      } catch (_) {}
    }

    try {
      const p = app.findFirstRecordByData('patients', 'email', 'patient@spinecare.com')
      app.delete(p)
    } catch (_) {}
  },
)
