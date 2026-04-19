onRecordAfterUpdateSuccess((e) => {
  const oldRole = e.record.original().getString('role')
  const newRole = e.record.getString('role')

  if (oldRole && oldRole !== newRole) {
    const email = e.record.getString('email')
    const adminId = e.requestInfo().auth?.id || 'system'

    console.log(`[AUDIT] User ${email} role changed from ${oldRole} to ${newRole} by ${adminId}`)

    const apiKey = $secrets.get('RESEND_API_KEY')
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
          to: 'admin@spinecareos.com', // Default system admin
          subject: 'Security Alert: User Role Changed',
          html: `<p>Security Notification</p><p>User <b>${email}</b> had their system role changed from <b>${oldRole}</b> to <b>${newRole}</b>.</p><p>Action performed by: ${adminId}</p>`,
        }),
      })
    }
  }
  e.next()
}, 'users')
