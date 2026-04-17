migrate(
  (app) => {
    const patients = new Collection({
      name: 'patients',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'document', type: 'text' },
        { name: 'email', type: 'email' },
        { name: 'phone', type: 'text' },
        { name: 'dob', type: 'date' },
        {
          name: 'gender',
          type: 'select',
          values: ['Male', 'Female', 'Other', 'Masculino', 'Feminino', 'Outro', ''],
        },
        { name: 'clinicId', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(patients)

    const painPoints = new Collection({
      name: 'pain_points',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'patient_id',
          type: 'relation',
          required: true,
          collectionId: patients.id,
          maxSelect: 1,
          cascadeDelete: true,
        },
        { name: 'x', type: 'number', required: true },
        { name: 'y', type: 'number', required: true },
        { name: 'view', type: 'select', values: ['front', 'back'], required: true },
        { name: 'name', type: 'text' },
        { name: 'notes', type: 'text' },
        { name: 'intensity', type: 'number' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(painPoints)

    const medicalNotes = new Collection({
      name: 'medical_notes',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'patient_id',
          type: 'relation',
          required: true,
          collectionId: patients.id,
          maxSelect: 1,
          cascadeDelete: true,
        },
        { name: 'content', type: 'text', required: true },
        { name: 'date', type: 'date' },
        { name: 'professionalId', type: 'text' },
        { name: 'status', type: 'select', values: ['completed', 'scheduled', 'cancelled', ''] },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(medicalNotes)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('medical_notes'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('pain_points'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('patients'))
    } catch (_) {}
  },
)
