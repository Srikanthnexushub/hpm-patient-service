import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { addMedicine, MEDICINE_CATEGORIES } from '../api/pharmacyApi'

export default function AddMedicinePage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '',
    genericName: '',
    category: '',
    manufacturer: '',
    unitPrice: '',
    stockQuantity: '',
    reorderLevel: '',
    description: '',
  })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.category || !form.unitPrice) {
      setError('Name, category and unit price are required.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const payload = {
        name: form.name.trim(),
        category: form.category,
        unitPrice: parseFloat(form.unitPrice),
      }
      if (form.genericName.trim()) payload.genericName = form.genericName.trim()
      if (form.manufacturer.trim()) payload.manufacturer = form.manufacturer.trim()
      if (form.stockQuantity !== '') payload.stockQuantity = parseInt(form.stockQuantity, 10)
      if (form.reorderLevel !== '') payload.reorderLevel = parseInt(form.reorderLevel, 10)
      if (form.description.trim()) payload.description = form.description.trim()

      const medicine = await addMedicine(payload)
      navigate(`/medicines/${medicine.medicineId}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-6">
        <button onClick={() => navigate('/medicines')} className="text-sm text-blue-600 hover:underline">
          ← Back to Medicines
        </button>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Add Medicine</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
          <input
            name="name" value={form.name} onChange={handleChange} required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Generic Name</label>
          <input
            name="genericName" value={form.genericName} onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
          <select
            name="category" value={form.category} onChange={handleChange} required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select category</option>
            {MEDICINE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Manufacturer</label>
          <input
            name="manufacturer" value={form.manufacturer} onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price (₹) *</label>
            <input
              name="unitPrice" type="number" min="0" step="0.01" value={form.unitPrice} onChange={handleChange} required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Initial Stock</label>
            <input
              name="stockQuantity" type="number" min="0" value={form.stockQuantity} onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reorder Level</label>
            <input
              name="reorderLevel" type="number" min="0" value={form.reorderLevel} onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            name="description" value={form.description} onChange={handleChange} rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit" disabled={submitting}
            className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
          >
            {submitting ? 'Adding…' : 'Add Medicine'}
          </button>
          <button
            type="button" onClick={() => navigate('/medicines')}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
