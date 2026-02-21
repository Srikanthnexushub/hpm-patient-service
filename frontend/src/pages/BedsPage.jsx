import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { listBeds, listWards, createBed, updateBedStatus, BED_STATUSES, BED_TYPES } from '../api/bedApi'

const STATUS_BADGE = {
  AVAILABLE:   'bg-green-100 text-green-700',
  OCCUPIED:    'bg-red-100 text-red-700',
  MAINTENANCE: 'bg-yellow-100 text-yellow-700',
}

const emptyForm = { wardId: '', bedNumber: '', bedType: 'GENERAL' }

export default function BedsPage() {
  const [searchParams] = useSearchParams()
  const preWardId = searchParams.get('wardId') || ''

  const [beds, setBeds] = useState([])
  const [wards, setWards] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [filterWard, setFilterWard] = useState(preWardId)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ ...emptyForm, wardId: preWardId })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    listWards().then((data) => setWards(Array.isArray(data) ? data : [])).catch(() => {})
  }, [])

  const fetchBeds = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = {}
      if (filterStatus !== 'ALL') params.status = filterStatus
      if (filterWard) params.wardId = filterWard
      const data = await listBeds(params)
      setBeds(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [filterStatus, filterWard])

  useEffect(() => { fetchBeds() }, [fetchBeds])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setFormError('')
    try {
      await createBed(form)
      setForm({ ...emptyForm, wardId: preWardId })
      setShowForm(false)
      fetchBeds()
    } catch (e) {
      setFormError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleStatusChange = async (bedId, status) => {
    try {
      await updateBedStatus(bedId, status)
      fetchBeds()
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Beds</h1>
          <p className="text-sm text-gray-500">{beds.length} bed{beds.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          {showForm ? 'Cancel' : '+ New Bed'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
          <h2 className="font-semibold text-gray-800 mb-4">Add Bed</h2>
          {formError && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{formError}</div>}
          <form onSubmit={handleSubmit} className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ward *</label>
              <select required value={form.wardId} onChange={(e) => setForm({ ...form, wardId: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select ward</option>
                {wards.filter((w) => w.isActive).map((w) => (
                  <option key={w.wardId} value={w.wardId}>{w.name} ({w.wardId})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bed Number *</label>
              <input required value={form.bedNumber} onChange={(e) => setForm({ ...form, bedNumber: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. B-101" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bed Type *</label>
              <select value={form.bedType} onChange={(e) => setForm({ ...form, bedType: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {BED_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="col-span-3 flex justify-end gap-2">
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
                {saving ? 'Adding…' : 'Add Bed'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex gap-3 flex-wrap">
        <select value={filterWard} onChange={(e) => setFilterWard(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">All Wards</option>
          {wards.map((w) => <option key={w.wardId} value={w.wardId}>{w.name}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          {BED_STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}

      <div className="space-y-2">
        {loading ? (
          <div className="text-center py-10 text-gray-400">Loading…</div>
        ) : beds.length === 0 ? (
          <div className="text-center py-10 text-gray-400">No beds found</div>
        ) : (
          beds.map((b) => (
            <div key={b.bedId}
              className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center gap-4">
              <span className="text-2xl">🛏️</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium text-gray-900">Bed {b.bedNumber}</p>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[b.status] || 'bg-gray-100 text-gray-700'}`}>
                    {b.status}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">{b.bedType}</span>
                </div>
                <div className="flex gap-4 text-sm text-gray-500">
                  <span>{b.wardName}</span>
                  <span className="text-gray-400">{b.bedId}</span>
                </div>
              </div>
              <div className="flex gap-2">
                {b.status === 'AVAILABLE' && (
                  <button onClick={() => handleStatusChange(b.bedId, 'MAINTENANCE')}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-yellow-50 text-yellow-600 hover:bg-yellow-100">
                    Maintenance
                  </button>
                )}
                {b.status === 'MAINTENANCE' && (
                  <button onClick={() => handleStatusChange(b.bedId, 'AVAILABLE')}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-green-50 text-green-600 hover:bg-green-100">
                    Mark Available
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
