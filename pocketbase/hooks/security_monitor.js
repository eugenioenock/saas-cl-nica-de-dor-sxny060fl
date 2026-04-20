routerAdd('POST', '/backend/v1/auth/failed', (e) => {
  const body = e.requestInfo().body || {}
  const email = (body.email || '').toLowerCase().trim()
  if (!email) return e.badRequestError('Missing email')

  const ip = e.request.remoteAddr

  let userId = ''
  let clinicId = ''
  try {
    const user = $app.findAuthRecordByEmail('users', email)
    userId = user.id
    clinicId = user.getString('clinic_id')
  } catch (_) {
    // User not found, but we still log the attempt
  }

  const logs = $app.findCollectionByNameOrId('action_logs')
  const logRecord = new Record(logs)
  if (userId) logRecord.set('user_id', userId)
  if (clinicId) logRecord.set('clinic_id', clinicId)
  logRecord.set('action', 'login_failed')
  logRecord.set('collection_name', 'users')
  logRecord.set('record_id', userId || 'unknown')
  logRecord.set('details', { email: email, ip: ip })
  $app.save(logRecord)

  const fifteenMinsAgo = new Date(Date.now() - 15 * 60000).toISOString().replace('T', ' ')
  const filter = `action = 'login_failed' && created >= '${fifteenMinsAgo}' && details ~ '"email":"${email}"'`

  const attempts = $app.findRecordsByFilter('action_logs', filter, '-created', 10, 0)

  if (attempts.length >= 5) {
    const notifications = $app.findCollectionByNameOrId('notifications')
    let shouldNotify = true

    try {
      const recentNotifFilter = `type = 'system' && message ~ '${email}' && created >= '${fifteenMinsAgo}'`
      const existingNotif = $app.findFirstRecordByFilter('notifications', recentNotifFilter)
      if (existingNotif) shouldNotify = false
    } catch (_) {}

    if (shouldNotify) {
      try {
        const adminsFilter = clinicId
          ? `(role = 'admin') || (role = 'manager' && clinic_id = '${clinicId}')`
          : `role = 'admin'`
        const admins = $app.findRecordsByFilter('users', adminsFilter, '', 100, 0)

        for (const admin of admins) {
          const nr = new Record(notifications)
          nr.set('user_id', admin.id)
          nr.set('title', 'Alerta de Segurança')
          nr.set(
            'message',
            `Múltiplas tentativas de login falhas detectadas para o email: ${email}`,
          )
          nr.set('type', 'system')
          nr.set('is_read', false)

          const adminClinic = admin.getString('clinic_id')
          if (adminClinic) {
            nr.set('clinic_id', adminClinic)
          } else if (clinicId) {
            nr.set('clinic_id', clinicId)
          }

          if (nr.getString('clinic_id')) {
            $app.saveNoValidate(nr)
          }
        }
      } catch (err) {
        console.log('Error creating security notification', err)
      }
    }
  }

  return e.json(200, { success: true })
})
