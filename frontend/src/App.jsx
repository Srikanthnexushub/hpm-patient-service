import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import PatientsPage from './pages/PatientsPage'
import RegisterPage from './pages/RegisterPage'
import PatientDetailPage from './pages/PatientDetailPage'
import DoctorsPage from './pages/DoctorsPage'
import AppointmentsPage from './pages/AppointmentsPage'
import BookAppointmentPage from './pages/BookAppointmentPage'
import AppointmentDetailPage from './pages/AppointmentDetailPage'
import MedicalRecordsPage from './pages/MedicalRecordsPage'
import CreateRecordPage from './pages/CreateRecordPage'
import RecordDetailPage from './pages/RecordDetailPage'
import InvoicesPage from './pages/InvoicesPage'
import CreateInvoicePage from './pages/CreateInvoicePage'
import InvoiceDetailPage from './pages/InvoiceDetailPage'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/patients" replace />} />
        {/* Patients */}
        <Route path="/patients" element={<PatientsPage />} />
        <Route path="/patients/register" element={<RegisterPage />} />
        <Route path="/patients/:id" element={<PatientDetailPage />} />
        {/* Appointments */}
        <Route path="/doctors" element={<DoctorsPage />} />
        <Route path="/appointments" element={<AppointmentsPage />} />
        <Route path="/appointments/book" element={<BookAppointmentPage />} />
        <Route path="/appointments/:id" element={<AppointmentDetailPage />} />
        {/* EMR */}
        <Route path="/records" element={<MedicalRecordsPage />} />
        <Route path="/records/new" element={<CreateRecordPage />} />
        <Route path="/records/:id" element={<RecordDetailPage />} />
        {/* Billing */}
        <Route path="/invoices" element={<InvoicesPage />} />
        <Route path="/invoices/new" element={<CreateInvoicePage />} />
        <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
      </Routes>
    </Layout>
  )
}

export default App
