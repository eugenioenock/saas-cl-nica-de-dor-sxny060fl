migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('inventory_usage')
    col.fields.add(
      new RelationField({
        name: 'medical_note_id',
        type: 'relation',
        collectionId: app.findCollectionByNameOrId('medical_notes').id,
        cascadeDelete: false,
        maxSelect: 1,
        required: false,
      }),
    )
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('inventory_usage')
    col.fields.removeByName('medical_note_id')
    app.save(col)
  },
)
