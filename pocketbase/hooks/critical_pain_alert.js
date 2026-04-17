onRecordAfterCreateSuccess((e) => {
  if (e.record.getInt('intensity') >= 8) {
    try {
      const settings = $app.findFirstRecordByFilter('clinic_settings', '1=1')
      const toEmail = settings.getString('email')
      if (!toEmail) return e.next()

      const patient = $app.findRecordById('patients', e.record.getString('patient_id'))
      const patientName = patient.getString('name')
      const intensity = e.record.getInt('intensity')

      const message = new MailerMessage({
        from: { address: 'noreply@saas-clinica.com', name: 'Sistema Clínica' },
        to: [{ address: toEmail }],
        subject: `Alerta Crítico: Paciente ${patientName}`,
        html: `<p>O paciente <strong>${patientName}</strong> acabou de registrar uma dor com intensidade <strong>${intensity}</strong>. Por favor, verifique o prontuário imediatamente.</p>`,
      })

      $app.newMailClient().send(message)
      console.log(`Alerta de dor crítica enviado para ${toEmail}`)
    } catch (err) {
      console.log('Erro ao enviar alerta de dor crítica: ', err)
    }
  }
  return e.next()
}, 'pain_points')
