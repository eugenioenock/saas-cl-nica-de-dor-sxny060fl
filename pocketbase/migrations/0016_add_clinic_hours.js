migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('clinic_settings')
    if (!col.fields.getByName('opening_time')) {
      col.fields.add(new TextField({ name: 'opening_time' }))
    }
    if (!col.fields.getByName('closing_time')) {
      col.fields.add(new TextField({ name: 'closing_time' }))
    }
    app.save(col)

    // Seed default data
    const records = app.findRecordsByFilter('clinic_settings', '1=1', '', 1, 0)
    if (records.length > 0) {
      const record = records[0]
      if (!record.getString('opening_time')) record.set('opening_time', '08:00')
      if (!record.getString('closing_time')) record.set('closing_time', '18:00')
      app.save(record)
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('clinic_settings')
    col.fields.removeByName('opening_time')
    col.fields.removeByName('closing_time')
    app.save(col)
  },
)
