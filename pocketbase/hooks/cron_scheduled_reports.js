cronAdd('send_scheduled_reports', '0 6 * * *', () => {
  const date = new Date()
  const dayOfWeek = date.getDay()
  const dayOfMonth = date.getDate()

  try {
    const schedules = $app.findRecordsByFilter('report_schedules', 'is_active = true', '', 1000, 0)

    schedules.forEach((sched) => {
      const freq = sched.getString('frequency')
      let shouldRun = false

      if (freq === 'daily') shouldRun = true
      if (freq === 'weekly' && dayOfWeek === 1) shouldRun = true // Mondays
      if (freq === 'monthly' && dayOfMonth === 1) shouldRun = true // 1st day

      if (shouldRun) {
        console.log('Processando Relatório Automático:', sched.getString('name'))
        const details =
          'Disparo via cron (' +
          freq +
          ') para: ' +
          sched.getString('recipients') +
          ' - Tipo: ' +
          sched.getString('report_type')

        try {
          const logCol = $app.findCollectionByNameOrId('report_logs')
          const log = new Record(logCol)
          log.set('schedule_id', sched.id)
          log.set('status', 'success')
          log.set('details', details)
          $app.save(log)
        } catch (err) {
          console.log('Erro ao salvar log de auditoria de relatório', err)
        }
      }
    })
  } catch (e) {
    console.log('Nenhum relatório agendado ou erro no cron', e)
  }
})
