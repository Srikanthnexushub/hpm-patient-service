import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  getInvoice,
  issueInvoice,
  recordPayment,
  cancelInvoice,
  addInvoiceItem,
  removeInvoiceItem,
  PAYMENT_METHODS,
} from '../api/billingApi'

const STATUS_BADGE = {
  DRAFT: 'bg-gray-100 text-gray-700',
  ISSUED: 'bg-blue-100 text-blue-700',
  PARTIALLY_PAID: 'bg-yellow-100 text-yellow-700',
  PAID: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
}

const fmt = (amount) =>
  amount != null ? `$${Number(amount).toFixed(2)}` : '—'

export default function InvoiceDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [invoice, setInvoice] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')

  // Add item form
  const [showAddItem, setShowAddItem] = useState(false)
  const [itemForm, setItemForm] = useState({ description: '', quantity: '1', unitPrice: '' })
  const [addingItem, setAddingItem] = useState(false)

  // Payment form
  const [showPayment, setShowPayment] = useState(false)
  const [payForm, setPayForm] = useState({ amount: '', paymentMethod: 'CASH' })
  const [paying, setPaying] = useState(false)

  // Cancel form
  const [showCancel, setShowCancel] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelling, setCancelling] = useState(false)

  const fetchInvoice = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await getInvoice(id)
      setInvoice(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { fetchInvoice() }, [fetchInvoice])

  const handleIssue = async () => {
    setActionError('')
    try {
      const updated = await issueInvoice(id)
      setInvoice(updated)
    } catch (e) {
      setActionError(e.message)
    }
  }

  const handlePaySubmit = async (e) => {
    e.preventDefault()
    setPaying(true)
    setActionError('')
    try {
      const updated = await recordPayment(id, {
        amount: parseFloat(payForm.amount),
        paymentMethod: payForm.paymentMethod,
      })
      setInvoice(updated)
      setShowPayment(false)
      setPayForm({ amount: '', paymentMethod: 'CASH' })
    } catch (e) {
      setActionError(e.message)
    } finally {
      setPaying(false)
    }
  }

  const handleCancelSubmit = async (e) => {
    e.preventDefault()
    setCancelling(true)
    setActionError('')
    try {
      const updated = await cancelInvoice(id, cancelReason)
      setInvoice(updated)
      setShowCancel(false)
      setCancelReason('')
    } catch (e) {
      setActionError(e.message)
    } finally {
      setCancelling(false)
    }
  }

  const handleAddItem = async (e) => {
    e.preventDefault()
    setAddingItem(true)
    setActionError('')
    try {
      await addInvoiceItem(id, {
        description: itemForm.description,
        quantity: parseInt(itemForm.quantity, 10),
        unitPrice: parseFloat(itemForm.unitPrice),
      })
      setItemForm({ description: '', quantity: '1', unitPrice: '' })
      setShowAddItem(false)
      await fetchInvoice()
    } catch (e) {
      setActionError(e.message)
    } finally {
      setAddingItem(false)
    }
  }

  const handleRemoveItem = async (itemId) => {
    setActionError('')
    try {
      await removeInvoiceItem(id, itemId)
      await fetchInvoice()
    } catch (e) {
      setActionError(e.message)
    }
  }

  if (loading) return <div className="text-center py-10 text-gray-400">Loading…</div>
  if (error) return (
    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
      {error}
    </div>
  )
  if (!invoice) return null

  const isDraft = invoice.status === 'DRAFT'
  const canPay = invoice.status === 'ISSUED' || invoice.status === 'PARTIALLY_PAID'
  const canCancel = invoice.status !== 'PAID' && invoice.status !== 'CANCELLED'

  return (
    <div className="max-w-3xl">
      <button onClick={() => navigate('/invoices')} className="text-sm text-blue-600 hover:underline mb-4">
        ← Back to Invoices
      </button>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-mono">{invoice.invoiceId}</h1>
          <div className="flex items-center gap-3 mt-1">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[invoice.status]}`}>
              {invoice.status}
            </span>
            <span className="text-sm text-gray-500">Patient: {invoice.patientId}</span>
            <span className="text-sm text-gray-500">Doctor: {invoice.doctorId}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {isDraft && (
            <button
              onClick={handleIssue}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              Issue
            </button>
          )}
          {canPay && (
            <button
              onClick={() => setShowPayment(true)}
              className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
            >
              Record Payment
            </button>
          )}
          {canCancel && (
            <button
              onClick={() => setShowCancel(true)}
              className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {actionError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
          {actionError}
        </div>
      )}

      {/* Totals card */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4 grid grid-cols-4 gap-4">
        {[
          { label: 'Subtotal', value: fmt(invoice.subtotal) },
          { label: 'Tax', value: fmt(invoice.taxAmount) },
          { label: 'Discount', value: fmt(invoice.discountAmount) },
          { label: 'Total', value: fmt(invoice.totalAmount), bold: true },
          { label: 'Paid', value: fmt(invoice.paidAmount) },
          { label: 'Balance Due', value: fmt(invoice.balanceDue), bold: true },
          { label: 'Date', value: invoice.invoiceDate },
          { label: 'Due Date', value: invoice.dueDate },
        ].map(({ label, value, bold }) => (
          <div key={label}>
            <p className="text-xs text-gray-500 mb-0.5">{label}</p>
            <p className={`text-sm ${bold ? 'font-bold text-gray-900' : 'text-gray-700'}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Line items */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-4">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-700">Line Items</h2>
          {isDraft && (
            <button
              onClick={() => setShowAddItem(true)}
              className="text-sm text-blue-600 hover:underline"
            >
              + Add Item
            </button>
          )}
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {['Description', 'Qty', 'Unit Price', 'Amount', ...(isDraft ? [''] : [])].map((h) => (
                <th key={h} className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {invoice.items.length === 0 ? (
              <tr>
                <td colSpan={isDraft ? 5 : 4} className="text-center py-6 text-gray-400">
                  No items yet
                </td>
              </tr>
            ) : (
              invoice.items.map((item) => (
                <tr key={item.itemId}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{item.description}</p>
                    {item.serviceCode && (
                      <p className="text-xs text-gray-400">{item.serviceCode}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{item.quantity}</td>
                  <td className="px-4 py-3 text-gray-600">{fmt(item.unitPrice)}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{fmt(item.amount)}</td>
                  {isDraft && (
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleRemoveItem(item.itemId)}
                        className="text-red-500 hover:text-red-700 text-xs"
                      >
                        Remove
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Notes */}
      {invoice.notes && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-1">Notes</h2>
          <p className="text-sm text-gray-600">{invoice.notes}</p>
        </div>
      )}

      {/* Add item form */}
      {showAddItem && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <form
            onSubmit={handleAddItem}
            className="bg-white rounded-xl p-6 w-full max-w-sm space-y-4 shadow-xl"
          >
            <h3 className="font-semibold text-gray-900">Add Line Item</h3>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Description *</label>
              <input
                required
                value={itemForm.description}
                onChange={(e) => setItemForm((f) => ({ ...f, description: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Quantity</label>
                <input
                  type="number" min="1"
                  value={itemForm.quantity}
                  onChange={(e) => setItemForm((f) => ({ ...f, quantity: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Unit Price ($) *</label>
                <input
                  required type="number" min="0" step="0.01"
                  value={itemForm.unitPrice}
                  onChange={(e) => setItemForm((f) => ({ ...f, unitPrice: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={addingItem}
                className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {addingItem ? 'Adding…' : 'Add Item'}
              </button>
              <button
                type="button"
                onClick={() => setShowAddItem(false)}
                className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Payment form */}
      {showPayment && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <form
            onSubmit={handlePaySubmit}
            className="bg-white rounded-xl p-6 w-full max-w-sm space-y-4 shadow-xl"
          >
            <h3 className="font-semibold text-gray-900">Record Payment</h3>
            <p className="text-sm text-gray-500">Balance due: {fmt(invoice.balanceDue)}</p>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Amount ($) *</label>
              <input
                required type="number" min="0.01" step="0.01"
                value={payForm.amount}
                onChange={(e) => setPayForm((f) => ({ ...f, amount: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Payment Method</label>
              <select
                value={payForm.paymentMethod}
                onChange={(e) => setPayForm((f) => ({ ...f, paymentMethod: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={paying}
                className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {paying ? 'Recording…' : 'Record'}
              </button>
              <button
                type="button"
                onClick={() => setShowPayment(false)}
                className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Cancel form */}
      {showCancel && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <form
            onSubmit={handleCancelSubmit}
            className="bg-white rounded-xl p-6 w-full max-w-sm space-y-4 shadow-xl"
          >
            <h3 className="font-semibold text-gray-900">Cancel Invoice</h3>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Reason (optional)</label>
              <textarea
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={cancelling}
                className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {cancelling ? 'Cancelling…' : 'Confirm Cancel'}
              </button>
              <button
                type="button"
                onClick={() => setShowCancel(false)}
                className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium"
              >
                Back
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
