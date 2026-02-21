import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  listMedicines,
  adjustStock,
  deactivateMedicine,
  activateMedicine,
  MEDICINE_CATEGORIES,
} from '../api/pharmacyApi'

const STATUS_BADGE = {
  true:  'bg-green-100 text-green-700',
  false: 'bg-gray-100 text-gray-500',
}

export default function MedicinesPage() {
  const navigate = useNavigate()
  const [medicines, setMedicines] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [stockInput, setStockInput] = useState({}) // medicineId -> qty string

  const [filters, setFilters] = useState({
    name: '',
    category: '',
    isActive: '',
    lowStock: '',
  })

  const fetchMedicines = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = { page, size: 20 }
      if (filters.name) params.name = filters.name
      if (filters.category) params.category = filters.category
      if (filters.isActive !== '') params.isActive = filters.isActive
      if (filters.lowStock !== '') params.lowStock = filters.lowStock
      const data = await listMedicines(params)
      setMedicines(data.content)
      setTotal(data.totalElements)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [page, filters])

  useEffect(() => { fetchMedicines() }, [fetchMedicines])

  const handleFilterChange = (e) => {
    setFilters((f) => ({ ...f, [e.target.name]: e.target.value }))
    setPage(0)
  }

  const handleAdjustStock = async (e, id) => {
    e.stopPropagation()
    const qty = parseInt(stockInput[id] ?? '', 10)
    if (isNaN(qty) || qty < 0) {
      setActionError('Enter a valid quantity.')
      return
    }
    setActionError('')
    try {
      await adjustStock(id, qty)
      setStockInput((s) => ({ ...s, [id]: '' }))
      await fetchMedicines()
    } catch (err) {
      setActionError(err.message)
    }
  }

  const handleToggleActive = async (e, med) => {
    e.stopPropagation()
    setActionError('')
    try {
      if (med.active) {
        await deactivateMedicine(med.medicineId)
      } else {
        await activateMedicine(med.medicineId)
      }
      await fetchMedicines()
    } catch (err) {
      setActionError(err.message)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Medicines</h1>
          <p className="text-sm text-gray-500">{total} total medicine{total !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => navigate('/medicines/new')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          + Add Medicine
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex gap-3 flex-wrap">
        <input
          name="name"
          placeholder="Search by name"
          value={filters.name}
          onChange={handleFilterChange}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-44"
        />
        <select
          name="category"
          value={filters.category}
          onChange={handleFilterChange}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Categories</option>
          {MEDICINE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select
          name="isActive"
          value={filters.isActive}
          onChange={handleFilterChange}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
        <select
          name="lowStock"
          value={filters.lowStock}
          onChange={handleFilterChange}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Any Stock</option>
          <option value="true">Low Stock Only</option>
        </select>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>
      )}
      {actionError && (
        <div className="bg-orange-50 border border-orange-200 text-orange-700 px-4 py-3 rounded-lg mb-4 text-sm">{actionError}</div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="text-center py-10 text-gray-400">Loading…</div>
        ) : medicines.length === 0 ? (
          <div className="text-center py-10 text-gray-400">No medicines found</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Medicine</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Category</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Price</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Stock</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {medicines.map((med) => (
                <tr
                  key={med.medicineId}
                  onClick={() => navigate(`/medicines/${med.medicineId}`)}
                  className="hover:bg-gray-50 cursor-pointer"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{med.name}</p>
                    <p className="text-xs text-gray-400">{med.medicineId}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{med.category}</td>
                  <td className="px-4 py-3 text-right text-gray-700">₹{Number(med.unitPrice).toFixed(2)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={med.lowStock ? 'text-red-600 font-semibold' : 'text-gray-700'}>
                      {med.stockQuantity}
                    </span>
                    {med.lowStock && <span className="ml-1 text-xs text-red-500">⚠ low</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[med.active]}`}>
                      {med.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-2">
                      <input
                        type="number"
                        min="0"
                        placeholder="qty"
                        value={stockInput[med.medicineId] ?? ''}
                        onChange={(e) =>
                          setStockInput((s) => ({ ...s, [med.medicineId]: e.target.value }))
                        }
                        className="border border-gray-300 rounded px-2 py-1 w-16 text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <button
                        onClick={(e) => handleAdjustStock(e, med.medicineId)}
                        className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
                      >
                        Set Stock
                      </button>
                      <button
                        onClick={(e) => handleToggleActive(e, med)}
                        className={`px-2 py-1 text-xs rounded ${
                          med.active
                            ? 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                            : 'bg-green-50 text-green-700 hover:bg-green-100'
                        }`}
                      >
                        {med.active ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {total > 20 && (
        <div className="flex justify-center gap-2 mt-4">
          <button disabled={page === 0} onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1 rounded border text-sm disabled:opacity-40">Prev</button>
          <span className="px-3 py-1 text-sm text-gray-600">Page {page + 1}</span>
          <button disabled={(page + 1) * 20 >= total} onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1 rounded border text-sm disabled:opacity-40">Next</button>
        </div>
      )}
    </div>
  )
}
