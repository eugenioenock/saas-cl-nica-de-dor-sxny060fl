migrate(
  (app) => {
    try {
      const record = app.findFirstRecordByData('clinic_templates', 'type', 'anatomical_model')

      const currentData = record.get('config_data') || { points: [] }
      const currentPoints = currentData.points || []

      const frontPoints = [
        { id: 'cabeca_frente', name: 'Cabeça', view: 'front', x: 50, y: 10, w: 12, h: 10 },
        { id: 'peito_esq', name: 'Peitoral Esquerdo', view: 'front', x: 66, y: 25, w: 12, h: 12 },
        { id: 'peito_dir', name: 'Peitoral Direito', view: 'front', x: 34, y: 25, w: 12, h: 12 },
        { id: 'abdomen', name: 'Abdômen', view: 'front', x: 50, y: 40, w: 16, h: 14 },
        {
          id: 'ombro_frente_esq',
          name: 'Ombro Esquerdo (Frente)',
          view: 'front',
          x: 78,
          y: 22,
          w: 10,
          h: 10,
        },
        {
          id: 'ombro_frente_dir',
          name: 'Ombro Direito (Frente)',
          view: 'front',
          x: 22,
          y: 22,
          w: 10,
          h: 10,
        },
        {
          id: 'braco_frente_esq',
          name: 'Braço Esquerdo (Frente)',
          view: 'front',
          x: 82,
          y: 35,
          w: 8,
          h: 12,
        },
        {
          id: 'braco_frente_dir',
          name: 'Braço Direito (Frente)',
          view: 'front',
          x: 18,
          y: 35,
          w: 8,
          h: 12,
        },
        { id: 'coxa_esq', name: 'Coxa Esquerda', view: 'front', x: 62, y: 55, w: 12, h: 16 },
        { id: 'coxa_dir', name: 'Coxa Direita', view: 'front', x: 38, y: 55, w: 12, h: 16 },
        {
          id: 'joelho_frente_esq',
          name: 'Joelho Esquerdo (Frente)',
          view: 'front',
          x: 61,
          y: 68,
          w: 10,
          h: 10,
        },
        {
          id: 'joelho_frente_dir',
          name: 'Joelho Direito (Frente)',
          view: 'front',
          x: 39,
          y: 68,
          w: 10,
          h: 10,
        },
        { id: 'canela_esq', name: 'Canela Esquerda', view: 'front', x: 61, y: 82, w: 10, h: 14 },
        { id: 'canela_dir', name: 'Canela Direita', view: 'front', x: 39, y: 82, w: 10, h: 14 },
        {
          id: 'pe_frente_esq',
          name: 'Pé Esquerdo (Frente)',
          view: 'front',
          x: 63,
          y: 94,
          w: 10,
          h: 8,
        },
        {
          id: 'pe_frente_dir',
          name: 'Pé Direito (Frente)',
          view: 'front',
          x: 37,
          y: 94,
          w: 10,
          h: 8,
        },
      ]

      const mergedPoints = [...currentPoints]
      frontPoints.forEach((fp) => {
        if (!mergedPoints.find((p) => p.id === fp.id)) {
          mergedPoints.push(fp)
        }
      })

      currentData.points = mergedPoints
      record.set('config_data', currentData)
      app.save(record)
    } catch (_) {}
  },
  (app) => {
    try {
      const record = app.findFirstRecordByData('clinic_templates', 'type', 'anatomical_model')
      const currentData = record.get('config_data') || { points: [] }
      const currentPoints = currentData.points || []

      currentData.points = currentPoints.filter((p) => p.view !== 'front')
      record.set('config_data', currentData)
      app.save(record)
    } catch (_) {}
  },
)
