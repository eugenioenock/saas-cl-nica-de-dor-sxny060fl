import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Navigate, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Activity, Loader2 } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

const loginSchema = z.object({
  email: z.string().min(1, 'Email é obrigatório').email('Formato de e-mail inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
})

type LoginFormValues = z.infer<typeof loginSchema>

export default function Login() {
  const { signIn, user, loading } = useAuth()
  const { toast } = useToast()
  const [settings, setSettings] = useState<any>(null)

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: 'admin@skip.com',
      password: 'Skip@Pass',
    },
  })

  useEffect(() => {
    pb.collection('clinic_settings')
      .getList(1, 1)
      .then((res) => {
        if (res.items.length > 0) setSettings(res.items[0])
      })
      .catch(console.error)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (user) {
    const dashUrl =
      user.role === 'admin'
        ? '/admin/dashboard'
        : user.role === 'manager'
          ? '/manager/dashboard'
          : user.role === 'professional'
            ? '/professional/dashboard'
            : user.role === 'receptionist'
              ? '/reception/dashboard'
              : '/portal'
    return <Navigate to={dashUrl} replace />
  }

  const onSubmit = async (data: LoginFormValues) => {
    const res = await signIn(data.email, data.password)
    if (res.error) {
      toast({
        variant: 'destructive',
        title: 'Erro de Autenticação',
        description: 'Login failed. Please check your email and password.',
      })
    }
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
          {settings?.logo ? (
            <img
              src={pb.files.getURL(settings, settings.logo)}
              alt={settings?.name || 'Clinic Logo'}
              className="h-10 w-auto object-contain bg-white/10 rounded p-1"
            />
          ) : (
            <Activity className="h-8 w-8" />
          )}
          <span>{settings?.name || 'SpineCare Solutions'}</span>
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
              {settings?.logo ? (
                <img
                  src={pb.files.getURL(settings, settings.logo)}
                  alt={settings?.name || 'Clinic Logo'}
                  className="h-10 w-auto object-contain"
                />
              ) : (
                <Activity className="h-8 w-8" />
              )}
              <span className="text-2xl font-bold">{settings?.name || 'SpineCare'}</span>
            </div>
            <h2 className="text-3xl font-bold tracking-tight">Acesso ao Sistema</h2>
            <p className="text-muted-foreground mt-2">
              Insira suas credenciais para acessar a plataforma.
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-8">
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-mail Profissional</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="dr.nome@spinecare.com"
                          className="h-12"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>Senha</FormLabel>
                        <Link
                          to="/forgot-password"
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          Esqueci minha senha
                        </Link>
                      </div>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" className="h-12" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-base font-semibold"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Autenticando...
                  </>
                ) : (
                  'Entrar'
                )}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  )
}
