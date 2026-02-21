import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { listRequests, createRequest, BLOOD_GROUPS, REQUEST_STATUSES, REQUEST_PRIORITIES } from '../api/bloodBankApi'

const STATUS_BADGE = {
  PENDING:   'bg-yellow-100 text-yellow-700',
  FULFILLED: 'bg-green-100 text-green-700',
  REJECTED:  'bg-red-100 text-red-600',
  CANCELLED: 'bg-gray-100 text-gray-600',
}

const PRIORITY_BADGE = {
  NORMAL:   'bg-blue-100 text-blue-700',
  URGENT:   'bg-orange-100 text-orange-700',
  CRITICAL: 'bg-red-100 text-red-700',
}

const emptyForm = {
  patientId: '',
  bloodGroup: 'A_POS',
  unitsRequested: 1,
  priority: 'NORMAL',
  notes: '',
}

export default function BloodRequestsPage() {
  const navigate = useNavigate()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState({ status: '', patientId: '' })
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const fetchRequests = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = {}
      if (filters.status) params.status = filters.status
      if (filters.patientId) params.patientId = filters.patientId
      const data = await listRequests(params)
      setRequests(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => { fetchRequests() }, [fetchRequests])

  const handleFilterChange = (e) =>
    setFilters((f) => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setFormError('')
    try {
      await createRequest({ ...form, unitsRequested: Number(form.unitsRequested) })
      setForm(emptyForm)
      setShowForm(false)
      fetchRequests()
    } catch (e) {
      setFormError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Blood Requests</h1>
          <p className="text-sm text-gray-500">{requests.length} request{requests.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
        >
          {showForm ? 'Cancel' : '+ New Request'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
          <h2 className="font-semibold text-gray-800 mb-4">Create Blood Request</h2>
          {formError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{formError}</div>
          )}
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Patient ID *</label>
              <input required value={form.patientId}
                onChange={(e) => setForm({ ...form, patientId: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="PAT20260001" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Blood Group *</label>
              <select value={form.bloodGroup}
                onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
                {BLOOD_GROUPS.map((g) => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Units Requested *</label>
              <input required type="number" min="1" value={form.unitsRequested}
                onChange={(e) => setForm({ ...form, unitsRequested: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
                {REQUEST_PRIORITIES.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea rows={2} value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Optional clinical notes" />
            </div>
            <div className="col-span-2 flex justify-end gap-2">
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={saving}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-60">
                {saving ? 'Submitting…' : 'Submit Request'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex gap-3 flex-wrap">
        <select name="status" value={filters.status} onChange={handleFilterChange}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
          <option value="">All Statuses</option>
          {REQUEST_STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <input name="patientId" placeholder="Filter by Patient ID" value={filters.patientId} onChange={handleFilterChange}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 w-40" />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>
      )}

      <div className="space-y-2">
        {loading ? (
          <div className="text-center py-10 text-gray-400">Loading…</div>
        ) : requests.length === 0 ? (
          <div className="text-center py-10 text-gray-400">No blood requests found</div>
        ) : (
          requests.map((req) => (
            <div key={req.requestId}
              onClick={() => navigate(`/blood-requests/${req.requestId}`)}
              className="bg-white rounded-xl border border-gray-200 px-5 py-4 hover:shadow-sm cursor-pointer flex items-center gap-4">
              <span className="text-2xl">
                {req.status === 'FULFILLED' ? '✅' : req.status === 'REJECTED' ? '❌' : req.status === 'CANCELLED' ? '🚫' : '🔄'}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium text-gray-900">{req.requestId}</p>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">
                    {req.bloodGroup}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[req.status] || 'bg-gray-100 text-gray-600'}`}>
                    {req.status}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_BADGE[req.priority] || 'bg-gray-100 text-gray-600'}`}>
                    {req.priority}
                  </span>
                </div>
                <div className="flex gap-4 text-sm text-gray-500">
                  <span>Patient: {req.patientId}</span>
                  <span>Units: {req.unitsFulfilled}/{req.unitsRequested}</span>
                  <span>By: {req.createdBy}</span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  {req.createdAt?.replace('T', ' ').slice(0, 16)}
                  {req.fulfilledAt && ` · Fulfilled: ${req.fulfilledAt.replace('T', ' ').slice(0, 16)}`}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
