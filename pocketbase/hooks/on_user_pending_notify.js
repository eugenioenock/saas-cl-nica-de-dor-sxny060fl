onRecordAfterCreateSuccess((e) => {
  const status = e.record.getString('status')
  if (status !== 'pending') return e.next()

  console.log('Atenção: Novo usuário pendente registrado - ' + e.record.getString('email'))

  try {
    const admins = $app.findRecordsByFilter('_pb_users_auth_', "role = 'admin'", '', 50, 0)
    admins.forEach((admin) => {
      // Mock alert system / email sending to admin
      console.log(
        '[MOCK EMAIL ALERT TO ADMIN]',
        admin.getString('email'),
        '=> Aprovação requerida para:',
        e.record.getString('email'),
      )
    })
  } catch (err) {
    console.log('Erro ao buscar admins para notificação:', err)
  }

  return e.next()
}, 'users')
