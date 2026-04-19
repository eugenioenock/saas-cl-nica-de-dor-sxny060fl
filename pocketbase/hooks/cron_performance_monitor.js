cronAdd('performance_monitor', '0 0 1 * *', () => {
  const clinics = $app.findRecordsByFilter('clinic_settings', '1=1', '', 1000, 0)
  const now = new Date()

  const currentPeriodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const currentPeriodEnd = now
  const prevPeriodStart = new Date(currentPeriodStart.getTime() - 30 * 24 * 60 * 60 * 1000)

  const fmt = (d) => d.toISOString().replace('T', ' ').substring(0, 19) + 'Z'

  for (const clinic of clinics) {
    const threshold = clinic.get('revenue_alert_threshold') || 20

    const currentFinances = $app.findRecordsByFilter(
      'consultations_finance',
      "clinic_id = {:clinicId} && status = 'paid' && created >= {:start} && created <= {:end}",
      '',
      10000,
      0,
      { clinicId: clinic.id, start: fmt(currentPeriodStart), end: fmt(currentPeriodEnd) },
    )
    let currentRev = 0
    for (const f of currentFinances) currentRev += f.get('amount')

    const prevFinances = $app.findRecordsByFilter(
      'consultations_finance',
      "clinic_id = {:clinicId} && status = 'paid' && created >= {:start} && created < {:end}",
      '',
      10000,
      0,
      { clinicId: clinic.id, start: fmt(prevPeriodStart), end: fmt(currentPeriodStart) },
    )
    let prevRev = 0
    for (const f of prevFinances) prevRev += f.get('amount')

    if (prevRev > 0) {
      const drop = ((prevRev - currentRev) / prevRev) * 100
      if (drop > threshold) {
        const logsCol = $app.findCollectionByNameOrId('action_logs')
        const log = new Record(logsCol)
        log.set('action', 'performance_alert')
        log.set('collection_name', 'clinic_settings')
        log.set('record_id', clinic.id)
        log.set('clinic_id', clinic.id)
        log.set('details', {
          message: `A receita apresentou queda de ${drop.toFixed(2)}%`,
          previous_revenue: prevRev,
          current_revenue: currentRev,
          threshold: threshold,
        })
        $app.save(log)

        const integrations = $app.findRecordsByFilter(
          'integrations',
          "clinic_id = {:clinicId} && is_active = true && type = 'webhook'",
          '',
          10,
          0,
          { clinicId: clinic.id },
        )
        for (const integ of integrations) {
          const config = integ.get('config') || {}
          if (config.url) {
            try {
              $http.send({
                url: config.url,
                method: 'POST',
                body: JSON.stringify({
                  event: 'performance_alert',
                  clinic_id: clinic.id,
                  clinic_name: clinic.get('name'),
                  drop_percentage: drop,
                  previous_revenue: prevRev,
                  current_revenue: currentRev,
                }),
                headers: { 'Content-Type': 'application/json' },
                timeout: 15,
              })
            } catch (e) {
              console.log('Webhook alert failed for clinic ' + clinic.id, e)
            }
          }
        }
      }
    }
  }
})
