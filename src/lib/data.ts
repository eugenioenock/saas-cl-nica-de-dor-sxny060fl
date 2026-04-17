export type Franchise = { id: string; name: string }
export type Clinic = { id: string; franchiseId: string; name: string; address: string }
export type User = { id: string; name: string; role: string; clinicId: string; email: string }
export type Patient = {
  id: string
  clinicId: string
  name: string
  dob: string
  document: string
  gender: string
}
export type Pathology = { id: string; name: string; icd: string }
export type BodyPoint = { id: string; label: string; x: number; y: number; side: 'front' | 'back' }
export type Material = { id: string; clinicId: string; name: string; stock: number; unit: string }
export type FinancialRecord = {
  id: string
  clinicId: string
  amount: number
  type: 'income' | 'expense'
  date: string
  category: string
}
export type Appointment = {
  id: string
  clinicId: string
  patientId: string
  date: string
  status: 'scheduled' | 'completed' | 'cancelled'
  procedure: string
}

export const mockFranchises: Franchise[] = [{ id: 'f1', name: 'SpineCare National' }]

export const mockClinics: Clinic[] = [
  { id: 'c1', franchiseId: 'f1', name: 'SpineCare Downtown', address: '123 Main St, Metro City' },
  { id: 'c2', franchiseId: 'f1', name: 'SpineCare Westside', address: '456 West Blvd, Metro City' },
]

export const mockUsers: User[] = [
  {
    id: 'u1',
    name: 'Dr. Sarah Jenkins',
    role: 'Doctor',
    clinicId: 'c1',
    email: 's.jenkins@spinecare.com',
  },
  {
    id: 'u2',
    name: 'Mark Admin',
    role: 'Clinic Admin',
    clinicId: 'c1',
    email: 'admin@spinecare.com',
  },
]

export const mockPatients: Patient[] = [
  {
    id: 'p1',
    clinicId: 'c1',
    name: 'Robert Williams',
    dob: '1975-04-12',
    document: '123.456.789-00',
    gender: 'Male',
  },
  {
    id: 'p2',
    clinicId: 'c1',
    name: 'Emily Chen',
    dob: '1982-11-23',
    document: '987.654.321-11',
    gender: 'Female',
  },
  {
    id: 'p3',
    clinicId: 'c1',
    name: 'Michael Brown',
    dob: '1960-01-05',
    document: '456.123.789-22',
    gender: 'Male',
  },
  {
    id: 'p4',
    clinicId: 'c2',
    name: 'Lisa Ray',
    dob: '1990-08-15',
    document: '111.222.333-44',
    gender: 'Female',
  },
]

export const mockPathologies: Pathology[] = [
  { id: 'path1', name: 'Herniated Disc', icd: 'M51.2' },
  { id: 'path2', name: 'Myofascial Pain Syndrome', icd: 'M79.1' },
  { id: 'path3', name: 'Osteoarthritis', icd: 'M19.9' },
  { id: 'path4', name: 'Sciatica', icd: 'M54.3' },
]

export const mockBodyPoints: BodyPoint[] = [
  { id: 'bp1', label: 'Cervical Spine', x: 50, y: 15, side: 'back' },
  { id: 'bp2', label: 'Thoracic Spine', x: 50, y: 30, side: 'back' },
  { id: 'bp3', label: 'Lumbar Spine', x: 50, y: 45, side: 'back' },
  { id: 'bp4', label: 'Right Shoulder', x: 30, y: 22, side: 'front' },
  { id: 'bp5', label: 'Left Shoulder', x: 70, y: 22, side: 'front' },
  { id: 'bp6', label: 'Right Knee', x: 38, y: 75, side: 'front' },
  { id: 'bp7', label: 'Left Knee', x: 62, y: 75, side: 'front' },
]

export const mockMaterials: Material[] = [
  { id: 'm1', clinicId: 'c1', name: 'Lidocaine 2%', stock: 150, unit: 'vial' },
  { id: 'm2', clinicId: 'c1', name: 'Corticosteroid Injection', stock: 45, unit: 'syringe' },
  { id: 'm3', clinicId: 'c1', name: 'Sterile Needles 25G', stock: 500, unit: 'box' },
]

export const mockFinancials: FinancialRecord[] = [
  {
    id: 'fin1',
    clinicId: 'c1',
    amount: 1500,
    type: 'income',
    date: '2026-04-15',
    category: 'Epidural Block',
  },
  {
    id: 'fin2',
    clinicId: 'c1',
    amount: 350,
    type: 'income',
    date: '2026-04-16',
    category: 'Consultation',
  },
  {
    id: 'fin3',
    clinicId: 'c1',
    amount: 800,
    type: 'income',
    date: '2026-04-16',
    category: 'Trigger Point Injection',
  },
  {
    id: 'fin4',
    clinicId: 'c1',
    amount: 1200,
    type: 'expense',
    date: '2026-04-10',
    category: 'Medical Supplies',
  },
]

export const mockAppointments: Appointment[] = [
  {
    id: 'apt1',
    clinicId: 'c1',
    patientId: 'p1',
    date: new Date(Date.now() + 86400000).toISOString(),
    status: 'scheduled',
    procedure: 'Follow-up',
  },
  {
    id: 'apt2',
    clinicId: 'c1',
    patientId: 'p2',
    date: new Date(Date.now() + 172800000).toISOString(),
    status: 'scheduled',
    procedure: 'Lumbar Block',
  },
  {
    id: 'apt3',
    clinicId: 'c1',
    patientId: 'p3',
    date: new Date(Date.now() - 86400000).toISOString(),
    status: 'completed',
    procedure: 'Consultation',
  },
]
