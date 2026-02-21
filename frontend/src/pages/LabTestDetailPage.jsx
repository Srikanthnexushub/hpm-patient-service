import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getLabTest, updateLabTest, deactivateLabTest, activateLabTest, TEST_CATEGORIES } from '../api/labApi'

export default function LabTestDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [test, setTest] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState('')

  const fetchTest = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await getLabTest(id)
      setTest(data)
      setForm({
        name: data.name,
        category: data.category,
        description: data.description || '',
        normalRange: data.normalRange || '',
        unit: data.unit || '',
        price: data.price,
        turnaroundHours: data.turnaroundHours,
      })
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchTest() }, [id])

  const handleUpdate = async (e) => {
    e.preventDefault()
    setSaving(true)
    setActionError('')
    try {
      const payload = {
        name: form.name,
        category: form.category,
        price: parseFloat(form.price),
        turnaroundHours: parseInt(form.turnaroundHours, 10),
      }
      if (form.description) payload.description = form.description
      if (form.normalRange) payload.normalRange = form.normalRange
      if (form.unit) payload.unit = form.unit
      const updated = await updateLabTest(id, payload)
      setTest(updated)
      setEditing(false)
    } catch (e) {
      setActionError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async () => {
    setActionError('')
    try {
      const updated = test.active ? await deactivateLabTest(id) : await activateLabTest(id)
      setTest(updated)
    } catch (e) {
      setActionError(e.message)
    }
  }

  if (loading) return <div className="text-center py-20 text-gray-400">Loading…</div>
  if (error) return <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
  if (!test) return null

  return (
    <div className="max-w-xl">
      <div className="mb-6">
        <button onClick={() => navigate('/lab-tests')} className="text-sm text-blue-600 hover:underline mb-2">← Back to Lab Tests</button>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">{test.name}</h1>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${test.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {test.active ? 'Active' : 'Inactive'}
          </span>
        </div>
        <p className="text-xs text-gray-400 mt-1">{test.testId}</p>
      </div>

      {actionError && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{actionError}</div>}

      {!editing ? (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><p className="text-gray-500">Category</p><p className="font-medium text-gray-900">{test.category}</p></div>
            <div><p className="text-gray-500">Price</p><p className="font-medium text-gray-900">₹{Number(test.price).toFixed(2)}</p></div>
            <div><p className="text-gray-500">Turnaround</p><p className="font-medium text-gray-900">{test.turnaroundHours} hrs</p></div>
            <div><p className="text-gray-500">Normal Range</p><p className="font-medium text-gray-900">{test.normalRange || '—'} {test.unit && `(${test.unit})`}</p></div>
            {test.description && (
              <div className="col-span-2"><p className="text-gray-500">Description</p><p className="font-medium text-gray-900">{test.description}</p></div>
            )}
            <div><p className="text-gray-500">Created</p><p className="font-medium text-gray-900">{test.createdAt?.replace('T', ' ').slice(0, 16)}</p></div>
            <div><p className="text-gray-500">Created By</p><p className="font-medium text-gray-900">{test.createdBy}</p></div>
          </div>
          <div className="flex gap-3 mt-5 pt-4 border-t border-gray-100">
            <button onClick={() => setEditing(true)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
              Edit
            </button>
            <button onClick={handleToggleActive}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${test.active ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>
              {test.active ? 'Deactivate' : 'Activate'}
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleUpdate} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Test Name *</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {TEST_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Normal Range</label>
              <input value={form.normalRange} onChange={(e) => setForm({ ...form, normalRange: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
              <input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹) *</label>
              <input type="number" min="0" step="0.01" required value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Turnaround (hrs)</label>
              <input type="number" min="1" value={form.turnaroundHours}
                onChange={(e) => setForm({ ...form, turnaroundHours: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setEditing(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
