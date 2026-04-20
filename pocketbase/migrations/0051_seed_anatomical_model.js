migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('clinic_templates')
    try {
      app.findFirstRecordByData('clinic_templates', 'type', 'anatomical_model')
      return
    } catch (_) {}

    const record = new Record(col)
    record.set('name', 'Padrão Anatômico Global')
    record.set('type', 'anatomical_model')
    record.set('config_data', {
      points: [
        { id: 'cervical', name: 'Coluna Cervical', view: 'back', x: 50, y: 15, w: 10, h: 8 },
        { id: 'toracica', name: 'Coluna Torácica', view: 'back', x: 50, y: 28, w: 12, h: 14 },
        { id: 'lombar', name: 'Coluna Lombar', view: 'back', x: 50, y: 44, w: 14, h: 12 },
        { id: 'ombro_esq', name: 'Ombro Esquerdo', view: 'back', x: 34, y: 20, w: 12, h: 10 },
        { id: 'ombro_dir', name: 'Ombro Direito', view: 'back', x: 66, y: 20, w: 12, h: 10 },
        { id: 'cotovelo_esq', name: 'Cotovelo Esquerdo', view: 'back', x: 23, y: 38, w: 10, h: 10 },
        { id: 'cotovelo_dir', name: 'Cotovelo Direito', view: 'back', x: 77, y: 38, w: 10, h: 10 },
        { id: 'punho_esq', name: 'Punho Esquerdo', view: 'back', x: 18, y: 50, w: 8, h: 10 },
        { id: 'punho_dir', name: 'Punho Direito', view: 'back', x: 82, y: 50, w: 8, h: 10 },
        { id: 'quadril_esq', name: 'Quadril Esquerdo', view: 'back', x: 38, y: 54, w: 14, h: 14 },
        { id: 'quadril_dir', name: 'Quadril Direito', view: 'back', x: 62, y: 54, w: 14, h: 14 },
        { id: 'joelho_esq', name: 'Joelho Esquerdo', view: 'back', x: 39, y: 68, w: 12, h: 12 },
        { id: 'joelho_dir', name: 'Joelho Direito', view: 'back', x: 61, y: 68, w: 12, h: 12 },
        { id: 'pe_esq', name: 'Pé Esquerdo', view: 'back', x: 41, y: 94, w: 10, h: 8 },
        { id: 'pe_dir', name: 'Pé Direito', view: 'back', x: 59, y: 94, w: 10, h: 8 },
      ],
    })
    app.save(record)
  },
  (app) => {
    try {
      const record = app.findFirstRecordByData('clinic_templates', 'type', 'anatomical_model')
      app.delete(record)
    } catch (_) {}
  },
)
