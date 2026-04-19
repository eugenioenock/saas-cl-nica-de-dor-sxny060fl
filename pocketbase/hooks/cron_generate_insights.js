cronAdd('generate_performance_insights', '0 * * * *', () => {
  const now = new Date()
  const startOfMonth =
    new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .replace('T', ' ')
      .substring(0, 19) + 'Z'
  const monthStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0')
  const todayStr = now.toISOString().split('T')[0] + ' 00:00:00Z'

  // 1. Fetch Clinic Averages
  const clinicStats = $app
    .db()
    .newQuery(`
    SELECT clinic_id, SUM(amount) as total, COUNT(id) as count
    FROM consultations_finance
    WHERE status = 'paid' AND created >= {:start}
    GROUP BY clinic_id
  `)
    .bind({ start: startOfMonth })
    .all()

  const clinicAverages = {}
  for (let i = 0; i < clinicStats.length; i++) {
    const cId = clinicStats[i].clinic_id
    const count = clinicStats[i].count
    const total = clinicStats[i].total
    if (cId && count > 0) {
      clinicAverages[cId] = total / count
    }
  }

  // 2. Evaluate Professional Revenue vs Goals and Procedure Optimization
  const profStats = $app
    .db()
    .newQuery(`
    SELECT mn.professionalId as prof_id, mn.clinic_id, SUM(cf.amount) as total, COUNT(cf.id) as count
    FROM consultations_finance cf
    JOIN medical_notes mn ON cf.medical_note_id = mn.id
    WHERE cf.status = 'paid' AND cf.created >= {:start} AND mn.professionalId != ''
    GROUP BY mn.professionalId, mn.clinic_id
  `)
    .bind({ start: startOfMonth })
    .all()

  for (let i = 0; i < profStats.length; i++) {
    const profId = profStats[i].prof_id
    const clinicId = profStats[i].clinic_id
    const totalRev = profStats[i].total || 0
    const count = profStats[i].count || 0
    const avgTicket = count > 0 ? totalRev / count : 0
    const clinicAvg = clinicAverages[clinicId] || 0

    // Rule A: Procedure Optimization (ticket below clinic average)
    if (avgTicket > 0 && clinicAvg > 0 && avgTicket < clinicAvg * 0.85) {
      const existing = $app
        .db()
        .newQuery(`
        SELECT id FROM notifications
        WHERE user_id = {:userId} AND type = 'performance_insight' AND created >= {:today} AND title = 'Oportunidade de Otimização'
      `)
        .bind({ userId: profId, today: todayStr })
        .all()

      if (existing.length === 0) {
        const notif = new Record($app.findCollectionByNameOrId('notifications'))
        notif.set('user_id', profId)
        notif.set('clinic_id', clinicId)
        notif.set('type', 'performance_insight')
        notif.set('title', 'Oportunidade de Otimização')
        notif.set(
          'message',
          'Dica: Seu ticket médio (R$ ' +
            avgTicket.toFixed(2) +
            ') está abaixo da média da clínica. Focar em avaliações mais completas e novos procedimentos pode aumentar seu bônus em até 15%.',
        )
        notif.set('is_read', false)
        $app.save(notif)
      }
    }

    // Rule B: Tier Bridge (close to bonus goal)
    try {
      const goals = $app.findRecordsByFilter(
        'professional_goals',
        'professional_id = {:profId} && month = {:month}',
        '-created',
        1,
        0,
        { profId: profId, month: monthStr },
      )
      if (goals.length > 0) {
        const tiers = goals[0].get('commission_tiers')
        if (tiers && Array.isArray(tiers)) {
          tiers.sort((a, b) => a.threshold - b.threshold)
          for (let j = 0; j < tiers.length; j++) {
            const tier = tiers[j]
            if (totalRev < tier.threshold && totalRev >= tier.threshold * 0.85) {
              const diff = tier.threshold - totalRev
              const existing = $app
                .db()
                .newQuery(`
                SELECT id FROM notifications
                WHERE user_id = {:userId} AND type = 'performance_insight' AND created >= {:today} AND title = 'Meta Próxima!'
              `)
                .bind({ userId: profId, today: todayStr })
                .all()

              if (existing.length === 0) {
                const notif = new Record($app.findCollectionByNameOrId('notifications'))
                notif.set('user_id', profId)
                notif.set('clinic_id', clinicId)
                notif.set('type', 'performance_insight')
                notif.set('title', 'Meta Próxima!')
                notif.set(
                  'message',
                  'Você está a apenas R$ ' +
                    diff.toFixed(2) +
                    ' de atingir a próxima faixa de bônus! Considere abrir horários extras nesta semana para garantir a conquista.',
                )
                notif.set('is_read', false)
                $app.save(notif)
              }
              break // Alert only for the next immediate tier
            }
          }
        }
      }
    } catch (e) {
      console.log('Error evaluating goals for ' + profId, e)
    }
  }

  // 3. Evaluate Cancellation Rates
  const cancelStats = $app
    .db()
    .newQuery(`
    SELECT professional_id, clinic_id, COUNT(id) as total_appts,
           SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_appts
    FROM appointments
    WHERE created >= {:start} AND professional_id != ''
    GROUP BY professional_id, clinic_id
  `)
    .bind({ start: startOfMonth })
    .all()

  for (let i = 0; i < cancelStats.length; i++) {
    const profId = cancelStats[i].professional_id
    const clinicId = cancelStats[i].clinic_id
    const total = cancelStats[i].total_appts || 0
    const cancelled = cancelStats[i].cancelled_appts || 0

    if (total > 5 && cancelled / total > 0.2) {
      const existing = $app
        .db()
        .newQuery(`
        SELECT id FROM notifications
        WHERE user_id = {:userId} AND type = 'performance_insight' AND created >= {:today} AND title = 'Atenção aos Cancelamentos'
      `)
        .bind({ userId: profId, today: todayStr })
        .all()

      if (existing.length === 0) {
        const notif = new Record($app.findCollectionByNameOrId('notifications'))
        notif.set('user_id', profId)
        notif.set('clinic_id', clinicId)
        notif.set('type', 'performance_insight')
        notif.set('title', 'Atenção aos Cancelamentos')
        const rate = ((cancelled / total) * 100).toFixed(1)
        notif.set(
          'message',
          'Sua taxa de cancelamento este mês está alta (' +
            rate +
            '%). Recomendamos orientar a recepção a reforçar as confirmações de consulta 24h antes.',
        )
        notif.set('is_read', false)
        $app.save(notif)
      }
    }
  }
})
