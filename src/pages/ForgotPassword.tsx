import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Activity, Loader2, ArrowLeft } from 'lucide-react'
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

const forgotSchema = z.object({
  email: z.string().min(1, 'E-mail é obrigatório').email('Formato de e-mail inválido'),
})

export default function ForgotPassword() {
  const { toast } = useToast()
  const [success, setSuccess] = useState(false)

  const form = useForm<z.infer<typeof forgotSchema>>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: '' },
  })

  const onSubmit = async (data: z.infer<typeof forgotSchema>) => {
    try {
      await pb.collection('users').requestPasswordReset(data.email)
      setSuccess(true)
      toast({
        title: 'E-mail enviado',
        description: 'Verifique sua caixa de entrada para redefinir sua senha.',
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível solicitar a redefinição. Verifique o e-mail digitado.',
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
        <h2 className="text-2xl font-bold text-center mb-2 tracking-tight">Recuperar Senha</h2>
        <p className="text-muted-foreground text-center mb-8 text-sm">
          Digite seu e-mail para receber um link seguro de redefinição de senha.
        </p>

        {success ? (
          <div className="text-center space-y-6">
            <div className="p-4 bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 rounded-lg text-sm border border-green-100 dark:border-green-500/20">
              Um link de redefinição foi enviado para <strong>{form.getValues().email}</strong>.
            </div>
            <Button asChild variant="outline" className="w-full h-11">
              <Link to="/login">Voltar ao Login</Link>
            </Button>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="seu@email.com" className="h-11" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full h-11" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enviar link de recuperação
              </Button>
            </form>
          </Form>
        )}

        <div className="mt-8 text-center">
          <Link
            to="/login"
            className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar ao Login
          </Link>
        </div>
      </div>
    </div>
  )
}
