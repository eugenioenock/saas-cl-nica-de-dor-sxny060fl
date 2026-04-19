onRecordAfterCreateSuccess((e) => {
  if (e.record.getString('status') !== 'pending') return e.next()

  try {
    const integrations = $app.findRecordsByFilter(
      'integrations',
      "type = 'webhook' && is_active = true",
      '',
      100,
      0,
    )

    if (integrations.length === 0) return e.next()

    const userName = e.record.getString('name') || e.record.getString('email')
    let clinicName = 'N/A'
    const clinicId = e.record.getString('clinic_id')

    if (clinicId) {
      try {
        const clinic = $app.findRecordById('clinic_settings', clinicId)
        clinicName = clinic.getString('name')
      } catch (_) {}
    }

    const payload = {
      event: 'access_request',
      message: `Novo pedido de acesso de ${userName} para a clínica ${clinicName}`,
      user: userName,
      clinic: clinicName,
      user_id: e.record.id,
    }

    for (let i = 0; i < integrations.length; i++) {
      const config = integrations[i].get('config')
      if (!config || !config.url) continue

      $http.send({
        url: config.url,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: config.secret ? 'Bearer ' + config.secret : '',
        },
        body: JSON.stringify(payload),
        timeout: 10,
      })
    }
  } catch (err) {
    console.log('notify_access_request error', err)
  }

  return e.next()
}, 'users')
