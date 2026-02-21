import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { listItems, createItem, ITEM_CATEGORIES } from '../api/inventoryApi'

const CATEGORY_BADGE = {
  MEDICINE:    'bg-blue-100 text-blue-700',
  SURGICAL:    'bg-purple-100 text-purple-700',
  DIAGNOSTIC:  'bg-teal-100 text-teal-700',
  CONSUMABLE:  'bg-yellow-100 text-yellow-700',
  EQUIPMENT:   'bg-orange-100 text-orange-700',
  LABORATORY:  'bg-cyan-100 text-cyan-700',
  OFFICE:      'bg-gray-100 text-gray-700',
}

const emptyForm = {
  name: '', category: 'CONSUMABLE', unit: '',
  initialStock: 0, minStockLevel: 10, unitPrice: '', description: '',
}

export default function ItemsPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState({ category: '', activeOnly: '', lowStockOnly: false })
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const fetchItems = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = {}
      if (filters.category) params.category = filters.category
      if (filters.activeOnly !== '') params.activeOnly = filters.activeOnly
      if (filters.lowStockOnly) params.lowStockOnly = true
      const data = await listItems(params)
      setItems(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => { fetchItems() }, [fetchItems])

  const handleFilterChange = (e) => {
    const { name, value, type, checked } = e.target
    setFilters((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setFormError('')
    try {
      await createItem({
        ...form,
        initialStock: Number(form.initialStock),
        minStockLevel: Number(form.minStockLevel),
        unitPrice: Number(form.unitPrice),
      })
      setForm(emptyForm)
      setShowForm(false)
      fetchItems()
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
          <h1 className="text-2xl font-bold text-gray-900">Inventory Items</h1>
          <p className="text-sm text-gray-500">{items.length} item{items.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          {showForm ? 'Cancel' : '+ New Item'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
          <h2 className="font-semibold text-gray-800 mb-4">Add Inventory Item</h2>
          {formError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{formError}</div>
          )}
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Item Name *</label>
              <input required value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. Surgical Gloves (L)" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
              <select value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {ITEM_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit *</label>
              <input required value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. box, vial, piece" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Initial Stock</label>
              <input type="number" min="0" value={form.initialStock}
                onChange={(e) => setForm({ ...form, initialStock: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Stock Level</label>
              <input type="number" min="0" value={form.minStockLevel}
                onChange={(e) => setForm({ ...form, minStockLevel: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price (₹) *</label>
              <input required type="number" min="0" step="0.01" value={form.unitPrice}
                onChange={(e) => setForm({ ...form, unitPrice: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Optional" />
            </div>
            <div className="col-span-2 flex justify-end gap-2">
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
                {saving ? 'Saving…' : 'Add Item'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex gap-3 flex-wrap items-center">
        <select name="category" value={filters.category} onChange={handleFilterChange}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">All Categories</option>
          {ITEM_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select name="activeOnly" value={filters.activeOnly} onChange={handleFilterChange}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Active + Inactive</option>
          <option value="true">Active Only</option>
          <option value="false">Inactive Only</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input type="checkbox" name="lowStockOnly" checked={filters.lowStockOnly} onChange={handleFilterChange}
            className="rounded" />
          Low Stock Only
        </label>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>
      )}

      <div className="space-y-2">
        {loading ? (
          <div className="text-center py-10 text-gray-400">Loading…</div>
        ) : items.length === 0 ? (
          <div className="text-center py-10 text-gray-400">No items found</div>
        ) : (
          items.map((item) => (
            <div key={item.itemId} onClick={() => navigate(`/items/${item.itemId}`)}
              className="bg-white rounded-xl border border-gray-200 px-5 py-4 hover:shadow-sm cursor-pointer flex items-center gap-4">
              <span className="text-2xl">📦</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium text-gray-900">{item.name}</p>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_BADGE[item.category] || 'bg-gray-100 text-gray-700'}`}>
                    {item.category}
                  </span>
                  {item.lowStock && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">LOW STOCK</span>
                  )}
                  {!item.active && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">Inactive</span>
                  )}
                </div>
                <div className="flex gap-4 text-sm text-gray-500">
                  <span>Stock: <span className={item.lowStock ? 'text-red-600 font-medium' : 'text-gray-700'}>{item.currentStock} {item.unit}</span></span>
                  <span>Min: {item.minStockLevel}</span>
                  <span>₹{item.unitPrice?.toFixed(2)} / {item.unit}</span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{item.itemId}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
