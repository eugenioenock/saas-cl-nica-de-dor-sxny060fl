import { Navigate } from 'react-router-dom'

export default function RecordsRedirect() {
  // Simple redirect to patients list since records are accessed via patient
  return <Navigate to="/pacientes" replace />
}
