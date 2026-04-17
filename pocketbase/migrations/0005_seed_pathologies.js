migrate(
  (app) => {
    const catalog = app.findCollectionByNameOrId('pathologies_catalog')
    const items = [
      'Hérnia de Disco',
      'Escoliose',
      'Fibromialgia',
      'Tendinite',
      'Artrite',
      'Bursite',
      'Cervicalgia',
      'Lombalgia',
    ]

    for (const item of items) {
      try {
        app.findFirstRecordByData('pathologies_catalog', 'name', item)
      } catch (_) {
        const record = new Record(catalog)
        record.set('name', item)
        app.save(record)
      }
    }
  },
  (app) => {
    const items = [
      'Hérnia de Disco',
      'Escoliose',
      'Fibromialgia',
      'Tendinite',
      'Artrite',
      'Bursite',
      'Cervicalgia',
      'Lombalgia',
    ]
    for (const item of items) {
      try {
        const record = app.findFirstRecordByData('pathologies_catalog', 'name', item)
        app.delete(record)
      } catch (_) {}
    }
  },
)
