import { useState, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
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
import { Plus, Search, ShieldCheck } from 'lucide-react'

const userSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('E-mail inválido'),
  role: z.enum(['admin', 'manager', 'professional', 'receptionist', 'patient']),
  status: z.enum(['active', 'pending', 'rejected']),
  password: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres'),
})

type UserFormValues = z.infer<typeof userSchema>

export default function UsersManagement() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: { name: '', email: '', role: 'professional', status: 'active', password: '' },
  })

  const loadUsers = async () => {
    try {
      if (!user?.clinic_id) return
      const res = await pb.collection('users').getFullList({
        filter: `clinic_id = "${user.clinic_id}"`,
        sort: '-created',
      })
      setUsers(res)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [user?.clinic_id])

  const onSubmit = async (data: UserFormValues) => {
    try {
      await pb.collection('users').create({
        ...data,
        passwordConfirm: data.password,
        clinic_id: user?.clinic_id,
      })
      toast({ title: 'Usuário criado com sucesso' })
      setOpen(false)
      form.reset()
      loadUsers()
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao criar usuário',
        description: error.message,
      })
    }
  }

  const updateStatus = async (id: string, status: string) => {
    try {
      await pb.collection('users').update(id, { status })
      toast({ title: 'Status atualizado' })
      loadUsers()
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro ao atualizar status' })
    }
  }

  const updateRole = async (id: string, role: string) => {
    try {
      await pb.collection('users').update(id, { role })
      toast({ title: 'Função atualizada' })
      loadUsers()
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro ao atualizar função' })
    }
  }

  const filteredUsers = users.filter(
    (u) =>
      (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestão de Usuários</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie o acesso e permissões da equipe clínica.
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Criar Novo Usuário</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Completo</FormLabel>
                      <FormControl>
                        <Input placeholder="Dr. João Silva" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-mail Corporativo</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="joao@clinica.com" {...field} />
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
                      <FormLabel>Senha Provisória</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Função</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="admin">Administrador</SelectItem>
                            <SelectItem value="manager">Gerente</SelectItem>
                            <SelectItem value="professional">Profissional</SelectItem>
                            <SelectItem value="receptionist">Recepção</SelectItem>
                            <SelectItem value="patient">Paciente</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status Inicial</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="active">Ativo</SelectItem>
                            <SelectItem value="pending">Pendente</SelectItem>
                            <SelectItem value="rejected">Rejeitado</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full mt-2"
                  disabled={form.formState.isSubmitting}
                >
                  Salvar Usuário
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-2 max-w-sm">
        <div className="relative w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou e-mail..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="border rounded-xl bg-card overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Usuário</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Função</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  Nenhum usuário encontrado.
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((u) => (
                <TableRow key={u.id} className="hover:bg-muted/30">
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {u.role === 'admin' && (
                        <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                      )}
                      <span className="truncate">{u.name || 'Sem Nome'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell>
                    <Select
                      defaultValue={u.role}
                      onValueChange={(val) => updateRole(u.id, val)}
                      disabled={u.id === user?.id}
                    >
                      <SelectTrigger className="w-[140px] h-8 text-xs font-medium">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Administrador</SelectItem>
                        <SelectItem value="manager">Gerente</SelectItem>
                        <SelectItem value="professional">Profissional</SelectItem>
                        <SelectItem value="receptionist">Recepção</SelectItem>
                        <SelectItem value="patient">Paciente</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select
                      defaultValue={u.status || 'pending'}
                      onValueChange={(val) => updateStatus(u.id, val)}
                      disabled={u.id === user?.id}
                    >
                      <SelectTrigger className="w-[120px] h-8 text-xs font-medium">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className="h-2 w-2 rounded-full p-0 bg-green-500 border-transparent"
                            />{' '}
                            Ativo
                          </div>
                        </SelectItem>
                        <SelectItem value="pending">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className="h-2 w-2 rounded-full p-0 bg-yellow-500 border-transparent"
                            />{' '}
                            Pendente
                          </div>
                        </SelectItem>
                        <SelectItem value="rejected">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className="h-2 w-2 rounded-full p-0 bg-red-500 border-transparent"
                            />{' '}
                            Rejeitado
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
