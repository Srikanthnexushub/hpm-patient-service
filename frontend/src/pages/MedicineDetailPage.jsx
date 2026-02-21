import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  getMedicine,
  adjustStock,
  deactivateMedicine,
  activateMedicine,
} from '../api/pharmacyApi'

export default function MedicineDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [medicine, setMedicine] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [stockQty, setStockQty] = useState('')
  const [adjusting, setAdjusting] = useState(false)

  useEffect(() => {
    getMedicine(id)
      .then(setMedicine)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  const handleAdjustStock = async () => {
    const qty = parseInt(stockQty, 10)
    if (isNaN(qty) || qty < 0) { setActionError('Enter a valid quantity.'); return }
    setAdjusting(true)
    setActionError('')
    try {
      const updated = await adjustStock(id, qty)
      setMedicine(updated)
      setStockQty('')
    } catch (e) {
      setActionError(e.message)
    } finally {
      setAdjusting(false)
    }
  }

  const handleToggleActive = async () => {
    setActionError('')
    try {
      const updated = medicine.active
        ? await deactivateMedicine(id)
        : await activateMedicine(id)
      setMedicine(updated)
    } catch (e) {
      setActionError(e.message)
    }
  }

  if (loading) return <div className="text-center py-20 text-gray-400">Loading…</div>
  if (error) return <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>
  if (!medicine) return null

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <button onClick={() => navigate('/medicines')} className="text-sm text-blue-600 hover:underline">
          ← Back to Medicines
        </button>
        <div className="flex items-center justify-between mt-2">
          <h1 className="text-2xl font-bold text-gray-900">{medicine.name}</h1>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            medicine.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
          }`}>
            {medicine.active ? 'Active' : 'Inactive'}
          </span>
        </div>
        <p className="text-sm text-gray-500 mt-1">{medicine.medicineId}</p>
      </div>

      {actionError && (
        <div className="bg-orange-50 border border-orange-200 text-orange-700 px-4 py-3 rounded-lg mb-4 text-sm">{actionError}</div>
      )}

      {/* Details */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Medicine Details</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Generic Name</p>
            <p className="font-medium text-gray-900">{medicine.genericName || '—'}</p>
          </div>
          <div>
            <p className="text-gray-500">Category</p>
            <p className="font-medium text-gray-900">{medicine.category}</p>
          </div>
          <div>
            <p className="text-gray-500">Manufacturer</p>
            <p className="font-medium text-gray-900">{medicine.manufacturer || '—'}</p>
          </div>
          <div>
            <p className="text-gray-500">Unit Price</p>
            <p className="font-medium text-gray-900">₹{Number(medicine.unitPrice).toFixed(2)}</p>
          </div>
          <div>
            <p className="text-gray-500">Stock Quantity</p>
            <p className={`font-semibold ${medicine.lowStock ? 'text-red-600' : 'text-gray-900'}`}>
              {medicine.stockQuantity}
              {medicine.lowStock && <span className="ml-2 text-xs text-red-500">⚠ Low stock</span>}
            </p>
          </div>
          <div>
            <p className="text-gray-500">Reorder Level</p>
            <p className="font-medium text-gray-900">{medicine.reorderLevel}</p>
          </div>
          {medicine.description && (
            <div className="col-span-2">
              <p className="text-gray-500">Description</p>
              <p className="font-medium text-gray-900">{medicine.description}</p>
            </div>
          )}
          <div>
            <p className="text-gray-500">Created By</p>
            <p className="font-medium text-gray-900">{medicine.createdBy}</p>
          </div>
          <div>
            <p className="text-gray-500">Created At</p>
            <p className="font-medium text-gray-900">{medicine.createdAt?.replace('T', ' ').slice(0, 16)}</p>
          </div>
        </div>
      </div>

      {/* Stock Adjustment */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Adjust Stock</h2>
        <div className="flex gap-3 items-center">
          <input
            type="number" min="0" placeholder="New quantity"
            value={stockQty} onChange={(e) => setStockQty(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-36 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleAdjustStock} disabled={adjusting}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
          >
            {adjusting ? 'Updating…' : 'Set Stock'}
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Actions</h2>
        <button
          onClick={handleToggleActive}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            medicine.active
              ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              : 'bg-green-100 text-green-700 hover:bg-green-200'
          }`}
        >
          {medicine.active ? 'Deactivate Medicine' : 'Activate Medicine'}
        </button>
      </div>
    </div>
  )
}
