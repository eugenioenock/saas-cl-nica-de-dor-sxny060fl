migrate(
  (app) => {
    const finance = app.findCollectionByNameOrId('consultations_finance')
    let patients = []
    try {
      patients = app.findRecordsByFilter('patients', '', '', 3, 0)
    } catch (e) {
      return
    }

    if (patients.length === 0) return

    try {
      const r1 = new Record(finance)
      r1.set('patient_id', patients[0].id)
      r1.set('amount', 350.0)
      r1.set('status', 'paid')
      r1.set('payment_method', 'pix')
      r1.set('due_date', new Date().toISOString().replace('T', ' '))
      app.save(r1)

      if (patients.length > 1) {
        const r2 = new Record(finance)
        r2.set('patient_id', patients[1].id)
        r2.set('amount', 400.0)
        r2.set('status', 'pending')
        r2.set('due_date', new Date(Date.now() + 86400000 * 7).toISOString().replace('T', ' '))
        app.save(r2)
      }

      if (patients.length > 2) {
        const r3 = new Record(finance)
        r3.set('patient_id', patients[2].id)
        r3.set('amount', 300.0)
        r3.set('status', 'cancelled')
        app.save(r3)
      }
    } catch (e) {
      console.log(e)
    }
  },
  (app) => {
    app.db().newQuery('DELETE FROM consultations_finance').execute()
  },
)
