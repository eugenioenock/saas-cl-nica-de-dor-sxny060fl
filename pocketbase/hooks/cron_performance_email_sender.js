cronAdd('cron_performance_email_sender', '0 9 * * *', () => {
  const clinics = $app.findRecordsByFilter('clinic_settings', '1=1', '', 0, 0)
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)

  const d30 = thirtyDaysAgo.toISOString().replace('T', ' ').substring(0, 19)
  const d60 = sixtyDaysAgo.toISOString().replace('T', ' ').substring(0, 19)

  for (const clinic of clinics) {
    const threshold = clinic.getFloat('revenue_alert_threshold') || 20
    const cId = clinic.id

    const last30 = $app.findRecordsByFilter(
      'consultations_finance',
      `clinic_id = "${cId}" && status = 'paid' && created >= "${d30}"`,
      '',
      0,
      0,
    )
    const prev30 = $app.findRecordsByFilter(
      'consultations_finance',
      `clinic_id = "${cId}" && status = 'paid' && created >= "${d60}" && created < "${d30}"`,
      '',
      0,
      0,
    )

    let revLast = 0
    for (const r of last30) revLast += r.getFloat('amount')

    let revPrev = 0
    for (const r of prev30) revPrev += r.getFloat('amount')

    if (revPrev > 0) {
      const drop = ((revPrev - revLast) / revPrev) * 100
      if (drop >= threshold) {
        try {
          const integration = $app.findFirstRecordByFilter(
            'integrations',
            "type = 'email_provider' && is_active = true",
            '',
          )
          console.log(
            `[ALERT] Clinic ${clinic.getString('name')} dropped ${drop.toFixed(1)}%. Triggering email.`,
          )
          const configStr = integration.getString('config')
          const config = configStr ? JSON.parse(configStr) : {}

          if (config.webhook_url) {
            $http.send({
              url: config.webhook_url,
              method: 'POST',
              body: JSON.stringify({
                clinic: clinic.getString('name'),
                drop_percentage: drop.toFixed(1),
                period: 'Últimos 30 dias vs 30 dias anteriores',
                link: 'https://saas-clinica-de-dor.goskip.app/portal',
              }),
              headers: { 'Content-Type': 'application/json' },
            })
          }
        } catch (e) {
          console.log(
            `Performance drop detected (${drop.toFixed(1)}%) for ${clinic.getString('name')} but no active email_provider integration found to send alert.`,
          )
        }
      }
    }
  }
})
