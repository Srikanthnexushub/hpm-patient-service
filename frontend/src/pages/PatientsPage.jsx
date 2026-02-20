import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  searchPatients,
  activatePatient,
  deactivatePatient,
  GENDERS,
  BLOOD_GROUPS,
  STATUS_FILTERS,
} from '../api/patientApi'
import StatusBadge from '../components/StatusBadge'
import Pagination from '../components/Pagination'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorAlert from '../components/ErrorAlert'

const DEFAULT_FILTERS = { search: '', status: 'ACTIVE', gender: '', bloodGroup: '' }

export default function PatientsPage() {
  const navigate = useNavigate()
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [applied, setApplied] = useState(DEFAULT_FILTERS)
  const [page, setPage] = useState(0)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [togglingId, setTogglingId] = useState(null)

  const fetchPatients = useCallback(async (params, pageNum) => {
    setLoading(true)
    setError(null)
    try {
      const query = { page: pageNum, size: 20 }
      if (params.search) query.search = params.search
      if (params.status && params.status !== 'ALL') query.status = params.status
      if (params.gender) query.gender = params.gender
      if (params.bloodGroup) query.bloodGroup = params.bloodGroup
      const data = await searchPatients(query)
      setResult(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPatients(applied, page)
  }, [applied, page, fetchPatients])

  const handleSearch = () => {
    setPage(0)
    setApplied({ ...filters })
  }

  const handleClear = () => {
    setFilters(DEFAULT_FILTERS)
    setApplied(DEFAULT_FILTERS)
    setPage(0)
  }

  const handleToggleStatus = async (patient) => {
    setTogglingId(patient.patientId)
    try {
      if (patient.status === 'ACTIVE') {
        await deactivatePatient(patient.patientId)
      } else {
        await activatePatient(patient.patientId)
      }
      fetchPatients(applied, page)
    } catch (e) {
      alert(e.message)
    } finally {
      setTogglingId(null)
    }
  }

  const bloodGroupLabel = (val) =>
    BLOOD_GROUPS.find((b) => b.value === val)?.label ?? val

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Patients</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {result ? `${result.totalElements} total patients` : 'Manage patient records'}
          </p>
        </div>
        <button className="btn-primary" onClick={() => navigate('/patients/register')}>
          + Register Patient
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
          <div className="lg:col-span-2">
            <label className="label">Search</label>
            <input
              type="text"
              className="input"
              placeholder="Patient ID, name, phone, email..."
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
              {STATUS_FILTERS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Gender</label>
            <select
              className="input"
              value={filters.gender}
              onChange={(e) => setFilters((f) => ({ ...f, gender: e.target.value }))}
            >
              <option value="">ALL</option>
              {GENDERS.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-48">
            <label className="label">Blood Group</label>
            <select
              className="input"
              value={filters.bloodGroup}
              onChange={(e) => setFilters((f) => ({ ...f, bloodGroup: e.target.value }))}
            >
              <option value="">ALL</option>
              {BLOOD_GROUPS.map((b) => (
                <option key={b.value} value={b.value}>{b.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end gap-2 ml-auto">
            <button className="btn-secondary" onClick={handleClear}>Clear</button>
            <button className="btn-primary" onClick={handleSearch}>Search</button>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading && <LoadingSpinner message="Loading patients..." />}
      {error && <ErrorAlert message={error} onRetry={() => fetchPatients(applied, page)} />}

      {!loading && !error && result && (
        <>
          {result.content.length === 0 ? (
            <div className="card p-12 text-center text-gray-400">
              <p className="text-4xl mb-3">🔍</p>
              <p className="font-medium">No patients found</p>
              <p className="text-sm mt-1">Try adjusting your search filters</p>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Patient ID</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Age / Gender</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Phone</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {result.content.map((patient) => (
                      <tr key={patient.patientId} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                            {patient.patientId}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium text-gray-900">
                            {patient.firstName} {patient.lastName}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {patient.age}y · {patient.gender}
                        </td>
                        <td className="px-4 py-3 text-gray-600 font-mono text-xs">
                          {patient.phoneNumber}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={patient.status} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              className="btn-secondary btn-sm"
                              onClick={() => navigate(`/patients/${patient.patientId}`)}
                            >
                              View
                            </button>
                            <button
                              className={`btn-sm ${patient.status === 'ACTIVE' ? 'btn-danger' : 'btn-success'}`}
                              disabled={togglingId === patient.patientId}
                              onClick={() => handleToggleStatus(patient)}
                            >
                              {togglingId === patient.patientId
                                ? '...'
                                : patient.status === 'ACTIVE'
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
    </div>
  )
}
