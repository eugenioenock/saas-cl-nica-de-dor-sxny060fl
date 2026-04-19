import { useState, useEffect } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { PlaceholderInfo } from './PlaceholderInfo'

export function IntegrationEditor({ integration, open, onOpenChange, onSave }: any) {
  const [formData, setFormData] = useState<any>({
    name: '',
    type: 'webhook',
    config: {},
    is_active: true,
  })

  useEffect(() => {
    if (open) {
      if (integration) {
        const safeConfig = { ...integration.config }
        // Mask passwords visually by emptying them. The placeholder indicates they are set.
        if (safeConfig.smtp_pass) safeConfig.smtp_pass = ''
        if (safeConfig.secret) safeConfig.secret = ''
        if (safeConfig.api_key) safeConfig.api_key = ''
        setFormData({ ...integration, config: safeConfig })
      } else {
        setFormData({ name: '', type: 'webhook', config: {}, is_active: true })
      }
    }
  }, [integration, open])

  const handleConfig = (k: string, v: string) =>
    setFormData((f: any) => ({ ...f, config: { ...f.config, [k]: v } }))

  const handleSave = () => {
    const finalData = { ...formData }
    if (integration) {
      // Restore masked secrets if the user didn't enter new ones
      if (finalData.type === 'email_provider' && !finalData.config.smtp_pass)
        finalData.config.smtp_pass = integration.config.smtp_pass
      if (finalData.type === 'webhook' && !finalData.config.secret)
        finalData.config.secret = integration.config.secret
      if (finalData.type === 'barcode_service' && !finalData.config.api_key)
        finalData.config.api_key = integration.config.api_key
    }
    onSave(finalData)
  }

  const renderConfigFields = () => {
    switch (formData.type) {
      case 'email_provider':
        return (
          <>
            <div className="space-y-2">
              <Label>SMTP Host</Label>
              <Input
                value={formData.config?.smtp_host || ''}
                onChange={(e) => handleConfig('smtp_host', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>SMTP User</Label>
              <Input
                value={formData.config?.smtp_user || ''}
                onChange={(e) => handleConfig('smtp_user', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>SMTP Pass</Label>
              <Input
                type="password"
                value={formData.config?.smtp_pass || ''}
                onChange={(e) => handleConfig('smtp_pass', e.target.value)}
                placeholder={integration ? '******** (deixe em branco para manter)' : ''}
              />
            </div>
            <div className="space-y-2">
              <Label>Template HTML/Texto</Label>
              <Textarea
                rows={5}
                value={formData.config?.template || ''}
                onChange={(e) => handleConfig('template', e.target.value)}
              />
            </div>
          </>
        )
      case 'webhook':
        return (
          <>
            <div className="space-y-2">
              <Label>Webhook URL</Label>
              <Input
                value={formData.config?.url || ''}
                onChange={(e) => handleConfig('url', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Secret / Token</Label>
              <Input
                type="password"
                value={formData.config?.secret || ''}
                onChange={(e) => handleConfig('secret', e.target.value)}
                placeholder={integration ? '******** (deixe em branco para manter)' : ''}
              />
            </div>
            <div className="space-y-2">
              <Label>Payload Template (JSON)</Label>
              <Textarea
                rows={5}
                value={formData.config?.template || ''}
                onChange={(e) => handleConfig('template', e.target.value)}
              />
            </div>
          </>
        )
      case 'barcode_service':
        return (
          <>
            <div className="space-y-2">
              <Label>API Endpoint URL</Label>
              <Input
                value={formData.config?.url || ''}
                onChange={(e) => handleConfig('url', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>API Key</Label>
              <Input
                type="password"
                value={formData.config?.api_key || ''}
                onChange={(e) => handleConfig('api_key', e.target.value)}
                placeholder={integration ? '******** (deixe em branco para manter)' : ''}
              />
            </div>
          </>
        )
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl overflow-y-auto w-full">
        <SheetHeader>
          <SheetTitle>{formData.id ? 'Editar' : 'Nova'} Integração</SheetTitle>
        </SheetHeader>
        <div className="py-6 space-y-5">
          <div className="space-y-2">
            <Label>Nome da Integração</Label>
            <Input
              value={formData.name || ''}
              onChange={(e) => setFormData((f: any) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select
              value={formData.type || 'webhook'}
              onValueChange={(v) => setFormData((f: any) => ({ ...f, type: v, config: {} }))}
              disabled={!!formData.id}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="email_provider">Email Provider (SMTP)</SelectItem>
                <SelectItem value="webhook">Webhook Customizado</SelectItem>
                <SelectItem value="barcode_service">Serviço de Código de Barras</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="pt-2 border-t space-y-5">{renderConfigFields()}</div>
          <PlaceholderInfo />
        </div>
        <div className="flex justify-end gap-3 mt-4 pb-8">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!formData.name}>
            Salvar Configuração
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
