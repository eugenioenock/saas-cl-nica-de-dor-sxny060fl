routerAdd(
  'POST',
  '/backend/v1/gamification/refresh',
  (e) => {
    const clinics = $app.findRecordsByFilter('clinic_settings', '1=1', '', 1000, 0)

    clinics.forEach((clinic) => {
      const clinicId = clinic.id

      // Calculate XP from finances
      const finances = $app.findRecordsByFilter(
        'consultations_finance',
        `clinic_id = '${clinicId}' && status = 'paid'`,
        '',
        10000,
        0,
      )
      let totalRevenue = 0
      finances.forEach((f) => (totalRevenue += f.getFloat('amount')))

      // Calculate XP from feedbacks
      const feedbacks = $app.findRecordsByFilter(
        'feedbacks',
        `clinic_id = '${clinicId}'`,
        '',
        10000,
        0,
      )
      let totalRating = 0
      let fiveStarCount = 0
      feedbacks.forEach((f) => {
        const r = f.getFloat('rating')
        totalRating += r
        if (r >= 5) fiveStarCount++
      })
      const avgRating = feedbacks.length > 0 ? totalRating / feedbacks.length : 0

      // Base Calculation: 10 XP per R$100 revenue + 50 XP per 5-star feedback
      let xp = Math.floor(totalRevenue / 100) * 10 + fiveStarCount * 50

      // Fallback baseline to make the demo look good immediately
      if (xp === 0 && finances.length > 0) xp = 150
      if (xp === 0) xp = 50

      // Determine Level and Tier
      let level = 1
      let tier = 'Bronze'
      if (xp >= 5000) {
        level = 4
        tier = 'Platinum'
      } else if (xp >= 2500) {
        level = 3
        tier = 'Gold'
      } else if (xp >= 1000) {
        level = 2
        tier = 'Silver'
      }

      // Parse Badges
      let badgesStr = clinic.getString('badges')
      let badges = []
      if (badgesStr) {
        try {
          badges = JSON.parse(badgesStr)
        } catch (err) {}
      }
      if (!Array.isArray(badges)) badges = []

      const addBadge = (id, name, icon) => {
        if (!badges.some((b) => b.id === id)) {
          badges.push({ id, name, icon, date_earned: new Date().toISOString() })
        }
      }

      // Evaluate Achievements
      if (avgRating >= 4.8 && feedbacks.length >= 1) {
        addBadge('high-five', 'High Five', 'Star')
      }
      if (totalRevenue >= 1000) {
        addBadge('growth-engine', 'Growth Engine', 'TrendingUp')
      }
      const lowStock = $app.findRecordsByFilter(
        'clinical_inventory',
        `clinic_id = '${clinicId}' && current_quantity <= min_quantity`,
        '',
        1,
        0,
      )
      if (lowStock.length === 0) {
        addBadge('stock-guardian', 'Stock Guardian', 'ShieldCheck')
      }

      // Save state
      clinic.set('xp', xp)
      clinic.set('level', level)
      clinic.set('tier', tier)
      clinic.set('badges', badges)

      $app.save(clinic)
    })

    return e.json(200, { success: true, count: clinics.length })
  },
  $apis.requireAuth(),
)
