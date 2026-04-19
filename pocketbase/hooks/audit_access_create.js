onRecordAfterCreateSuccess((e) => {
  const userId = e.record.getString('user_id')
  const clinicId = e.record.getString('clinic_id')

  try {
    const user = $app.findRecordById('users', userId)
    const clinic = $app.findRecordById('clinic_settings', clinicId)

    const userEmail = user.getString('email')
    const clinicName = clinic.getString('name')

    console.log(`[AUDIT] Access granted: User ${userEmail} to Clinic ${clinicName}`)

    const apiKey = $secrets.get('RESEND_API_KEY')
    const toEmail = clinic.getString('email') || 'admin@spinecareos.com'

    if (apiKey) {
      $http.send({
        url: 'https://api.resend.com/emails',
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'audit@spinecareos.com',
          to: toEmail,
          subject: `Security Alert: New Access Granted - ${clinicName}`,
          html: `<p>Security Notification</p><p>User <b>${userEmail}</b> was granted access to the clinic <b>${clinicName}</b>.</p>`,
        }),
      })
    }
  } catch (err) {
    console.log('Audit hook create error:', err)
  }
  e.next()
}, 'user_clinic_access')
