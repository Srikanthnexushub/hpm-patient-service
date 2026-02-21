import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { listWards, createWard, deactivateWard, activateWard, WARD_TYPES } from '../api/bedApi'

const TYPE_BADGE = {
  GENERAL: 'bg-blue-100 text-blue-700',
  ICU: 'bg-red-100 text-red-700',
  EMERGENCY: 'bg-orange-100 text-orange-700',
  MATERNITY: 'bg-pink-100 text-pink-700',
  PEDIATRIC: 'bg-yellow-100 text-yellow-700',
  SURGICAL: 'bg-purple-100 text-purple-700',
  ORTHOPEDIC: 'bg-teal-100 text-teal-700',
}

const emptyForm = { name: '', wardType: 'GENERAL', floor: 1, description: '' }

export default function WardsPage() {
  const navigate = useNavigate()
  const [wards, setWards] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [filterType, setFilterType] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const fetchWards = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = {}
      if (filterType) params.wardType = filterType
      const data = await listWards(params)
      setWards(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [filterType])

  useEffect(() => { fetchWards() }, [fetchWards])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setFormError('')
    try {
      await createWard({ ...form, floor: Number(form.floor) })
      setForm(emptyForm)
      setShowForm(false)
      fetchWards()
    } catch (e) {
      setFormError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (ward) => {
    try {
      if (ward.isActive) {
        await deactivateWard(ward.wardId)
      } else {
        await activateWard(ward.wardId)
      }
      fetchWards()
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Wards</h1>
          <p className="text-sm text-gray-500">{wards.length} ward{wards.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          {showForm ? 'Cancel' : '+ New Ward'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
          <h2 className="font-semibold text-gray-800 mb-4">Create Ward</h2>
          {formError && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{formError}</div>}
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ward Name *</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. General Ward A" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ward Type *</label>
              <select value={form.wardType} onChange={(e) => setForm({ ...form, wardType: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {WARD_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Floor</label>
              <input type="number" min="1" value={form.floor} onChange={(e) => setForm({ ...form, floor: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Optional description" />
            </div>
            <div className="col-span-2 flex justify-end gap-2">
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
                {saving ? 'Creating…' : 'Create Ward'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">All Types</option>
          {WARD_TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}

      <div className="space-y-2">
        {loading ? (
          <div className="text-center py-10 text-gray-400">Loading…</div>
        ) : wards.length === 0 ? (
          <div className="text-center py-10 text-gray-400">No wards found</div>
        ) : (
          wards.map((w) => (
            <div key={w.wardId}
              className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center gap-4">
              <span className="text-2xl">🏠</span>
              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/beds?wardId=${w.wardId}`)}>
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium text-gray-900">{w.name}</p>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_BADGE[w.wardType] || 'bg-gray-100 text-gray-700'}`}>
                    {w.wardType}
                  </span>
                  {!w.isActive && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">Inactive</span>
                  )}
                </div>
                <div className="flex gap-4 text-sm text-gray-500">
                  <span>Floor {w.floor}</span>
                  <span>{w.totalBeds} total beds</span>
                  <span className="text-green-600">{w.availableBeds} available</span>
                  <span className="text-red-500">{w.occupiedBeds} occupied</span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{w.wardId}</p>
              </div>
              <button
                onClick={() => handleToggle(w)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium ${w.isActive ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
              >
                {w.isActive ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
