migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('medical_notes')
    collection.fields.add(new BoolField({ name: 'is_signed' }))
    collection.fields.add(new DateField({ name: 'signed_at' }))
    collection.fields.add(new TextField({ name: 'signature_hash' }))
    collection.addIndex('idx_medical_notes_is_signed', false, 'is_signed', '')
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('medical_notes')
    collection.fields.removeByName('is_signed')
    collection.fields.removeByName('signed_at')
    collection.fields.removeByName('signature_hash')
    collection.removeIndex('idx_medical_notes_is_signed')
    app.save(collection)
  },
)
