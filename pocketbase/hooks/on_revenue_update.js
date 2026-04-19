onRecordAfterUpdateSuccess((e) => {
  const record = e.record
  if (record.getString('status') !== 'paid' && record.getString('status') !== 'transfer_pending') {
    return e.next()
  }

  let professionalId = null
  const medicalNoteId = record.getString('medical_note_id')
  if (medicalNoteId) {
    try {
      const note = $app.findRecordById('medical_notes', medicalNoteId)
      professionalId = note.getString('professionalId')
    } catch (_) {}
  }

  if (!professionalId) {
    try {
      const appts = $app.findRecordsByFilter(
        'appointments',
        `patient_id = '${record.getString('patient_id')}'`,
        '-created',
        1,
        0,
      )
      if (appts.length > 0) professionalId = appts[0].getString('professional_id')
    } catch (_) {}
  }

  if (!professionalId) return e.next()

  const d = new Date(record.getString('created'))
  const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`

  try {
    const goal = $app.findFirstRecordByFilter(
      'professional_goals',
      `professional_id = '${professionalId}' && month = '${monthStr}'`,
    )
    if (!goal) return e.next()

    const startStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01 00:00:00.000Z`
    const endStr = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59)
      .toISOString()
      .replace('T', ' ')

    const allFinance = $app.findRecordsByFilter(
      'consultations_finance',
      `created >= '${startStr}' && created <= '${endStr}' && (status = 'paid' || status = 'transfer_pending') && clinic_id = '${goal.getString('clinic_id')}'`,
      '',
      1000,
      0,
    )

    let totalRevenue = 0
    for (const f of allFinance) {
      let pid = null
      const fnote = f.getString('medical_note_id')
      if (fnote) {
        try {
          const n = $app.findRecordById('medical_notes', fnote)
          pid = n.getString('professionalId')
        } catch (e) {}
      } else {
        try {
          const appts = $app.findRecordsByFilter(
            'appointments',
            `patient_id = '${f.getString('patient_id')}'`,
            '-created',
            1,
            0,
          )
          if (appts.length > 0) pid = appts[0].getString('professional_id')
        } catch (e) {}
      }
      if (pid === professionalId) {
        totalRevenue += f.getFloat('amount')
      }
    }

    const tiers = goal.get('commission_tiers') || []
    let currentTier = -1
    for (let i = 0; i < tiers.length; i++) {
      if (totalRevenue >= tiers[i].min) {
        currentTier = i
      }
    }

    if (currentTier >= 0) {
      const thresholdId = `goal_${goal.id}_tier_${currentTier}`
      try {
        $app.findFirstRecordByFilter(
          'notifications',
          `user_id = '${professionalId}' && type = 'bonus_tier' && threshold_id = '${thresholdId}'`,
        )
      } catch (_) {
        const notifCol = $app.findCollectionByNameOrId('notifications')
        const notif = new Record(notifCol)
        notif.set('user_id', professionalId)
        notif.set('title', 'Novo Nível de Comissão Alcançado!')
        notif.set(
          'message',
          `Parabéns! Você alcançou o nível ${currentTier + 1} de comissão (${tiers[currentTier].rate}%).`,
        )
        notif.set('type', 'bonus_tier')
        notif.set('clinic_id', goal.getString('clinic_id'))
        notif.set('threshold_id', thresholdId)
        notif.set('month', monthStr)
        $app.save(notif)
      }
    }
  } catch (_) {}

  return e.next()
}, 'consultations_finance')
