onRecordAfterCreateSuccess((e) => {
  const discrepancy = e.record.getFloat('discrepancy')
  // Only alert if there is a discrepancy (positive or negative)
  if (discrepancy === 0) return e.next()

  try {
    const material = $app.findRecordById('clinical_inventory', e.record.getString('material_id'))
    const prof = $app.findRecordById('users', e.record.getString('professional_id'))

    let email = 'admin@clinic.com'
    try {
      const settings = $app.findFirstRecordByFilter('clinic_settings', "id != ''")
      if (settings && settings.getString('email')) {
        email = settings.getString('email')
      }
    } catch (_) {}

    const appUrl = $os.getenv('VITE_POCKETBASE_URL') || 'https://app.saas.com'

    const msg = `🚨 ALERTA DE DISCREPÂNCIA DE ESTOQUE 🚨

Material: ${material.getString('name')}
Esperado no Sistema: ${e.record.getFloat('expected_quantity')}
Contagem Real: ${e.record.getFloat('actual_quantity')}
Diferença: ${discrepancy}

Responsável pela contagem: ${prof.getString('name') || prof.getString('email')}
Data: ${new Date().toLocaleString()}

Acesse o sistema para verificar o histórico e auditar o material:
${appUrl}/inventory`

    console.log(
      `\n=========================================\n[EMAIL ALERTA DE ESTOQUE ENVIADO PARA ${email}]:\n${msg}\n=========================================\n`,
    )

    // Em um ambiente de produção real, o email pode ser disparado usando o $http.send
    // integrando com Resend, SendGrid ou outra API transacional de email.
  } catch (err) {
    console.log('Error generating stock alert email: ', err)
  }

  return e.next()
}, 'inventory_counts')
