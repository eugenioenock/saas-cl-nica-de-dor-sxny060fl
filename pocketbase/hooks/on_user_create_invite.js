onRecordAfterCreateSuccess((e) => {
  const email = e.record.getString('email')
  if (!email) return e.next()

  const baseUrl = $secrets.get('PB_INSTANCE_URL') || 'http://127.0.0.1:8090'
  const url = `${baseUrl}/api/collections/users/request-password-reset`

  try {
    $http.send({
      url: url,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email }),
      timeout: 10,
    })
  } catch (err) {
    console.log('Failed to send password reset email via hook', err)
  }

  return e.next()
}, 'users')
