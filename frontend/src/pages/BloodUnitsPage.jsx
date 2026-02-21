import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { listUnits, registerUnit, BLOOD_GROUPS, UNIT_STATUSES } from '../api/bloodBankApi'

const STATUS_BADGE = {
  AVAILABLE: 'bg-green-100 text-green-700',
  USED:      'bg-gray-100 text-gray-600',
  EXPIRED:   'bg-red-100 text-red-600',
  DISCARDED: 'bg-yellow-100 text-yellow-700',
}

const emptyForm = {
  bloodGroup: 'A_POS',
  donorName: '',
  donorAge: '',
  donorPhone: '',
  donatedAt: new Date().toISOString().slice(0, 10),
}

export default function BloodUnitsPage() {
  const navigate = useNavigate()
  const [units, setUnits] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState({ bloodGroup: '', status: '' })
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const fetchUnits = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = {}
      if (filters.bloodGroup) params.bloodGroup = filters.bloodGroup
      if (filters.status) params.status = filters.status
      const data = await listUnits(params)
      setUnits(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => { fetchUnits() }, [fetchUnits])

  const handleFilterChange = (e) =>
    setFilters((f) => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setFormError('')
    try {
      await registerUnit({ ...form, donorAge: Number(form.donorAge) })
      setForm(emptyForm)
      setShowForm(false)
      fetchUnits()
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
          <h1 className="text-2xl font-bold text-gray-900">Blood Units</h1>
          <p className="text-sm text-gray-500">{units.length} unit{units.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
        >
          {showForm ? 'Cancel' : '+ Register Donation'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
          <h2 className="font-semibold text-gray-800 mb-4">Register Blood Donation</h2>
          {formError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{formError}</div>
          )}
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Blood Group *</label>
              <select value={form.bloodGroup}
                onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
                {BLOOD_GROUPS.map((g) => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Donor Name *</label>
              <input required value={form.donorName}
                onChange={(e) => setForm({ ...form, donorName: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Full name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Donor Age *</label>
              <input required type="number" min="18" max="65" value={form.donorAge}
                onChange={(e) => setForm({ ...form, donorAge: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="18–65" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Donor Phone *</label>
              <input required value={form.donorPhone}
                onChange={(e) => setForm({ ...form, donorPhone: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="+91-9876543210" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Donation Date *</label>
              <input required type="date" value={form.donatedAt}
                onChange={(e) => setForm({ ...form, donatedAt: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
            </div>
            <div className="flex items-end">
              <p className="text-xs text-gray-500">Unit expires 42 days after donation date.</p>
            </div>
            <div className="col-span-2 flex justify-end gap-2">
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={saving}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-60">
                {saving ? 'Registering…' : 'Register Unit'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex gap-3 flex-wrap">
        <select name="bloodGroup" value={filters.bloodGroup} onChange={handleFilterChange}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
          <option value="">All Blood Groups</option>
          {BLOOD_GROUPS.map((g) => <option key={g}>{g}</option>)}
        </select>
        <select name="status" value={filters.status} onChange={handleFilterChange}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
          <option value="">All Statuses</option>
          {UNIT_STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>
      )}

      <div className="space-y-2">
        {loading ? (
          <div className="text-center py-10 text-gray-400">Loading…</div>
        ) : units.length === 0 ? (
          <div className="text-center py-10 text-gray-400">No blood units found</div>
        ) : (
          units.map((unit) => (
            <div key={unit.unitId}
              onClick={() => navigate(`/blood-units/${unit.unitId}`)}
              className="bg-white rounded-xl border border-gray-200 px-5 py-4 hover:shadow-sm cursor-pointer flex items-center gap-4">
              <span className="text-2xl">🩸</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium text-gray-900">{unit.unitId}</p>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">
                    {unit.bloodGroup}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[unit.status] || 'bg-gray-100 text-gray-600'}`}>
                    {unit.status}
                  </span>
                </div>
                <div className="flex gap-4 text-sm text-gray-500">
                  <span>Donor: {unit.donorName}, {unit.donorAge}y</span>
                  <span>Donated: {unit.donatedAt}</span>
                  <span>Expires: {unit.expiresAt}</span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">Registered by {unit.createdBy}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
