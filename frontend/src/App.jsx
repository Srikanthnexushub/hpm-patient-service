import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import PatientsPage from './pages/PatientsPage'
import RegisterPage from './pages/RegisterPage'
import PatientDetailPage from './pages/PatientDetailPage'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/patients" replace />} />
        <Route path="/patients" element={<PatientsPage />} />
        <Route path="/patients/register" element={<RegisterPage />} />
        <Route path="/patients/:id" element={<PatientDetailPage />} />
      </Routes>
    </Layout>
  )
}

export default App
