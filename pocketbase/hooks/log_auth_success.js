onRecordAuthRequest((e) => {
  const record = e.record
  if (record) {
    try {
      const actionLogs = $app.findCollectionByNameOrId('action_logs')
      const log = new Record(actionLogs)

      log.set('user_id', record.id)
      log.set('action', 'user_login')
      log.set('collection_name', 'users')
      log.set('record_id', record.id)

      const clinicId = record.getString('clinic_id')
      if (clinicId) {
        log.set('clinic_id', clinicId)
      }

      let ip = ''
      if (e.request) {
        ip = e.request.remoteAddr
      }

      log.set('details', { ip: ip, method: 'auth_with_password' })

      $app.saveNoValidate(log)
    } catch (err) {
      console.log('Error logging auth: ' + err)
    }
  }
  e.next()
}, 'users')
