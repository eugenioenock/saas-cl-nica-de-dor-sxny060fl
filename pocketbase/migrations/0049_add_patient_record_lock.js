migrate(
  (app) => {
    const patients = app.findCollectionByNameOrId('patients')
    patients.fields.add(
      new RelationField({
        name: 'locked_by',
        collectionId: '_pb_users_auth_',
        maxSelect: 1,
        cascadeDelete: false,
      }),
    )
    patients.fields.add(
      new DateField({
        name: 'locked_at',
      }),
    )
    app.save(patients)

    const actionLogs = app.findCollectionByNameOrId('action_logs')
    actionLogs.listRule = "@request.auth.id != ''"
    actionLogs.viewRule = "@request.auth.id != ''"
    actionLogs.createRule = "@request.auth.id != ''"
    app.save(actionLogs)
  },
  (app) => {
    const patients = app.findCollectionByNameOrId('patients')
    patients.fields.removeByName('locked_by')
    patients.fields.removeByName('locked_at')
    app.save(patients)

    const actionLogs = app.findCollectionByNameOrId('action_logs')
    actionLogs.listRule = "@request.auth.role = 'admin' || @request.auth.role = 'manager'"
    actionLogs.viewRule = "@request.auth.role = 'admin' || @request.auth.role = 'manager'"
    actionLogs.createRule = null
    app.save(actionLogs)
  },
)
