migrate(
  (app) => {
    try {
      const record = app.findAuthRecordByEmail('users', 'eugenioenock@gmail.com')
      record.set('role', 'admin')
      record.set('status', 'active')
      app.save(record)
    } catch (_) {
      // Record might not exist, ignore
    }
  },
  (app) => {
    // Revert not required as this ensures core system functionality
  },
)
