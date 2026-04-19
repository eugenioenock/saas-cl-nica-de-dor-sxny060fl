migrate(
  (app) => {
    let defaultClinic
    try {
      defaultClinic = app.findFirstRecordByFilter('clinic_settings', '')
    } catch (_) {
      const col = app.findCollectionByNameOrId('clinic_settings')
      defaultClinic = new Record(col)
      defaultClinic.set('name', 'SpineCare Central')
      app.save(defaultClinic)
    }
    const clinicId = defaultClinic.id

    const collectionsToUpdate = [
      'users',
      'patients',
      'appointments',
      'medical_notes',
      'clinical_inventory',
      'inventory_batches',
      'inventory_usage',
      'purchase_orders',
      'inventory_counts',
      'integrations',
      'consultations_finance',
      'feedbacks',
    ]

    for (const name of collectionsToUpdate) {
      const col = app.findCollectionByNameOrId(name)

      if (!col.fields.getByName('clinic_id')) {
        col.fields.add(
          new RelationField({
            name: 'clinic_id',
            collectionId: app.findCollectionByNameOrId('clinic_settings').id,
            maxSelect: 1,
            cascadeDelete: false,
          }),
        )
      }

      if (name === 'users') {
        col.listRule =
          "id = @request.auth.id || clinic_id = @request.auth.clinic_id || @request.auth.role = 'admin'"
        col.viewRule =
          "id = @request.auth.id || clinic_id = @request.auth.clinic_id || @request.auth.role = 'admin'"
      } else if (
        name === 'patients' ||
        name === 'appointments' ||
        name === 'consultations_finance' ||
        name === 'feedbacks'
      ) {
        const patientRule =
          name === 'patients'
            ? ''
            : name === 'feedbacks'
              ? " && (@request.auth.role != 'patient' || appointment_id.patient_id = @request.auth.patient_id)"
              : " && (@request.auth.role != 'patient' || patient_id = @request.auth.patient_id)"
        col.listRule = `@request.auth.id != '' && clinic_id = @request.auth.clinic_id${patientRule}`
        col.viewRule = `@request.auth.id != '' && clinic_id = @request.auth.clinic_id${patientRule}`
        col.createRule = `@request.auth.id != ''`
        col.updateRule = `@request.auth.id != '' && clinic_id = @request.auth.clinic_id${patientRule}`
        col.deleteRule =
          name === 'feedbacks'
            ? `@request.auth.role = 'admin' && clinic_id = @request.auth.clinic_id`
            : `@request.auth.id != '' && clinic_id = @request.auth.clinic_id`
      } else {
        const roleAdminRule =
          name === 'integrations' || name === 'inventory_counts'
            ? " && @request.auth.role = 'admin'"
            : ''
        const roleAdminViewRule = name === 'integrations' ? " && @request.auth.role = 'admin'" : ''
        col.listRule = `@request.auth.id != '' && clinic_id = @request.auth.clinic_id${roleAdminViewRule}`
        col.viewRule = `@request.auth.id != '' && clinic_id = @request.auth.clinic_id${roleAdminViewRule}`
        col.createRule = `@request.auth.id != ''${roleAdminViewRule}`
        col.updateRule = `@request.auth.id != '' && clinic_id = @request.auth.clinic_id${roleAdminViewRule}`
        col.deleteRule = `@request.auth.id != '' && clinic_id = @request.auth.clinic_id${roleAdminRule}`
      }

      app.save(col)

      const records = app.findRecordsByFilter(
        name,
        "clinic_id = '' || clinic_id = null",
        '',
        10000,
        0,
      )
      for (const record of records) {
        record.set('clinic_id', clinicId)
        app.saveNoValidate(record)
      }
    }
  },
  (app) => {
    // down logic is not required
  },
)
