import pb from '@/lib/pocketbase/client'

export function ReceiptDocument({ record, settings }: { record: any; settings: any }) {
  if (!record) return null

  return (
    <div className="hidden print:block w-full bg-white text-black p-8 font-sans max-w-3xl mx-auto">
      <div className="text-center mb-8 border-b-2 border-gray-300 pb-6">
        {settings?.logo ? (
          <img
            src={pb.files.getURL(settings, settings.logo)}
            alt="Clinic Logo"
            className="h-20 object-contain mx-auto mb-4"
          />
        ) : (
          <div className="text-4xl font-bold mb-2">{settings?.name || 'Clínica de Dor'}</div>
        )}
        <h1 className="text-2xl font-bold uppercase mb-2">Recibo de Pagamento</h1>
        <p className="text-gray-600">Nº {record.id.toUpperCase()}</p>
      </div>

      <div className="mb-8 space-y-2 text-lg">
        <p>
          Recebemos de <strong>{record.expand?.patient_id?.name}</strong>
          {record.expand?.patient_id?.document && (
            <span> (Doc: {record.expand?.patient_id?.document})</span>
          )}
          ,
        </p>
        <p>
          a importância de <strong>R$ {record.amount.toFixed(2).replace('.', ',')}</strong>,
          referente a serviços prestados.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-12 border border-gray-200 p-6 rounded-lg bg-gray-50">
        <div>
          <p className="text-sm text-gray-500 uppercase font-semibold">Data do Pagamento</p>
          <p className="font-medium">{new Date(record.updated).toLocaleDateString()}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500 uppercase font-semibold">Método de Pagamento</p>
          <p className="font-medium capitalize">{record.payment_method}</p>
        </div>
        {settings?.address && (
          <div className="col-span-2 mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-500 uppercase font-semibold">Local</p>
            <p>{settings.address}</p>
          </div>
        )}
      </div>

      <div className="text-center mt-24">
        <div className="w-64 border-b border-black mx-auto mb-2"></div>
        <p className="font-bold">{settings?.name || 'Assinatura / Carimbo'}</p>
        {settings?.phone && <p className="text-sm mt-1">Tel: {settings.phone}</p>}
        {settings?.email && <p className="text-sm">{settings.email}</p>}
      </div>
    </div>
  )
}
