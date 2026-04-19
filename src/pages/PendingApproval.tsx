import { useAuth } from '@/hooks/use-auth'
import { Navigate } from 'react-router-dom'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ShieldAlert } from 'lucide-react'

export default function PendingApproval() {
  const { user, signOut } = useAuth()

  if (!user) return <Navigate to="/login" replace />
  if (user.status === 'active') return <Navigate to="/" replace />

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="max-w-md w-full shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
            <ShieldAlert className="h-6 w-6 text-amber-600" />
          </div>
          <CardTitle className="text-2xl">Aprovação Pendente</CardTitle>
          <CardDescription>Sua conta está em análise</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 text-center">
          <p className="text-sm text-muted-foreground">
            {user.status === 'rejected'
              ? 'Infelizmente, sua solicitação de acesso foi recusada pelo administrador. Entre em contato com a gerência para mais detalhes.'
              : 'Para garantir a segurança dos dados da clínica, o acesso de novos colaboradores deve ser aprovado manualmente por um administrador. Você receberá um aviso assim que seu acesso for liberado.'}
          </p>
          <Button onClick={signOut} variant="outline" className="w-full">
            Sair da Conta
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
