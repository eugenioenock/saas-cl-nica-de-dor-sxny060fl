import {
  Printer,
  BookOpen,
  LayoutDashboard,
  Users,
  CalendarDays,
  Package,
  DollarSign,
  Settings,
  ChevronRight,
  ShieldCheck,
  Stethoscope,
  PenTool,
  Network,
  Activity,
  CheckCircle2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

const sections = [
  { id: 'acesso', title: 'Acesso ao Sistema', icon: BookOpen },
  { id: 'dashboard', title: 'Dashboard Clínico', icon: LayoutDashboard },
  { id: 'pacientes', title: 'Gestão de Pacientes (EHR)', icon: Users },
  { id: 'agendamento', title: 'Agendamento', icon: CalendarDays },
  { id: 'estoque', title: 'Estoque', icon: Package },
  { id: 'financeiro', title: 'Gestão Financeira', icon: DollarSign },
  { id: 'admin', title: 'Ferramentas Administrativas', icon: Settings },
]

export default function Manual() {
  const [activeSection, setActiveSection] = useState('acesso')

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id)
          }
        })
      },
      { rootMargin: '-100px 0px -60% 0px' },
    )

    sections.forEach((s) => {
      const element = document.getElementById(s.id)
      if (element) observer.observe(element)
    })

    return () => observer.disconnect()
  }, [])

  const handlePrint = () => {
    window.print()
  }

  const scrollTo = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-4rem)] bg-background">
      {/* Sidebar TOC - Hidden on Print */}
      <div className="w-full md:w-72 shrink-0 border-r bg-muted/10 print:hidden h-full overflow-hidden flex flex-col">
        <div className="p-6 pb-4">
          <h2 className="font-semibold text-lg tracking-tight flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            Documentação
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Guia completo do SpineCare OS</p>
        </div>
        <div className="px-6 pb-4">
          <Button onClick={handlePrint} className="w-full shadow-sm" variant="default">
            <Printer className="w-4 h-4 mr-2" />
            Salvar como PDF / Imprimir
          </Button>
        </div>
        <ScrollArea className="flex-1 px-4">
          <nav className="space-y-1.5 pb-6">
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => scrollTo(s.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors text-left',
                  activeSection === s.id
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <s.icon
                  className={cn('w-4 h-4', activeSection === s.id ? 'text-primary' : 'opacity-70')}
                />
                {s.title}
                {activeSection === s.id && <ChevronRight className="w-4 h-4 ml-auto opacity-50" />}
              </button>
            ))}
          </nav>
        </ScrollArea>
      </div>

      {/* Main Content Area */}
      <ScrollArea className="flex-1 h-full print:overflow-visible print:h-auto relative">
        <main className="max-w-4xl mx-auto p-6 md:p-10 lg:p-12 print:p-0 print:max-w-none print:w-full">
          {/* Print Header - Only visible when printing */}
          <div className="hidden print:block mb-8 border-b-2 border-slate-200 pb-6 pt-4">
            <div className="flex items-center gap-3 mb-2">
              <Stethoscope className="w-8 h-8 text-black" />
              <h1 className="text-4xl font-bold text-black">SpineCare OS</h1>
            </div>
            <h2 className="text-2xl text-slate-600">Manual do Usuário e Documentação Oficial</h2>
            <p className="text-slate-500 mt-2 text-sm">
              Gerado eletronicamente em {new Date().toLocaleDateString('pt-BR')}
            </p>
          </div>

          <div className="mb-12 print:hidden">
            <h1 className="text-4xl font-extrabold tracking-tight mb-3">Manual do Sistema</h1>
            <p className="text-xl text-muted-foreground">
              Aprenda a utilizar todos os recursos da sua clínica de forma eficiente e estruturada.
            </p>
          </div>

          <div className="space-y-16 print:space-y-12 pb-24">
            {/* Section: Acesso */}
            <section id="acesso" className="scroll-mt-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-primary/10 p-2.5 rounded-xl print:border print:border-slate-300">
                  <ShieldCheck className="w-6 h-6 text-primary print:text-slate-800" />
                </div>
                <h2 className="text-2xl font-bold">Acesso ao Sistema</h2>
              </div>
              <div className="space-y-4 text-slate-600 dark:text-slate-300 print:text-black leading-relaxed">
                <p>
                  O SpineCare OS é uma plataforma 100% baseada na nuvem. Você pode acessá-la de
                  qualquer dispositivo com acesso à internet. Cada usuário possui credenciais únicas
                  e intransferíveis que determinam seu nível de permissão (Administrador, Gerente,
                  Profissional de Saúde ou Recepcionista).
                </p>
                <div className="bg-muted/50 dark:bg-muted/20 border border-border p-6 rounded-xl mt-4 print:bg-slate-50 print:border-slate-200">
                  <h3 className="text-sm font-bold text-foreground print:text-black uppercase tracking-wider mb-3">
                    Credenciais de Acesso (Demonstração)
                  </h3>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                      <span>
                        <strong>Email Principal:</strong> admin@skip.com
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                      <span>
                        <strong>Senha Padrão:</strong> Skip@Pass
                      </span>
                    </li>
                  </ul>
                  <p className="text-xs text-muted-foreground mt-4 italic">
                    *Em um ambiente de produção real, sempre altere sua senha no primeiro acesso
                    através das configurações de perfil.
                  </p>
                </div>
              </div>
            </section>

            <Separator className="print:bg-slate-200" />

            {/* Section: Dashboard */}
            <section id="dashboard" className="scroll-mt-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-primary/10 p-2.5 rounded-xl print:border print:border-slate-300">
                  <LayoutDashboard className="w-6 h-6 text-primary print:text-slate-800" />
                </div>
                <h2 className="text-2xl font-bold">Dashboard Clínico</h2>
              </div>
              <div className="space-y-6 text-slate-600 dark:text-slate-300 print:text-black leading-relaxed">
                <p>
                  O Dashboard é o painel de controle central da sua unidade. Ele fornece uma visão
                  consolidada e em tempo real das métricas mais importantes da clínica.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                  <div className="border border-border p-5 rounded-xl print:border-slate-200">
                    <h3 className="font-semibold text-foreground print:text-black mb-2">
                      Visão Executiva
                    </h3>
                    <p className="text-sm">
                      Acompanhe o faturamento mensal, número de agendamentos diários, taxa de
                      absenteísmo e fluxo de novos pacientes através de gráficos interativos.
                    </p>
                  </div>
                  <div className="border border-border p-5 rounded-xl print:border-slate-200">
                    <h3 className="font-semibold text-foreground print:text-black mb-2">
                      Gamificação (XP e Níveis)
                    </h3>
                    <p className="text-sm">
                      O sistema estimula o engajamento dos profissionais através de metas e
                      recompensas. Concluir prontuários, bater metas de faturamento e receber
                      avaliações positivas gera XP (Experiência), evoluindo o nível do profissional
                      e desbloqueando Badges.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <Separator className="print:bg-slate-200" />

            {/* Section: Pacientes */}
            <section id="pacientes" className="scroll-mt-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-primary/10 p-2.5 rounded-xl print:border print:border-slate-300">
                  <Users className="w-6 h-6 text-primary print:text-slate-800" />
                </div>
                <h2 className="text-2xl font-bold">Gestão de Pacientes (EHR)</h2>
              </div>
              <div className="space-y-6 text-slate-600 dark:text-slate-300 print:text-black leading-relaxed">
                <p>
                  O módulo de Prontuário Eletrônico (EHR) é o coração do acompanhamento clínico. Ele
                  mantém o histórico completo, seguro e auditável de cada paciente.
                </p>

                <div className="space-y-6 mt-4">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground print:text-black mb-2 flex items-center gap-2">
                      <Activity className="w-5 h-5 text-primary" /> Mapa de Dor Interativo
                    </h3>
                    <p className="mb-3">
                      Recurso visual exclusivo para marcação precisa da dor relatada pelo paciente.
                    </p>
                    <ul className="list-disc pl-6 space-y-1.5 text-sm">
                      <li>Visualize modelos anatômicos (Frente/Costas).</li>
                      <li>Arraste e solte marcadores diretamente no ponto de dor.</li>
                      <li>Defina a intensidade da dor (escala de 1 a 10).</li>
                      <li>Associe patologias ou notas específicas a cada ponto marcado.</li>
                      <li>O histórico permite comparar a evolução da dor em diferentes datas.</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-foreground print:text-black mb-2 flex items-center gap-2">
                      <PenTool className="w-5 h-5 text-primary" /> Prontuários e Assinatura Digital
                    </h3>
                    <p className="mb-3">
                      Garante validade legal e imutabilidade dos registros clínicos.
                    </p>
                    <ul className="list-disc pl-6 space-y-1.5 text-sm">
                      <li>Registro cronológico de evoluções, exames e prescrições.</li>
                      <li>
                        <strong>Assinatura Criptográfica:</strong> Ao finalizar uma evolução, o
                        profissional deve assiná-la. O sistema gera um hash SHA-256 imutável.
                      </li>
                      <li>
                        Trancamento automático: Após assinado, o registro não pode ser alterado,
                        apenas complementado via adendos.
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            <Separator className="print:bg-slate-200" />

            {/* Section: Agendamento */}
            <section id="agendamento" className="scroll-mt-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-primary/10 p-2.5 rounded-xl print:border print:border-slate-300">
                  <CalendarDays className="w-6 h-6 text-primary print:text-slate-800" />
                </div>
                <h2 className="text-2xl font-bold">Agendamento</h2>
              </div>
              <div className="space-y-4 text-slate-600 dark:text-slate-300 print:text-black leading-relaxed">
                <p>
                  A agenda inteligente permite visualizar e organizar os horários de múltiplos
                  profissionais e salas simultaneamente.
                </p>
                <ul className="list-disc pl-6 space-y-2 mt-4">
                  <li>
                    <strong>Visões flexíveis:</strong> Alterne rapidamente entre visualizações
                    Diária, Semanal e Mensal.
                  </li>
                  <li>
                    <strong>Controle de Status:</strong> Acompanhe o fluxo do paciente mudando o
                    status da consulta: Agendado, Confirmado, Em Atendimento, Concluído ou
                    Cancelado.
                  </li>
                  <li>
                    <strong>Integração Direta:</strong> Clique em um agendamento para abrir o
                    prontuário do paciente ou faturar a consulta instantaneamente.
                  </li>
                  <li>
                    <strong>Busca Rápida:</strong> Pressione{' '}
                    <kbd className="px-1.5 py-0.5 bg-muted border rounded text-xs">⌘/Ctrl + K</kbd>{' '}
                    em qualquer lugar do sistema para buscar um paciente e iniciar um agendamento.
                  </li>
                </ul>
              </div>
            </section>

            <Separator className="print:bg-slate-200" />

            {/* Section: Estoque */}
            <section id="estoque" className="scroll-mt-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-primary/10 p-2.5 rounded-xl print:border print:border-slate-300">
                  <Package className="w-6 h-6 text-primary print:text-slate-800" />
                </div>
                <h2 className="text-2xl font-bold">Gestão de Estoque e Insumos</h2>
              </div>
              <div className="space-y-4 text-slate-600 dark:text-slate-300 print:text-black leading-relaxed">
                <p>
                  O módulo de estoque é focado em segurança e controle rigoroso, essencial para
                  clínicas que lidam com materiais de alto custo e medicamentos controlados.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                  <div className="bg-muted/30 p-5 rounded-xl border print:border-slate-200">
                    <h3 className="font-semibold text-foreground print:text-black mb-2">
                      Rastreabilidade de Lotes
                    </h3>
                    <p className="text-sm">
                      Controle estrito de validade e procedência. Cada material consumido em um
                      procedimento fica vinculado ao prontuário do paciente, informando qual lote
                      exato foi utilizado.
                    </p>
                  </div>
                  <div className="bg-muted/30 p-5 rounded-xl border print:border-slate-200">
                    <h3 className="font-semibold text-foreground print:text-black mb-2">
                      Sugestões de Reposição
                    </h3>
                    <p className="text-sm">
                      O sistema monitora os níveis mínimos (estoque de segurança). Quando um
                      material atinge o nível crítico, um alerta é gerado sugerindo a criação de uma
                      nova Ordem de Compra.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <Separator className="print:bg-slate-200" />

            {/* Section: Financeiro */}
            <section id="financeiro" className="scroll-mt-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-primary/10 p-2.5 rounded-xl print:border print:border-slate-300">
                  <DollarSign className="w-6 h-6 text-primary print:text-slate-800" />
                </div>
                <h2 className="text-2xl font-bold">Gestão Financeira</h2>
              </div>
              <div className="space-y-4 text-slate-600 dark:text-slate-300 print:text-black leading-relaxed">
                <p>
                  O módulo financeiro simplifica o faturamento da clínica, integrando o recebimento
                  diretamente com as consultas realizadas.
                </p>
                <ul className="list-disc pl-6 space-y-2 mt-4">
                  <li>
                    <strong>Atendimentos Particulares:</strong> Registro de pagamentos via Dinheiro,
                    Cartão ou Pix, com baixa automática.
                  </li>
                  <li>
                    <strong>Faturamento de Convênios:</strong> Gestão do ciclo de repasse de planos
                    de saúde, permitindo marcar cobranças como "Pendente", "Pago" ou "Glosa".
                  </li>
                  <li>
                    <strong>Recibos Eletrônicos:</strong> Geração instantânea de recibos em formato
                    PDF, otimizados para impressão ou envio por email ao paciente.
                  </li>
                  <li>
                    <strong>Repasse Profissional:</strong> Visão dedicada para que cada
                    médico/terapeuta acompanhe seu faturamento próprio e as metas financeiras
                    estabelecidas.
                  </li>
                </ul>
              </div>
            </section>

            <Separator className="print:bg-slate-200" />

            {/* Section: Admin */}
            <section id="admin" className="scroll-mt-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-primary/10 p-2.5 rounded-xl print:border print:border-slate-300">
                  <Network className="w-6 h-6 text-primary print:text-slate-800" />
                </div>
                <h2 className="text-2xl font-bold">Ferramentas Administrativas</h2>
              </div>
              <div className="space-y-6 text-slate-600 dark:text-slate-300 print:text-black leading-relaxed">
                <p>
                  Recursos avançados disponíveis exclusivamente para usuários com perfil de
                  Administrador, voltados para o controle de múltiplas unidades (franquias) e
                  conformidade sistêmica.
                </p>

                <div className="space-y-4 mt-4">
                  <div className="border-l-4 border-primary pl-4 py-1 print:border-slate-400">
                    <h3 className="font-semibold text-foreground print:text-black">
                      Dashboard da Matriz (Franquias)
                    </h3>
                    <p className="text-sm mt-1">
                      Visualização agregada de dados de todas as clínicas da rede. Permite comparar
                      o faturamento, volume de consultas e eficiência do estoque entre diferentes
                      unidades na mesma tela.
                    </p>
                  </div>
                  <div className="border-l-4 border-primary pl-4 py-1 print:border-slate-400">
                    <h3 className="font-semibold text-foreground print:text-black">
                      Editor de Modelo Anatômico
                    </h3>
                    <p className="text-sm mt-1">
                      Capacidade de adicionar novos templates de imagens para o Mapa de Dor,
                      permitindo adaptar a interface gráfica para especialidades diferentes (ex:
                      visão detalhada de joelho, coluna cervical, etc).
                    </p>
                  </div>
                  <div className="border-l-4 border-primary pl-4 py-1 print:border-slate-400">
                    <h3 className="font-semibold text-foreground print:text-black">
                      Logs de Auditoria (Audit Logs)
                    </h3>
                    <p className="text-sm mt-1">
                      Para atender às normas de segurança de dados de saúde (LGPD/HIPAA), o sistema
                      registra todas as ações sensíveis. Você pode auditar quem acessou um
                      prontuário, quem alterou um estoque ou quem deletou um agendamento, com
                      carimbo de data, hora e IP.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </main>
      </ScrollArea>
    </div>
  )
}
