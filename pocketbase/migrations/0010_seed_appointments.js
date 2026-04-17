migrate(
  (app) => {
    let patientId
    try {
      const patients = app.findRecordsByFilter('patients', '', '-created', 1, 0)
      if (patients.length > 0) {
        patientId = patients[0].id
      } else {
        const pCol = app.findCollectionByNameOrId('patients')
        const pRec = new Record(pCol)
        pRec.set('name', 'Paciente Demonstração Agenda')
        app.save(pRec)
        patientId = pRec.id
      }
    } catch (_) {
      return // Fallback to avoid breaking if patients table is inaccessible
    }

    const appointmentsCol = app.findCollectionByNameOrId('appointments')
    if (app.countRecords('appointments') > 0) return

    const now = new Date()
    const nextWeek = new Date(now)
    nextWeek.setDate(now.getDate() + 7)

    const data = [
      { title: 'Avaliação Inicial', status: 'scheduled', dOffset: 1, hStart: 9, hEnd: 10 },
      { title: 'Sessão de Fisioterapia', status: 'confirmed', dOffset: 2, hStart: 14, hEnd: 15 },
      { title: 'Acompanhamento', status: 'completed', dOffset: 3, hStart: 11, hEnd: 11.5 },
    ]

    data.forEach((d) => {
      const a = new Record(appointmentsCol)
      a.set('patient_id', patientId)
      a.set('title', d.title)
      a.set('status', d.status)

      const dStart = new Date(nextWeek)
      dStart.setDate(dStart.getDate() + d.dOffset)
      dStart.setHours(d.hStart, 0, 0, 0)

      const dEnd = new Date(nextWeek)
      dEnd.setDate(dEnd.getDate() + d.dOffset)
      const isHalfHour = d.hEnd % 1 !== 0
      dEnd.setHours(Math.floor(d.hEnd), isHalfHour ? 30 : 0, 0, 0)

      a.set('start_time', dStart.toISOString())
      a.set('end_time', dEnd.toISOString())
      a.set('notes', 'Gerado via seed de teste.')

      app.save(a)
    })
  },
  (app) => {
    // Simplistic down migration: delete the seeded ones (if strictly needed)
    app
      .db()
      .newQuery(
        "DELETE FROM appointments WHERE title IN ('Avaliação Inicial', 'Sessão de Fisioterapia', 'Acompanhamento')",
      )
      .execute()
  },
)
