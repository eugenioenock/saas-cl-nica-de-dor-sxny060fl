migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('action_logs')
    col.addIndex('idx_action_logs_created_clinic', false, 'created, clinic_id', '')
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('action_logs')
    col.removeIndex('idx_action_logs_created_clinic')
    app.save(col)
  },
)
