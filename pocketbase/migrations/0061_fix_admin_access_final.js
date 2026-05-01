migrate(
  (app) => {
    try {
      const user = app.findAuthRecordByEmail('users', 'eugenioenock@gmail.com')

      let clinicId = null
      try {
        const clinics = app.findRecordsByFilter('clinic_settings', '1=1', 'created', 1, 0)
        if (clinics && clinics.length > 0) {
          clinicId = clinics[0].id
        }
      } catch (_) {}

      user.set('role', 'admin')
      user.set('status', 'active')

      if (clinicId && !user.get('clinic_id')) {
        user.set('clinic_id', clinicId)
      }

      app.save(user)
    } catch (_) {
      // User not found, safe to skip
      console.log('Admin user eugenioenock@gmail.com not found. Skipping fix.')
    }
  },
  (app) => {
    // Data fix migration; no explicit revert needed
  },
)
