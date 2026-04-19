import { ShieldAlert } from 'lucide-react'

const PLACEHOLDERS = [
  {
    group: 'Estoque',
    items: [
      '{{material_name}}',
      '{{batch_number}}',
      '{{current_qty}}',
      '{{min_qty}}',
      '{{discrepancy}}',
    ],
  },
  {
    group: 'Profissional',
    items: ['{{professional_name}}', '{{specialty}}'],
  },
  {
    group: 'Consulta',
    items: ['{{patient_name}}', '{{start_time}}'],
  },
]

export function PlaceholderInfo() {
  return (
    <div className="mt-4 p-4 bg-muted/50 border rounded-md text-sm space-y-3">
      <p className="font-semibold flex items-center gap-2 text-primary">
        <ShieldAlert className="h-4 w-4" /> Variáveis Disponíveis
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-muted-foreground">
        {PLACEHOLDERS.map((g) => (
          <div key={g.group}>
            <span className="font-medium text-foreground">{g.group}:</span>
            <ul className="list-disc pl-4 mt-1 space-y-1">
              {g.items.map((i) => (
                <li key={i} className="font-mono text-xs bg-muted px-1 py-0.5 rounded w-max">
                  {i}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
