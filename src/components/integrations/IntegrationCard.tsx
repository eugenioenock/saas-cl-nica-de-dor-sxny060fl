import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Mail, Globe, KeyRound } from 'lucide-react'

export function IntegrationCard({
  integration,
  onEdit,
  onToggle,
}: {
  integration: any
  onEdit: () => void
  onToggle: (id: string, active: boolean) => void
}) {
  const Icon =
    integration.type === 'email_provider' ? Mail : integration.type === 'webhook' ? Globe : KeyRound

  const typeLabel =
    integration.type === 'email_provider'
      ? 'Email / SMTP'
      : integration.type === 'webhook'
        ? 'Webhook'
        : 'Barcode API'

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2 truncate pr-4">
          <Icon className="h-4 w-4 shrink-0 text-primary" />
          <span className="truncate">{integration.name}</span>
        </CardTitle>
        <Switch
          checked={integration.is_active}
          onCheckedChange={(v) => onToggle(integration.id, v)}
        />
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center mt-4">
          <Badge variant="outline" className="bg-muted/50">
            {typeLabel}
          </Badge>
          <Button variant="secondary" size="sm" onClick={onEdit}>
            Editar
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
