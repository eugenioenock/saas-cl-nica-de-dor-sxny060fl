migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('integrations')
    try {
      app.findFirstRecordByData('integrations', 'name', 'Email Alert Template')
    } catch (_) {
      const record = new Record(col)
      record.set('name', 'Email Alert Template')
      record.set('type', 'email_provider')
      record.set('is_active', false)
      record.set('config', {
        smtp_host: 'smtp.example.com',
        smtp_user: 'alert@example.com',
        smtp_pass: 'secret_value',
        template:
          'Alerta de Estoque: {{material_name}} (Lote: {{batch_number}}) está com quantidade baixa. Atual: {{current_qty}}, Mínimo: {{min_qty}}.',
      })
      app.save(record)
    }
  },
  (app) => {
    try {
      const record = app.findFirstRecordByData('integrations', 'name', 'Email Alert Template')
      app.delete(record)
    } catch (_) {}
  },
)
