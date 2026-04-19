migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('clinic_settings')

    if (!col.fields.getByName('xp')) {
      col.fields.add(new NumberField({ name: 'xp', min: 0 }))
    }
    if (!col.fields.getByName('level')) {
      col.fields.add(new NumberField({ name: 'level', min: 1 }))
    }
    if (!col.fields.getByName('badges')) {
      col.fields.add(new JSONField({ name: 'badges' }))
    }
    if (!col.fields.getByName('tier')) {
      col.fields.add(
        new SelectField({
          name: 'tier',
          values: ['Bronze', 'Silver', 'Gold', 'Platinum'],
          maxSelect: 1,
        }),
      )
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('clinic_settings')

    if (col.fields.getByName('xp')) col.fields.removeByName('xp')
    if (col.fields.getByName('level')) col.fields.removeByName('level')
    if (col.fields.getByName('badges')) col.fields.removeByName('badges')
    if (col.fields.getByName('tier')) col.fields.removeByName('tier')

    app.save(col)
  },
)
