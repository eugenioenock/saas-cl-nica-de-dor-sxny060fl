onRecordAfterCreateSuccess((e) => {
  const record = e.record
  if (record.getString('type') === 'bonus_tier' || record.getString('type') === 'milestone') {
    const userId = record.getString('user_id')
    try {
      const user = $app.findRecordById('users', userId)
      const email = user.getString('email')
      if (email) {
        const message = new MailerMessage({
          from: {
            address: $app.settings().meta.senderAddress || 'no-reply@spinecareos.com',
            name: 'SpineCare OS',
          },
          to: [{ address: email }],
          subject: record.getString('title'),
          html: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
                        <h2 style="color: #0f172a;">${record.getString('title')}</h2>
                        <p style="color: #334155; font-size: 16px;">Olá ${user.getString('name') || 'Profissional'},</p>
                        <p style="color: #334155; font-size: 16px; line-height: 1.5;">${record.getString('message')}</p>
                        <br/>
                        <p style="color: #334155; font-size: 14px;">Acesse seu painel para ver os detalhes completos de sua performance.</p>
                        <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
                        <p style="color: #64748b; font-size: 12px; text-align: center;">SpineCare OS - Gestão de Clínicas de Dor</p>
                    </div>`,
        })
        $app.newMailClient().send(message)
        console.log('Milestone email sent to ' + email)
      }
    } catch (ex) {
      console.log('Error sending milestone email', ex)
    }
  }
  e.next()
}, 'notifications')
