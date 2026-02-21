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
import NotificationsPage from './pages/NotificationsPage'
import SendNotificationPage from './pages/SendNotificationPage'
import NotificationDetailPage from './pages/NotificationDetailPage'
import MedicinesPage from './pages/MedicinesPage'
import AddMedicinePage from './pages/AddMedicinePage'
import MedicineDetailPage from './pages/MedicineDetailPage'
import PrescriptionsPage from './pages/PrescriptionsPage'
import CreatePrescriptionPage from './pages/CreatePrescriptionPage'
import PrescriptionDetailPage from './pages/PrescriptionDetailPage'
import LabTestsPage from './pages/LabTestsPage'
import AddLabTestPage from './pages/AddLabTestPage'
import LabOrdersPage from './pages/LabOrdersPage'
import CreateLabOrderPage from './pages/CreateLabOrderPage'
import LabOrderDetailPage from './pages/LabOrderDetailPage'
import LabTestDetailPage from './pages/LabTestDetailPage'
import WardsPage from './pages/WardsPage'
import BedsPage from './pages/BedsPage'
import AdmissionsPage from './pages/AdmissionsPage'
import CreateAdmissionPage from './pages/CreateAdmissionPage'
import AdmissionDetailPage from './pages/AdmissionDetailPage'
import StaffPage from './pages/StaffPage'
import StaffDetailPage from './pages/StaffDetailPage'
import LeavesPage from './pages/LeavesPage'
import LeaveDetailPage from './pages/LeaveDetailPage'
import ItemsPage from './pages/ItemsPage'
import ItemDetailPage from './pages/ItemDetailPage'
import TransactionsPage from './pages/TransactionsPage'

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
        {/* Notifications */}
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/notifications/send" element={<SendNotificationPage />} />
        <Route path="/notifications/:id" element={<NotificationDetailPage />} />
        {/* Pharmacy */}
        <Route path="/medicines" element={<MedicinesPage />} />
        <Route path="/medicines/new" element={<AddMedicinePage />} />
        <Route path="/medicines/:id" element={<MedicineDetailPage />} />
        <Route path="/prescriptions" element={<PrescriptionsPage />} />
        <Route path="/prescriptions/new" element={<CreatePrescriptionPage />} />
        <Route path="/prescriptions/:id" element={<PrescriptionDetailPage />} />
        {/* Laboratory */}
        <Route path="/lab-tests" element={<LabTestsPage />} />
        <Route path="/lab-tests/new" element={<AddLabTestPage />} />
        <Route path="/lab-tests/:id" element={<LabTestDetailPage />} />
        <Route path="/lab-orders" element={<LabOrdersPage />} />
        <Route path="/lab-orders/new" element={<CreateLabOrderPage />} />
        <Route path="/lab-orders/:id" element={<LabOrderDetailPage />} />
        {/* Bed Management */}
        <Route path="/wards" element={<WardsPage />} />
        <Route path="/beds" element={<BedsPage />} />
        <Route path="/admissions" element={<AdmissionsPage />} />
        <Route path="/admissions/new" element={<CreateAdmissionPage />} />
        <Route path="/admissions/:id" element={<AdmissionDetailPage />} />
        {/* Staff Management */}
        <Route path="/staff" element={<StaffPage />} />
        <Route path="/staff/:id" element={<StaffDetailPage />} />
        <Route path="/leaves" element={<LeavesPage />} />
        <Route path="/leaves/:id" element={<LeaveDetailPage />} />
        {/* Inventory */}
        <Route path="/items" element={<ItemsPage />} />
        <Route path="/items/:id" element={<ItemDetailPage />} />
        <Route path="/transactions" element={<TransactionsPage />} />
      </Routes>
    </Layout>
  )
}

export default App
