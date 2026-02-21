import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { listAdmissions, ADMISSION_STATUSES } from '../api/bedApi'

const STATUS_BADGE = {
  ADMITTED:   'bg-blue-100 text-blue-700',
  DISCHARGED: 'bg-gray-100 text-gray-500',
}

export default function AdmissionsPage() {
  const navigate = useNavigate()
  const [admissions, setAdmissions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState({ status: '', patientId: '' })

  const fetchAdmissions = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = {}
      if (filters.status) params.status = filters.status
      if (filters.patientId) params.patientId = filters.patientId
      const data = await listAdmissions(params)
      setAdmissions(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => { fetchAdmissions() }, [fetchAdmissions])

  const handleFilterChange = (e) => {
    setFilters((f) => ({ ...f, [e.target.name]: e.target.value }))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admissions</h1>
          <p className="text-sm text-gray-500">{admissions.length} record{admissions.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => navigate('/admissions/new')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          + Admit Patient
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex gap-3 flex-wrap">
        <input name="patientId" placeholder="Patient ID" value={filters.patientId} onChange={handleFilterChange}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-36" />
        <select name="status" value={filters.status} onChange={handleFilterChange}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">All Statuses</option>
          {ADMISSION_STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}

      <div className="space-y-2">
        {loading ? (
          <div className="text-center py-10 text-gray-400">Loading…</div>
        ) : admissions.length === 0 ? (
          <div className="text-center py-10 text-gray-400">No admissions found</div>
        ) : (
          admissions.map((a) => (
            <div key={a.admissionId} onClick={() => navigate(`/admissions/${a.admissionId}`)}
              className="bg-white rounded-xl border border-gray-200 px-5 py-4 hover:shadow-sm cursor-pointer flex items-center gap-4">
              <span className="text-2xl">🏥</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium text-gray-900">{a.admissionId}</p>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[a.status] || 'bg-gray-100 text-gray-700'}`}>
                    {a.status}
                  </span>
                </div>
                <div className="flex gap-4 text-sm text-gray-500">
                  <span>Patient: {a.patientId}</span>
                  <span>Bed: {a.bedNumber}</span>
                  <span>{a.wardName}</span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  Admitted: {a.admittedAt?.replace('T', ' ').slice(0, 16)}
                  {a.dischargedAt && ` · Discharged: ${a.dischargedAt?.replace('T', ' ').slice(0, 16)}`}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
