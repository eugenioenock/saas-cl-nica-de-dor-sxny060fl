onRecordUpdateRequest((e) => {
  if (e.record.getString('type') !== 'anatomical_model') {
    return e.next()
  }

  const authRecord = e.auth
  const userName = authRecord
    ? authRecord.getString('name') || authRecord.getString('email')
    : 'Sistema'

  const users = $app.findRecordsByFilter('users', "role = 'admin' || role = 'manager'", '', 0, 0)

  for (const u of users) {
    let clinicId = u.getString('clinic_id')

    // Resolve fallback clinic ID for cross-system admins if needed
    if (!clinicId) {
      try {
        const clinics = $app.findRecordsByFilter('clinic_settings', '', '', 1, 0)
        if (clinics.length > 0) clinicId = clinics[0].id
      } catch (_) {}
    }

    if (!clinicId) continue

    try {
      const notifCol = $app.findCollectionByNameOrId('notifications')
      const notif = new Record(notifCol)
      notif.set('user_id', u.id)
      notif.set('clinic_id', clinicId)
      notif.set('title', 'Master Model Updated')
      notif.set(
        'message',
        `The master anatomical model has been updated by ${userName}. New patient records will now use this updated configuration.`,
      )
      notif.set('type', 'system')
      notif.set('is_read', false)
      $app.saveNoValidate(notif)
    } catch (err) {
      console.log('Failed to create master model update notification:', err)
    }
  }

  return e.next()
}, 'clinic_templates')
