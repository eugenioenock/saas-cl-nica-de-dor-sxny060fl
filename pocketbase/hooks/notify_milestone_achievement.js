cronAdd('eval_bonus_milestones', '0 * * * *', () => {
  const now = new Date()
  const monthStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0')
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .replace('T', ' ')
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
    .toISOString()
    .replace('T', ' ')

  const clinics = $app.findRecordsByFilter('clinic_settings', '1=1', '', 100, 0)

  clinics.forEach((clinic) => {
    try {
      const configStr = clinic.getString('bonus_config')
      if (!configStr) return
      const config = JSON.parse(configStr)
      const thresholds = config.performance_thresholds || []
      if (thresholds.length === 0) return

      const profs = $app.findRecordsByFilter(
        'users',
        `role='professional' && clinic_id='${clinic.id}'`,
        '',
        1000,
        0,
      )
      if (profs.length === 0) return

      const appts = $app.findRecordsByFilter(
        'appointments',
        `clinic_id='${clinic.id}' && start_time>='${startOfMonth}' && start_time<='${endOfMonth}'`,
        '',
        10000,
        0,
      )
      const fins = $app.findRecordsByFilter(
        'consultations_finance',
        `clinic_id='${clinic.id}' && created>='${startOfMonth}' && created<='${endOfMonth}' && status!='cancelled'`,
        '',
        10000,
        0,
      )

      const profStats = {}
      profs.forEach((p) => (profStats[p.id] = { rev: 0, vol: 0, total: 0 }))

      appts.forEach((a) => {
        const pid = a.getString('professional_id')
        if (profStats[pid]) {
          profStats[pid].total++
          if (a.getString('status') === 'completed') {
            profStats[pid].vol++
          }
        }
      })

      fins.forEach((f) => {
        const patId = f.getString('patient_id')
        let profId = null
        // Best effort matching without notes relation for simplicity
        for (let i = appts.length - 1; i >= 0; i--) {
          if (appts[i].getString('patient_id') === patId) {
            profId = appts[i].getString('professional_id')
            break
          }
        }
        if (profId && profStats[profId]) {
          profStats[profId].rev += f.getFloat('amount')
        }
      })

      let maxRev = 1,
        maxVol = 1
      Object.values(profStats).forEach((s) => {
        if (s.rev > maxRev) maxRev = s.rev
        if (s.vol > maxVol) maxVol = s.vol
      })

      Object.keys(profStats).forEach((profId) => {
        const s = profStats[profId]
        const eff = s.total > 0 ? (s.vol / s.total) * 100 : 0
        const revScore = (s.rev / maxRev) * 40
        const volScore = (s.vol / maxVol) * 30
        const effScore = (eff / 100) * 30
        const score = revScore + volScore + effScore

        let maxMult = 1
        let metThreshold = null
        thresholds.forEach((t) => {
          if (score >= t.min_score && t.multiplier >= maxMult) {
            maxMult = t.multiplier
            metThreshold = t
          }
        })

        if (metThreshold) {
          try {
            $app.findFirstRecordByFilter(
              'notifications',
              `user_id='${profId}' && month='${monthStr}' && threshold_id='${metThreshold.multiplier}'`,
            )
          } catch (e) {
            const notifCol = $app.findCollectionByNameOrId('notifications')
            const record = new Record(notifCol)
            record.set('user_id', profId)
            record.set('clinic_id', clinic.id)
            record.set('title', 'Novo Marco Atingido \uD83C\uDF89')
            record.set(
              'message',
              `Parabéns! Você atingiu o score de performance ${score.toFixed(1)} e desbloqueou o multiplicador de ${metThreshold.multiplier}x neste mês.`,
            )
            record.set('type', 'bonus_tier')
            record.set('is_read', false)
            record.set('month', monthStr)
            record.set('threshold_id', String(metThreshold.multiplier))
            $app.save(record)
            console.log('Milestone alert created for professional: ' + profId)
          }
        }
      })
    } catch (ex) {
      console.log('Error evaluating milestones for clinic ' + clinic.id, ex)
    }
  })
})
