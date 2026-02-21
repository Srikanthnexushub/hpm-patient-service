import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { listTransactions, recordTransaction, TRANSACTION_TYPES } from '../api/inventoryApi'

const TYPE_BADGE = {
  IN:         'bg-green-100 text-green-700',
  OUT:        'bg-red-100 text-red-700',
  ADJUSTMENT: 'bg-blue-100 text-blue-700',
}

const emptyForm = {
  itemId: '', transactionType: 'IN', quantity: 1,
  referenceId: '', notes: '',
}

export default function TransactionsPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState({
    itemId: searchParams.get('itemId') || '',
    type: '',
  })
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ ...emptyForm, itemId: searchParams.get('itemId') || '' })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const fetchTransactions = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = {}
      if (filters.itemId) params.itemId = filters.itemId
      if (filters.type) params.type = filters.type
      const data = await listTransactions(params)
      setTransactions(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => { fetchTransactions() }, [fetchTransactions])

  const handleFilterChange = (e) =>
    setFilters((f) => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setFormError('')
    try {
      await recordTransaction({ ...form, quantity: Number(form.quantity) })
      setForm(emptyForm)
      setShowForm(false)
      fetchTransactions()
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
          <h1 className="text-2xl font-bold text-gray-900">Stock Transactions</h1>
          <p className="text-sm text-gray-500">{transactions.length} record{transactions.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          {showForm ? 'Cancel' : '+ Record Transaction'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
          <h2 className="font-semibold text-gray-800 mb-4">Record Stock Transaction</h2>
          {formError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{formError}</div>
          )}
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Item ID *</label>
              <input required value={form.itemId}
                onChange={(e) => setForm({ ...form, itemId: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="ITM20260001" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Transaction Type *</label>
              <select value={form.transactionType}
                onChange={(e) => setForm({ ...form, transactionType: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {TRANSACTION_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantity *
                {form.transactionType === 'ADJUSTMENT' && (
                  <span className="ml-1 text-xs text-blue-600">(sets absolute stock level)</span>
                )}
              </label>
              <input required type="number" min="1" value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reference ID</label>
              <input value={form.referenceId}
                onChange={(e) => setForm({ ...form, referenceId: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. order ID, ward name" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea rows={2} value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Optional notes" />
            </div>
            <div className="col-span-2 flex justify-end gap-2">
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
                {saving ? 'Recording…' : 'Record Transaction'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex gap-3 flex-wrap">
        <input name="itemId" placeholder="Filter by Item ID" value={filters.itemId} onChange={handleFilterChange}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-36" />
        <select name="type" value={filters.type} onChange={handleFilterChange}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">All Types</option>
          {TRANSACTION_TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>
      )}

      <div className="space-y-2">
        {loading ? (
          <div className="text-center py-10 text-gray-400">Loading…</div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-10 text-gray-400">No transactions found</div>
        ) : (
          transactions.map((tx) => (
            <div key={tx.transactionId}
              className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center gap-4">
              <span className="text-2xl">
                {tx.transactionType === 'IN' ? '📥' : tx.transactionType === 'OUT' ? '📤' : '⚙️'}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium text-gray-900">{tx.transactionId}</p>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_BADGE[tx.transactionType] || 'bg-gray-100 text-gray-700'}`}>
                    {tx.transactionType}
                  </span>
                </div>
                <div className="flex gap-4 text-sm text-gray-500">
                  <span
                    className="text-blue-600 cursor-pointer hover:underline"
                    onClick={() => navigate(`/items/${tx.itemId}`)}
                  >
                    {tx.itemId}
                  </span>
                  <span>Qty: {tx.quantity}</span>
                  <span>{tx.stockBefore} → {tx.stockAfter}</span>
                  {tx.referenceId && <span>Ref: {tx.referenceId}</span>}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  {tx.transactedAt?.replace('T', ' ').slice(0, 16)} by {tx.createdBy}
                  {tx.notes && ` · ${tx.notes}`}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
