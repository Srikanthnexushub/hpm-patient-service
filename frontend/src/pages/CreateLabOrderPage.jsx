import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createLabOrder } from '../api/labApi'

export default function CreateLabOrderPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ patientId: '', doctorId: '', notes: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.patientId.trim() || !form.doctorId.trim()) {
      setError('Patient ID and Doctor ID are required.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const payload = { patientId: form.patientId.trim(), doctorId: form.doctorId.trim() }
      if (form.notes.trim()) payload.notes = form.notes.trim()
      const order = await createLabOrder(payload)
      navigate(`/lab-orders/${order.orderId}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-6">
        <button onClick={() => navigate('/lab-orders')} className="text-sm text-blue-600 hover:underline">← Back to Lab Orders</button>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">New Lab Order</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Patient ID *</label>
          <input name="patientId" value={form.patientId} onChange={handleChange} required placeholder="e.g. P2026001"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Doctor ID *</label>
          <input name="doctorId" value={form.doctorId} onChange={handleChange} required placeholder="e.g. DR2026001"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea name="notes" value={form.notes} onChange={handleChange} rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={submitting}
            className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
            {submitting ? 'Creating…' : 'Create Lab Order'}
          </button>
          <button type="button" onClick={() => navigate('/lab-orders')}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
