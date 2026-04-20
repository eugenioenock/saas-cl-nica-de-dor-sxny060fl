import { Link, useSearchParams, useNavigate } from 'react-router-dom'
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

const resetSchema = z
  .object({
    password: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres'),
    passwordConfirm: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: 'As senhas não coincidem',
    path: ['passwordConfirm'],
  })

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const { toast } = useToast()
  const navigate = useNavigate()

  const form = useForm<z.infer<typeof resetSchema>>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: '', passwordConfirm: '' },
  })

  if (!token) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
        <div className="w-full max-w-md bg-white dark:bg-zinc-950 rounded-2xl shadow-sm p-8 border border-border text-center">
          <p className="text-destructive font-medium mb-6">
            Token de redefinição inválido ou ausente.
          </p>
          <Button asChild className="w-full h-11">
            <Link to="/login">Ir para Login</Link>
          </Button>
        </div>
      </div>
    )
  }

  const onSubmit = async (data: z.infer<typeof resetSchema>) => {
    try {
      await pb.collection('users').confirmPasswordReset(token, data.password, data.passwordConfirm)
      toast({
        title: 'Senha redefinida',
        description: 'Sua senha foi redefinida com sucesso. Você já pode fazer login.',
      })
      navigate('/login')
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível redefinir a senha. O link pode ter expirado ou é inválido.',
      })
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
      <div className="w-full max-w-md bg-white dark:bg-zinc-950 rounded-2xl shadow-sm p-8 border border-border">
        <div className="flex justify-center mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Activity className="h-6 w-6" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-center mb-2 tracking-tight">Criar Nova Senha</h2>
        <p className="text-muted-foreground text-center mb-8 text-sm">
          Digite e confirme sua nova senha abaixo.
        </p>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nova Senha</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" className="h-11" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="passwordConfirm"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirmar Nova Senha</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" className="h-11" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full h-11 mt-2"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Redefinir Senha
            </Button>
          </form>
        </Form>
      </div>
    </div>
  )
}
