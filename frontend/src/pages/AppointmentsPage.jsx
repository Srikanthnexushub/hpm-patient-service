import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { searchAppointments, APPOINTMENT_STATUSES, APPOINTMENT_TYPES } from '../api/appointmentApi'
import Pagination from '../components/Pagination'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorAlert from '../components/ErrorAlert'

const DEFAULT_FILTERS = {
  patientId: '',
  doctorId: '',
  dateFrom: '',
  dateTo: '',
  status: 'ALL',
  type: '',
}

const STATUS_COLORS = {
  SCHEDULED: 'bg-blue-100 text-blue-700',
  CONFIRMED: 'bg-green-100 text-green-700',
  COMPLETED: 'bg-gray-100 text-gray-700',
  CANCELLED: 'bg-red-100 text-red-700',
  NO_SHOW: 'bg-yellow-100 text-yellow-700',
}

export default function AppointmentsPage() {
  const navigate = useNavigate()
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [applied, setApplied] = useState(DEFAULT_FILTERS)
  const [page, setPage] = useState(0)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchAppointments = useCallback(async (params, pageNum) => {
    setLoading(true)
    setError(null)
    try {
      const query = { page: pageNum, size: 20 }
      if (params.patientId) query.patientId = params.patientId
      if (params.doctorId) query.doctorId = params.doctorId
      if (params.dateFrom) query.dateFrom = params.dateFrom
      if (params.dateTo) query.dateTo = params.dateTo
      if (params.status && params.status !== 'ALL') query.status = params.status
      if (params.type) query.type = params.type
      const data = await searchAppointments(query)
      setResult(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAppointments(applied, page)
  }, [applied, page, fetchAppointments])

  const handleSearch = () => { setPage(0); setApplied({ ...filters }) }
  const handleClear = () => { setFilters(DEFAULT_FILTERS); setApplied(DEFAULT_FILTERS); setPage(0) }
  const set = (field) => (e) => setFilters((f) => ({ ...f, [field]: e.target.value }))

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Appointments</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {result ? `${result.totalElements} total appointments` : 'View and manage appointments'}
          </p>
        </div>
        <button className="btn-primary" onClick={() => navigate('/appointments/book')}>
          + Book Appointment
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
          <div>
            <label className="label">Patient ID</label>
            <input className="input" placeholder="P2026..." value={filters.patientId} onChange={set('patientId')} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} />
          </div>
          <div>
            <label className="label">Doctor ID</label>
            <input className="input" placeholder="DR2026..." value={filters.doctorId} onChange={set('doctorId')} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} />
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" value={filters.status} onChange={set('status')}>
              {APPOINTMENT_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Type</label>
            <select className="input" value={filters.type} onChange={set('type')}>
              <option value="">ALL</option>
              {APPOINTMENT_TYPES.map((t) => (
                <option key={t} value={t}>{t.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Date From</label>
            <input type="date" className="input" value={filters.dateFrom} onChange={set('dateFrom')} />
          </div>
          <div>
            <label className="label">Date To</label>
            <input type="date" className="input" value={filters.dateTo} onChange={set('dateTo')} />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button className="btn-secondary" onClick={handleClear}>Clear</button>
          <button className="btn-primary" onClick={handleSearch}>Search</button>
        </div>
      </div>

      {/* Content */}
      {loading && <LoadingSpinner message="Loading appointments..." />}
      {error && <ErrorAlert message={error} onRetry={() => fetchAppointments(applied, page)} />}

      {!loading && !error && result && (
        <>
          {result.content.length === 0 ? (
            <div className="card p-12 text-center text-gray-400">
              <p className="text-4xl mb-3">📅</p>
              <p className="font-medium">No appointments found</p>
              <p className="text-sm mt-1">Try adjusting your filters or book a new appointment</p>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">ID</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Patient</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Doctor</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date & Time</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {result.content.map((apt) => (
                      <tr key={apt.appointmentId} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                            {apt.appointmentId}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-600">{apt.patientId}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900 text-xs">{apt.doctorName}</p>
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          <p>{apt.appointmentDate}</p>
                          <p className="text-xs text-gray-400">{apt.appointmentTime} · {apt.durationMinutes}min</p>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{apt.appointmentType?.replace('_', ' ')}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[apt.status] || 'bg-gray-100 text-gray-600'}`}>
                            {apt.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            className="btn-secondary btn-sm"
                            onClick={() => navigate(`/appointments/${apt.appointmentId}`)}
                          >
                            View
                          </button>
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
    </div>
  )
}
