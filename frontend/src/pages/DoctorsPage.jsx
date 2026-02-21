import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  searchDoctors,
  registerDoctor,
  activateDoctor,
  deactivateDoctor,
  DOCTOR_STATUS_FILTERS,
} from '../api/appointmentApi'
import StatusBadge from '../components/StatusBadge'
import Pagination from '../components/Pagination'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorAlert from '../components/ErrorAlert'

const DEFAULT_FILTERS = { search: '', status: 'ACTIVE', specialization: '' }
const EMPTY_FORM = {
  firstName: '',
  lastName: '',
  specialization: '',
  department: '',
  phoneNumber: '',
  email: '',
  consultationDurationMinutes: 30,
}

export default function DoctorsPage() {
  const navigate = useNavigate()
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [applied, setApplied] = useState(DEFAULT_FILTERS)
  const [page, setPage] = useState(0)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [togglingId, setTogglingId] = useState(null)

  // Registration modal
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)

  const fetchDoctors = useCallback(async (params, pageNum) => {
    setLoading(true)
    setError(null)
    try {
      const query = { page: pageNum, size: 20 }
      if (params.search) query.search = params.search
      if (params.status && params.status !== 'ALL') query.status = params.status
      if (params.specialization) query.specialization = params.specialization
      const data = await searchDoctors(query)
      setResult(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDoctors(applied, page)
  }, [applied, page, fetchDoctors])

  const handleSearch = () => { setPage(0); setApplied({ ...filters }) }
  const handleClear = () => { setFilters(DEFAULT_FILTERS); setApplied(DEFAULT_FILTERS); setPage(0) }

  const handleToggleStatus = async (doctor) => {
    setTogglingId(doctor.doctorId)
    try {
      if (doctor.status === 'ACTIVE') {
        await deactivateDoctor(doctor.doctorId)
      } else {
        await activateDoctor(doctor.doctorId)
      }
      fetchDoctors(applied, page)
    } catch (e) {
      alert(e.message)
    } finally {
      setTogglingId(null)
    }
  }

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleRegister = async (e) => {
    e.preventDefault()
    setSaving(true)
    setSaveError(null)
    try {
      const payload = Object.fromEntries(Object.entries(form).filter(([, v]) => v !== ''))
      if (payload.consultationDurationMinutes)
        payload.consultationDurationMinutes = parseInt(payload.consultationDurationMinutes)
      await registerDoctor(payload)
      setShowModal(false)
      setForm(EMPTY_FORM)
      fetchDoctors(applied, page)
    } catch (e) {
      setSaveError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Doctors</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {result ? `${result.totalElements} total doctors` : 'Manage doctor records'}
          </p>
        </div>
        <button className="btn-primary" onClick={() => { setShowModal(true); setSaveError(null) }}>
          + Register Doctor
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
          <div>
            <label className="label">Search</label>
            <input
              type="text"
              className="input"
              placeholder="Name, specialization..."
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <div>
            <label className="label">Status</label>
            <select
              className="input"
              value={filters.status}
              onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
            >
              {DOCTOR_STATUS_FILTERS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Specialization</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. Cardiology"
              value={filters.specialization}
              onChange={(e) => setFilters((f) => ({ ...f, specialization: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button className="btn-secondary" onClick={handleClear}>Clear</button>
          <button className="btn-primary" onClick={handleSearch}>Search</button>
        </div>
      </div>

      {/* Content */}
      {loading && <LoadingSpinner message="Loading doctors..." />}
      {error && <ErrorAlert message={error} onRetry={() => fetchDoctors(applied, page)} />}

      {!loading && !error && result && (
        <>
          {result.content.length === 0 ? (
            <div className="card p-12 text-center text-gray-400">
              <p className="text-4xl mb-3">👨‍⚕️</p>
              <p className="font-medium">No doctors found</p>
              <p className="text-sm mt-1">Try adjusting your search filters or register a new doctor</p>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Doctor ID</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Specialization</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Department</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Duration</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {result.content.map((doctor) => (
                      <tr key={doctor.doctorId} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                            {doctor.doctorId}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900">{doctor.fullName}</td>
                        <td className="px-4 py-3 text-gray-600">{doctor.specialization}</td>
                        <td className="px-4 py-3 text-gray-500">{doctor.department || '—'}</td>
                        <td className="px-4 py-3 text-gray-500">{doctor.consultationDurationMinutes} min</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={doctor.status} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              className="btn-secondary btn-sm"
                              onClick={() => navigate(`/appointments/book?doctorId=${doctor.doctorId}`)}
                            >
                              Book
                            </button>
                            <button
                              className={`btn-sm ${doctor.status === 'ACTIVE' ? 'btn-danger' : 'btn-success'}`}
                              disabled={togglingId === doctor.doctorId}
                              onClick={() => handleToggleStatus(doctor)}
                            >
                              {togglingId === doctor.doctorId
                                ? '...'
                                : doctor.status === 'ACTIVE'
                                ? 'Deactivate'
                                : 'Activate'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-gray-200 px-4">
                <Pagination
                  currentPage={result.page}
                  totalPages={result.totalPages}
                  totalElements={result.totalElements}
                  pageSize={result.size}
                  onPageChange={(p) => setPage(p)}
                />
              </div>
            </div>
          )}
        </>
      )}

      {/* Register Doctor Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Register Doctor</h2>
              <button className="text-gray-400 hover:text-gray-600 text-2xl leading-none" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleRegister} className="p-5 space-y-4">
              {saveError && <ErrorAlert message={saveError} />}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">First Name *</label>
                  <input className="input" value={form.firstName} onChange={set('firstName')} required maxLength={50} />
                </div>
                <div>
                  <label className="label">Last Name *</label>
                  <input className="input" value={form.lastName} onChange={set('lastName')} required maxLength={50} />
                </div>
                <div className="col-span-2">
                  <label className="label">Specialization *</label>
                  <input className="input" value={form.specialization} onChange={set('specialization')} required maxLength={100} placeholder="e.g. Cardiology" />
                </div>
                <div className="col-span-2">
                  <label className="label">Department</label>
                  <input className="input" value={form.department} onChange={set('department')} maxLength={100} placeholder="e.g. Cardiology Dept." />
                </div>
                <div>
                  <label className="label">Phone</label>
                  <input className="input" value={form.phoneNumber} onChange={set('phoneNumber')} maxLength={20} />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input type="email" className="input" value={form.email} onChange={set('email')} maxLength={100} />
                </div>
                <div className="col-span-2">
                  <label className="label">Consultation Duration (minutes)</label>
                  <input type="number" className="input" value={form.consultationDurationMinutes} onChange={set('consultationDurationMinutes')} min={10} max={240} />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Registering...' : 'Register'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
