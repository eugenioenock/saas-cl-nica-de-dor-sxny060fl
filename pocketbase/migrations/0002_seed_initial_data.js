migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    try {
      app.findAuthRecordByEmail('_pb_users_auth_', 'admin@skip.com')
    } catch (_) {
      const record = new Record(users)
      record.setEmail('admin@skip.com')
      record.setPassword('Skip@Pass')
      record.setVerified(true)
      record.set('name', 'Admin Skip')
      app.save(record)
    }

    const patientsCol = app.findCollectionByNameOrId('patients')

    const seedPatients = [
      {
        name: 'Maria Oliveira',
        document: '123.456.789-00',
        email: 'maria@example.com',
        phone: '(11) 98765-4321',
        dob: '1985-06-15 12:00:00.000Z',
        gender: 'Female',
        clinicId: 'c1',
      },
      {
        name: 'Carlos Santos',
        document: '234.567.890-11',
        email: 'carlos@example.com',
        phone: '(11) 91234-5678',
        dob: '1978-03-22 12:00:00.000Z',
        gender: 'Male',
        clinicId: 'c1',
      },
      {
        name: 'Ana Souza',
        document: '345.678.901-22',
        email: 'ana@example.com',
        phone: '(11) 99887-7665',
        dob: '1992-11-30 12:00:00.000Z',
        gender: 'Female',
        clinicId: 'c1',
      },
    ]

    const createdPatients = []
    for (const p of seedPatients) {
      try {
        const existing = app.findFirstRecordByData('patients', 'document', p.document)
        createdPatients.push(existing)
      } catch (_) {
        const rec = new Record(patientsCol)
        rec.set('name', p.name)
        rec.set('document', p.document)
        rec.set('email', p.email)
        rec.set('phone', p.phone)
        rec.set('dob', p.dob)
        rec.set('gender', p.gender)
        rec.set('clinicId', p.clinicId)
        app.save(rec)
        createdPatients.push(rec)
      }
    }

    const painPointsCol = app.findCollectionByNameOrId('pain_points')
    try {
      app.findFirstRecordByData('pain_points', 'name', 'Lombar')
    } catch (_) {
      if (createdPatients.length > 0) {
        const pp1 = new Record(painPointsCol)
        pp1.set('patient_id', createdPatients[0].id)
        pp1.set('x', 50)
        pp1.set('y', 60)
        pp1.set('view', 'back')
        pp1.set('name', 'Lombar')
        pp1.set('notes', 'Dor aguda ao deitar')
        pp1.set('intensity', 7)
        app.save(pp1)

        const pp2 = new Record(painPointsCol)
        pp2.set('patient_id', createdPatients[1].id)
        pp2.set('x', 40)
        pp2.set('y', 20)
        pp2.set('view', 'front')
        pp2.set('name', 'Ombro Direito')
        pp2.set('notes', 'Dor ao levantar o braço')
        pp2.set('intensity', 5)
        app.save(pp2)
      }
    }

    const notesCol = app.findCollectionByNameOrId('medical_notes')
    try {
      app.findFirstRecordByData('medical_notes', 'content', 'Avaliação inicial lombar')
    } catch (_) {
      if (createdPatients.length > 0) {
        const n1 = new Record(notesCol)
        n1.set('patient_id', createdPatients[0].id)
        n1.set('content', 'Avaliação inicial lombar')
        n1.set('date', '2023-10-01 10:00:00.000Z')
        n1.set('status', 'completed')
        app.save(n1)
      }
    }
  },
  (app) => {},
)
