migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('appointments')
    col.fields.add(
      new RelationField({
        name: 'professional_id',
        collectionId: '_pb_users_auth_',
        cascadeDelete: false,
        maxSelect: 1,
        minSelect: 1,
        required: true,
      }),
    )
    app.save(col)

    // Set a default user for existing appointments to avoid validation errors on future updates
    try {
      const users = app.findRecordsByFilter('_pb_users_auth_', '1=1', '', 1, 0)
      if (users.length > 0) {
        const appts = app.findRecordsByFilter('appointments', "professional_id = ''", '', 1000, 0)
        for (const record of appts) {
          record.set('professional_id', users[0].id)
          app.saveNoValidate(record)
        }
      }
    } catch (e) {
      // Ignore errors if no users or appointments exist
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('appointments')
    col.fields.removeByName('professional_id')
    app.save(col)
  },
)
