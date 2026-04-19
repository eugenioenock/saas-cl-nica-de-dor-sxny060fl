migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('notifications')

    // Add the new type option
    col.fields.add(
      new SelectField({
        name: 'type',
        required: true,
        values: ['milestone', 'bonus_tier', 'system', 'performance_insight'],
        maxSelect: 1,
      }),
    )

    // Update access rules so managers can see insights for all professionals in their clinic
    col.listRule =
      "user_id = @request.auth.id || (@request.auth.role = 'manager' && clinic_id = @request.auth.clinic_id) || @request.auth.role = 'admin'"
    col.viewRule =
      "user_id = @request.auth.id || (@request.auth.role = 'manager' && clinic_id = @request.auth.clinic_id) || @request.auth.role = 'admin'"

    app.save(col)

    // Seed initial data for demonstration purposes
    try {
      // Find an admin user to receive the seed notifications
      const admin = app.findAuthRecordByEmail('_pb_users_auth_', 'eugenioenock@gmail.com')
      const clinicId = admin.get('clinic_id')

      if (clinicId) {
        const insights = [
          {
            title: 'Meta Próxima!',
            msg: 'Você está a apenas R$ 1.250,00 de atingir a próxima faixa de bônus! Considere abrir horários extras nesta sexta-feira.',
          },
          {
            title: 'Oportunidade de Otimização',
            msg: 'Dica: Seu ticket médio está 15% abaixo da média da clínica. Focar em avaliações premium pode aumentar seu bônus.',
          },
          {
            title: 'Atenção aos Cancelamentos',
            msg: 'Sua taxa de cancelamento esta semana chegou a 22%. Recomendamos enviar lembretes 24h antes por WhatsApp.',
          },
        ]

        for (let i = 0; i < insights.length; i++) {
          const ins = insights[i]
          const r = new Record(col)
          r.set('user_id', admin.id)
          r.set('clinic_id', clinicId)
          r.set('type', 'performance_insight')
          r.set('title', ins.title)
          r.set('message', ins.msg)
          r.set('is_read', false)
          app.save(r)
        }
      }
    } catch (_) {
      // Admin user not found or error parsing, ignore seed
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('notifications')
    col.fields.add(
      new SelectField({
        name: 'type',
        required: true,
        values: ['milestone', 'bonus_tier', 'system'],
        maxSelect: 1,
      }),
    )
    col.listRule = 'user_id = @request.auth.id'
    col.viewRule = 'user_id = @request.auth.id'
    app.save(col)
  },
)
