import { useState, useEffect } from 'react'
import { Printer, Loader2, BarChart3, Activity } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'

export default function Reports() {
  const [stats, setStats] = useState<any[]>([])
  const [clinicSettings, setClinicSettings] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)

  const loadData = async () => {
    try {
      const [points, settingsRes] = await Promise.all([
        pb.collection('pain_points').getFullList(),
        pb
          .collection('clinic_settings')
          .getList(1, 1)
          .catch(() => null),
      ])

      if (settingsRes && settingsRes.items.length > 0) {
        setClinicSettings(settingsRes.items[0])
      }

      const statsMap: Record<string, { count: number; totalIntensity: number }> = {}

      points.forEach((pt: any) => {
        const paths = pt.pathologies || []
        const intensity = pt.intensity || 0

        if (Array.isArray(paths)) {
          paths.forEach((p: string) => {
            if (!statsMap[p]) {
              statsMap[p] = { count: 0, totalIntensity: 0 }
            }
            statsMap[p].count += 1
            statsMap[p].totalIntensity += intensity
          })
        }
      })

      const statsArray = Object.entries(statsMap)
        .map(([name, data]) => ({
          name,
          count: data.count,
          avgIntensity: (data.totalIntensity / data.count).toFixed(1),
        }))
        .sort((a, b) => b.count - a.count)

      setStats(statsArray)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime('pain_points', loadData)

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
      </div>
    )
  }

  return (
    <>
      <div className="space-y-6 print:hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Relatórios Epidemiológicos</h1>
            <p className="text-muted-foreground">
              Visão geral da prevalência de patologias e estatísticas da clínica.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setIsExporting(true)
              setTimeout(() => {
                window.print()
                setIsExporting(false)
              }, 800)
            }}
            disabled={isExporting}
          >
            {isExporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Printer className="mr-2 h-4 w-4" />
            )}
            {isExporting ? 'Gerando PDF...' : 'Exportar PDF'}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Prevalência de Patologias
            </CardTitle>
            <CardDescription>
              Casos registrados no mapeamento de dor, agrupados por patologia.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patologia</TableHead>
                    <TableHead className="text-right">Número de Casos</TableHead>
                    <TableHead className="text-right">Intensidade Média</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.map((stat) => (
                    <TableRow key={stat.name}>
                      <TableCell className="font-medium">{stat.name}</TableCell>
                      <TableCell className="text-right">{stat.count}</TableCell>
                      <TableCell className="text-right">{stat.avgIntensity} / 10</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-10 text-muted-foreground flex flex-col items-center">
                <BarChart3 className="h-10 w-10 mb-4 opacity-20" />
                <p>Nenhum dado disponível.</p>
                <p className="text-sm">
                  Os dados aparecerão quando pontos de dor com patologias forem registrados.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Print Only Section */}
      <div className="hidden print:block w-full bg-white text-black text-sm">
        <div className="flex items-start justify-between border-b-2 border-black pb-4 mb-6">
          <div className="flex items-center gap-4">
            {clinicSettings?.logo ? (
              <img
                src={pb.files.getURL(clinicSettings, clinicSettings.logo)}
                alt="Clinic Logo"
                className="h-16 w-16 object-contain"
              />
            ) : (
              <Activity className="h-12 w-12 text-black" />
            )}
            <div>
              <h1 className="text-2xl font-bold">
                {clinicSettings?.name || 'SpineCare Solutions'}
              </h1>
              {(clinicSettings?.address || clinicSettings?.phone || clinicSettings?.email) && (
                <div className="text-sm text-gray-600 mt-1">
                  {clinicSettings.address && <div>{clinicSettings.address}</div>}
                  <div className="flex gap-4">
                    {clinicSettings.phone && <span>📞 {clinicSettings.phone}</span>}
                    {clinicSettings.email && <span>✉️ {clinicSettings.email}</span>}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="text-right text-gray-600 flex flex-col justify-end">
            <span className="font-semibold text-black uppercase mb-1">
              Relatório Epidemiológico
            </span>
            <span>Gerado em: {new Date().toLocaleDateString()}</span>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-lg font-bold mb-4 uppercase bg-gray-100 p-2 rounded">
            Prevalência de Patologias
          </h2>
          <table className="w-full border-collapse mt-2">
            <thead>
              <tr className="border-b-2 border-gray-300">
                <th className="text-left p-2 font-bold w-1/2">Patologia</th>
                <th className="text-right p-2 font-bold">Casos</th>
                <th className="text-right p-2 font-bold">Intensidade Média</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((stat) => (
                <tr key={stat.name} className="border-b border-gray-200">
                  <td className="p-2 font-medium">{stat.name}</td>
                  <td className="p-2 text-right">{stat.count}</td>
                  <td className="p-2 text-right">{stat.avgIntensity}</td>
                </tr>
              ))}
              {stats.length === 0 && (
                <tr>
                  <td colSpan={3} className="p-4 text-center text-gray-500">
                    Nenhum dado disponível.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="text-xs text-gray-500 text-center mt-10">
          Este é um documento gerado automaticamente. Uso exclusivo da clínica.
        </div>
      </div>
    </>
  )
}
