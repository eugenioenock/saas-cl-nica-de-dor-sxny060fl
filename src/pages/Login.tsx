import { useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Navigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Activity } from 'lucide-react'

export default function Login() {
  const { signIn, user, loading } = useAuth()
  const [email, setEmail] = useState('admin@skip.com')
  const [password, setPassword] = useState('Skip@Pass')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (loading) return null
  if (user) return <Navigate to="/" replace />

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')
    const res = await signIn(email, password)
    if (res.error) {
      setError('Credenciais inválidas.')
    }
    setIsSubmitting(false)
  }

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-white dark:bg-zinc-950">
      {/* Brand/Image Side */}
      <div className="hidden md:flex flex-1 flex-col justify-between bg-primary p-10 text-white relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src="https://img.usecurling.com/p/800/1200?q=modern%20clinic&color=blue"
            alt="Clinic Background"
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-primary/80 mix-blend-multiply" />
        </div>
        <div className="relative z-10 flex items-center gap-2 text-2xl font-bold">
          <Activity className="h-8 w-8" />
          <span>SpineCare Solutions</span>
        </div>
        <div className="relative z-10 mt-auto">
          <h1 className="text-4xl font-bold mb-4">Bem-vindo(a) ao seu portal clínico.</h1>
          <p className="text-lg text-primary-foreground/80 max-w-md">
            Gerencie prontuários, acompanhe a evolução da dor e otimize o atendimento aos seus
            pacientes com nossa plataforma especializada.
          </p>
        </div>
      </div>

      {/* Form Side */}
      <div className="flex-1 flex items-center justify-center p-8 sm:p-12">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2 mb-6 md:hidden text-primary">
              <Activity className="h-8 w-8" />
              <span className="text-2xl font-bold">SpineCare</span>
            </div>
            <h2 className="text-3xl font-bold tracking-tight">Acesso ao Sistema</h2>
            <p className="text-muted-foreground mt-2">
              Insira suas credenciais para acessar a plataforma.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 mt-8">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail Profissional</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="dr.nome@spinecare.com"
                  required
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Senha</Label>
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="h-12"
                />
              </div>
            </div>

            {error && <p className="text-sm text-destructive font-medium">{error}</p>}

            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Autenticando...' : 'Entrar'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
