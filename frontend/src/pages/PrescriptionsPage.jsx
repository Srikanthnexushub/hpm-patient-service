import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { listPrescriptions, PRESCRIPTION_STATUSES } from '../api/pharmacyApi'

const STATUS_BADGE = {
  PENDING:    'bg-yellow-100 text-yellow-700',
  DISPENSED:  'bg-green-100 text-green-700',
  CANCELLED:  'bg-gray-100 text-gray-500',
}

export default function PrescriptionsPage() {
  const navigate = useNavigate()
  const [prescriptions, setPrescriptions] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState({ patientId: '', doctorId: '', status: 'ALL' })

  const fetchPrescriptions = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = { page, size: 20 }
      if (filters.patientId) params.patientId = filters.patientId
      if (filters.doctorId) params.doctorId = filters.doctorId
      if (filters.status !== 'ALL') params.status = filters.status
      const data = await listPrescriptions(params)
      setPrescriptions(data.content)
      setTotal(data.totalElements)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [page, filters])

  useEffect(() => { fetchPrescriptions() }, [fetchPrescriptions])

  const handleFilterChange = (e) => {
    setFilters((f) => ({ ...f, [e.target.name]: e.target.value }))
    setPage(0)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Prescriptions</h1>
          <p className="text-sm text-gray-500">{total} total prescription{total !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => navigate('/prescriptions/new')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          + New Prescription
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex gap-3 flex-wrap">
        <input
          name="patientId" placeholder="Patient ID"
          value={filters.patientId} onChange={handleFilterChange}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-40"
        />
        <input
          name="doctorId" placeholder="Doctor ID"
          value={filters.doctorId} onChange={handleFilterChange}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-40"
        />
        <select
          name="status" value={filters.status} onChange={handleFilterChange}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {PRESCRIPTION_STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>
      )}

      <div className="space-y-2">
        {loading ? (
          <div className="text-center py-10 text-gray-400">Loading…</div>
        ) : prescriptions.length === 0 ? (
          <div className="text-center py-10 text-gray-400">No prescriptions found</div>
        ) : (
          prescriptions.map((rx) => (
            <div
              key={rx.prescriptionId}
              onClick={() => navigate(`/prescriptions/${rx.prescriptionId}`)}
              className="bg-white rounded-xl border border-gray-200 px-5 py-4 hover:shadow-sm cursor-pointer flex items-center gap-4"
            >
              <span className="text-2xl">💊</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium text-gray-900">{rx.prescriptionId}</p>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[rx.status]}`}>
                    {rx.status}
                  </span>
                </div>
                <div className="flex gap-4 text-sm text-gray-500">
                  <span>Patient: {rx.patientId}</span>
                  <span>Doctor: {rx.doctorId}</span>
                  <span>{rx.items?.length ?? 0} item{rx.items?.length !== 1 ? 's' : ''}</span>
                  <span>₹{Number(rx.totalPrice).toFixed(2)}</span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{rx.createdAt?.replace('T', ' ').slice(0, 16)}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {total > 20 && (
        <div className="flex justify-center gap-2 mt-4">
          <button disabled={page === 0} onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1 rounded border text-sm disabled:opacity-40">Prev</button>
          <span className="px-3 py-1 text-sm text-gray-600">Page {page + 1}</span>
          <button disabled={(page + 1) * 20 >= total} onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1 rounded border text-sm disabled:opacity-40">Next</button>
        </div>
      )}
    </div>
  )
}
