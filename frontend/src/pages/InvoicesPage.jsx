import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { listInvoices, INVOICE_STATUSES } from '../api/billingApi'

const STATUS_BADGE = {
  DRAFT: 'bg-gray-100 text-gray-700',
  ISSUED: 'bg-blue-100 text-blue-700',
  PARTIALLY_PAID: 'bg-yellow-100 text-yellow-700',
  PAID: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
}

export default function InvoicesPage() {
  const navigate = useNavigate()
  const [invoices, setInvoices] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [filters, setFilters] = useState({
    patientId: '',
    status: 'ALL',
  })

  const fetchInvoices = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = { page, size: 20 }
      if (filters.patientId) params.patientId = filters.patientId
      if (filters.status !== 'ALL') params.status = filters.status
      const data = await listInvoices(params)
      setInvoices(data.content)
      setTotal(data.totalElements)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [page, filters])

  useEffect(() => { fetchInvoices() }, [fetchInvoices])

  const handleFilterChange = (e) => {
    setFilters((f) => ({ ...f, [e.target.name]: e.target.value }))
    setPage(0)
  }

  const fmt = (amount) =>
    amount != null ? `$${Number(amount).toFixed(2)}` : '—'

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="text-sm text-gray-500">{total} total invoice{total !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => navigate('/invoices/new')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          + New Invoice
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex gap-4 flex-wrap">
        <input
          name="patientId"
          placeholder="Patient ID"
          value={filters.patientId}
          onChange={handleFilterChange}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-44"
        />
        <select
          name="status"
          value={filters.status}
          onChange={handleFilterChange}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {INVOICE_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Invoice ID', 'Patient ID', 'Doctor ID', 'Date', 'Total', 'Paid', 'Balance', 'Status'].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={8} className="text-center py-10 text-gray-400">Loading…</td></tr>
            ) : invoices.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-10 text-gray-400">No invoices found</td></tr>
            ) : (
              invoices.map((inv) => (
                <tr
                  key={inv.invoiceId}
                  onClick={() => navigate(`/invoices/${inv.invoiceId}`)}
                  className="hover:bg-gray-50 cursor-pointer"
                >
                  <td className="px-4 py-3 font-mono text-blue-600 font-medium">
                    {inv.invoiceId}
                  </td>
                  <td className="px-4 py-3 font-mono text-gray-600">{inv.patientId}</td>
                  <td className="px-4 py-3 text-gray-600">{inv.doctorId}</td>
                  <td className="px-4 py-3 text-gray-600">{inv.invoiceDate}</td>
                  <td className="px-4 py-3 text-gray-900 font-medium">{fmt(inv.totalAmount)}</td>
                  <td className="px-4 py-3 text-gray-600">{fmt(inv.paidAmount)}</td>
                  <td className="px-4 py-3 text-gray-600">{fmt(inv.balanceDue)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[inv.status] || 'bg-gray-100 text-gray-600'}`}>
                      {inv.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > 20 && (
        <div className="flex justify-center gap-2 mt-4">
          <button
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1 rounded border text-sm disabled:opacity-40"
          >
            Prev
          </button>
          <span className="px-3 py-1 text-sm text-gray-600">Page {page + 1}</span>
          <button
            disabled={(page + 1) * 20 >= total}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1 rounded border text-sm disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
