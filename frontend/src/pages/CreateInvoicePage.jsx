import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createInvoice } from '../api/billingApi'

export default function CreateInvoicePage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    patientId: '',
    doctorId: '',
    appointmentId: '',
    taxAmount: '',
    discountAmount: '',
    notes: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const payload = {
        patientId: form.patientId,
        doctorId: form.doctorId,
        appointmentId: form.appointmentId || undefined,
        taxAmount: form.taxAmount ? parseFloat(form.taxAmount) : undefined,
        discountAmount: form.discountAmount ? parseFloat(form.discountAmount) : undefined,
        notes: form.notes || undefined,
      }
      const invoice = await createInvoice(payload)
      navigate(`/invoices/${invoice.invoiceId}`)
    } catch (e) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-xl">
      <div className="mb-6">
        <button onClick={() => navigate('/invoices')} className="text-sm text-blue-600 hover:underline mb-2">
          ← Back to Invoices
        </button>
        <h1 className="text-2xl font-bold text-gray-900">New Invoice</h1>
        <p className="text-sm text-gray-500">Creates a DRAFT invoice. Add items after creation.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Patient ID *</label>
          <input
            name="patientId"
            value={form.patientId}
            onChange={handleChange}
            required
            placeholder="e.g. P2026001"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Doctor ID *</label>
          <input
            name="doctorId"
            value={form.doctorId}
            onChange={handleChange}
            required
            placeholder="e.g. DR2026001"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Appointment ID</label>
          <input
            name="appointmentId"
            value={form.appointmentId}
            onChange={handleChange}
            placeholder="Optional"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tax Amount ($)</label>
            <input
              name="taxAmount"
              type="number"
              min="0"
              step="0.01"
              value={form.taxAmount}
              onChange={handleChange}
              placeholder="0.00"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Discount ($)</label>
            <input
              name="discountAmount"
              type="number"
              min="0"
              step="0.01"
              value={form.discountAmount}
              onChange={handleChange}
              placeholder="0.00"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            name="notes"
            value={form.notes}
            onChange={handleChange}
            rows={3}
            placeholder="Optional notes"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? 'Creating…' : 'Create Invoice'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/invoices')}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
