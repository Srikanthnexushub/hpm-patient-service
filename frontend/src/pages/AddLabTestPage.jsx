import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { addLabTest, TEST_CATEGORIES } from '../api/labApi'

export default function AddLabTestPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '', description: '', category: '', normalRange: '', unit: '', price: '', turnaroundHours: '24',
  })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.category || !form.price) {
      setError('Name, category and price are required.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const payload = {
        name: form.name.trim(),
        category: form.category,
        price: parseFloat(form.price),
        turnaroundHours: parseInt(form.turnaroundHours, 10) || 24,
      }
      if (form.description.trim()) payload.description = form.description.trim()
      if (form.normalRange.trim()) payload.normalRange = form.normalRange.trim()
      if (form.unit.trim()) payload.unit = form.unit.trim()
      const test = await addLabTest(payload)
      navigate(`/lab-tests/${test.testId}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-6">
        <button onClick={() => navigate('/lab-tests')} className="text-sm text-blue-600 hover:underline">← Back to Lab Tests</button>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Add Lab Test</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Test Name *</label>
          <input name="name" value={form.name} onChange={handleChange} required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
          <select name="category" value={form.category} onChange={handleChange} required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Select category</option>
            {TEST_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea name="description" value={form.description} onChange={handleChange} rows={2}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Normal Range</label>
            <input name="normalRange" value={form.normalRange} onChange={handleChange} placeholder="e.g. 4.5-11.0"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
            <input name="unit" value={form.unit} onChange={handleChange} placeholder="e.g. x10^9/L"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹) *</label>
            <input name="price" type="number" min="0" step="0.01" value={form.price} onChange={handleChange} required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Turnaround (hrs)</label>
            <input name="turnaroundHours" type="number" min="1" value={form.turnaroundHours} onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={submitting}
            className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
            {submitting ? 'Adding…' : 'Add Test'}
          </button>
          <button type="button" onClick={() => navigate('/lab-tests')}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
