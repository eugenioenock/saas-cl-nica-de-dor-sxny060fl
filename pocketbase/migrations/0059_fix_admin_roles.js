migrate(
  (app) => {
    const emails = ['eugenioenock@gmail.com', 'clinicadedor@skip.app']

    for (const email of emails) {
      try {
        const record = app.findAuthRecordByEmail('users', email)
        let changed = false

        if (record.getString('role') !== 'admin') {
          record.set('role', 'admin')
          changed = true
        }

        if (record.getString('status') !== 'active') {
          record.set('status', 'active')
          changed = true
        }

        if (changed) {
          app.save(record)
        }
      } catch (_) {
        // Ignore if user does not exist
      }
    }
  },
  (app) => {
    // No revert needed for data corrections
  },
)
