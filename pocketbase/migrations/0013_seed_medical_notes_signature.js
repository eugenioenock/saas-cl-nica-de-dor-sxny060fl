migrate(
  (app) => {
    try {
      const notes = app.findRecordsByFilter('medical_notes', '1=1', '-created', 1, 0)
      if (notes && notes.length > 0) {
        const note = notes[0]
        note.set('is_signed', true)
        note.set('signed_at', new Date().toISOString().replace('T', ' '))
        note.set('signature_hash', 'simulated_hash_' + Math.random().toString(36).substring(2))
        app.saveNoValidate(note)
      }
    } catch (_) {}
  },
  (app) => {},
)
