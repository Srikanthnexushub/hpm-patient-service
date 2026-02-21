import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { searchRecords, RECORD_STATUS_FILTERS } from '../api/emrApi'
import Pagination from '../components/Pagination'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorAlert from '../components/ErrorAlert'

const DEFAULT_FILTERS = {
  patientId: '',
  doctorId: '',
  appointmentId: '',
  status: 'ALL',
  dateFrom: '',
  dateTo: '',
}

const STATUS_COLORS = {
  DRAFT: 'bg-yellow-100 text-yellow-700',
  FINALIZED: 'bg-green-100 text-green-700',
  AMENDED: 'bg-blue-100 text-blue-700',
}

export default function MedicalRecordsPage() {
  const navigate = useNavigate()
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [applied, setApplied] = useState(DEFAULT_FILTERS)
  const [page, setPage] = useState(0)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchRecords = useCallback(async (params, pageNum) => {
    setLoading(true)
    setError(null)
    try {
      const query = { page: pageNum, size: 20 }
      if (params.patientId) query.patientId = params.patientId
      if (params.doctorId) query.doctorId = params.doctorId
      if (params.appointmentId) query.appointmentId = params.appointmentId
      if (params.status && params.status !== 'ALL') query.status = params.status
      if (params.dateFrom) query.dateFrom = params.dateFrom
      if (params.dateTo) query.dateTo = params.dateTo
      const data = await searchRecords(query)
      setResult(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRecords(applied, page)
  }, [applied, page, fetchRecords])

  const handleSearch = () => { setPage(0); setApplied({ ...filters }) }
  const handleClear = () => { setFilters(DEFAULT_FILTERS); setApplied(DEFAULT_FILTERS); setPage(0) }
  const set = (field) => (e) => setFilters((f) => ({ ...f, [field]: e.target.value }))

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Medical Records</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {result ? `${result.totalElements} total records` : 'View and manage medical records'}
          </p>
        </div>
        <button className="btn-primary" onClick={() => navigate('/records/new')}>
          + New Record
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
              {RECORD_STATUS_FILTERS.map((s) => (
                <option key={s} value={s}>{s}</option>
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
          <div>
            <label className="label">Appointment ID</label>
            <input className="input" placeholder="APT2026..." value={filters.appointmentId} onChange={set('appointmentId')} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button className="btn-secondary" onClick={handleClear}>Clear</button>
          <button className="btn-primary" onClick={handleSearch}>Search</button>
        </div>
      </div>

      {/* Content */}
      {loading && <LoadingSpinner message="Loading records..." />}
      {error && <ErrorAlert message={error} onRetry={() => fetchRecords(applied, page)} />}

      {!loading && !error && result && (
        <>
          {result.content.length === 0 ? (
            <div className="card p-12 text-center text-gray-400">
              <p className="text-4xl mb-3">📋</p>
              <p className="font-medium">No medical records found</p>
              <p className="text-sm mt-1">Try adjusting your filters or create a new record</p>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Record ID</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Patient</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Doctor</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Chief Complaint</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Diagnosis</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Created</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {result.content.map((rec) => (
                      <tr key={rec.recordId} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                            {rec.recordId}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-600">{rec.patientId}</td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-600">{rec.doctorId}</td>
                        <td className="px-4 py-3 text-gray-700 max-w-[200px] truncate" title={rec.chiefComplaint}>
                          {rec.chiefComplaint}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {rec.diagnosisCode ? (
                            <span className="font-mono">{rec.diagnosisCode}</span>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[rec.status] || 'bg-gray-100 text-gray-600'}`}>
                            {rec.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {rec.createdAt?.replace('T', ' ').substring(0, 10)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            className="btn-secondary btn-sm"
                            onClick={() => navigate(`/records/${rec.recordId}`)}
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
