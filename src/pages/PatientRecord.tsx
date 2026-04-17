import { useParams, Link } from 'react-router-dom'
import { mockPatients } from '@/lib/data'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { ArrowLeft, History, FileText } from 'lucide-react'
import { BodyMap } from '@/components/medical/body-map'

export default function PatientRecord() {
  const { id } = useParams()
  const patient = mockPatients.find((p) => p.id === id)

  if (!patient) {
    return <div className="p-6">Patient not found</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/patients">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{patient.name}</h1>
          <p className="text-muted-foreground">
            Document: {patient.document} • DOB: {new Date(patient.dob).toLocaleDateString()}
          </p>
        </div>
      </div>

      <Tabs defaultValue="map" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="map">Anatomical Map</TabsTrigger>
          <TabsTrigger value="history">Procedure History</TabsTrigger>
        </TabsList>
        <TabsContent value="map" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Pain Points & Pathologies</CardTitle>
              <CardDescription>
                Click on the interactive map to register a new pathology.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BodyMap patientId={patient.id} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Clinical History</CardTitle>
              <CardDescription>Timeline of procedures and consultations.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-muted before:to-transparent">
                {/* Mock timeline items */}
                <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-background bg-primary text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border bg-card shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-bold text-foreground">Initial Consultation</h4>
                      <time className="text-xs font-medium text-primary">Mar 10, 2026</time>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Patient reported severe lower back pain.
                    </p>
                  </div>
                </div>

                <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-background bg-secondary text-secondary-foreground shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                    <History className="w-4 h-4" />
                  </div>
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border bg-card shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-bold text-foreground">Lumbar Block Procedure</h4>
                      <time className="text-xs font-medium text-muted-foreground">
                        Mar 25, 2026
                      </time>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Successfully administered at L4-L5.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
