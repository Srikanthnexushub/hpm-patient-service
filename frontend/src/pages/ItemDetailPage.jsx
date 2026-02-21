import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getItem, updateItem, deactivateItem, activateItem, ITEM_CATEGORIES } from '../api/inventoryApi'

export default function ItemDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [item, setItem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [toggling, setToggling] = useState(false)

  useEffect(() => {
    setLoading(true)
    getItem(id)
      .then((data) => {
        setItem(data)
        setForm({
          name: data.name,
          category: data.category,
          unit: data.unit,
          minStockLevel: data.minStockLevel,
          unitPrice: data.unitPrice,
          description: data.description || '',
        })
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setSaveError('')
    try {
      const updated = await updateItem(id, {
        ...form,
        minStockLevel: Number(form.minStockLevel),
        unitPrice: Number(form.unitPrice),
      })
      setItem(updated)
      setEditing(false)
    } catch (e) {
      setSaveError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async () => {
    setToggling(true)
    setError('')
    try {
      const updated = item.active ? await deactivateItem(id) : await activateItem(id)
      setItem(updated)
    } catch (e) {
      setError(e.message)
    } finally {
      setToggling(false)
    }
  }

  if (loading) return <div className="text-center py-20 text-gray-400">Loading…</div>
  if (error && !item) return (
    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>
  )

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/items')}
          className="text-gray-400 hover:text-gray-600 text-sm">← Back</button>
        <h1 className="text-2xl font-bold text-gray-900 flex-1">{item.name}</h1>
        {item.lowStock && (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">LOW STOCK</span>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-800">Item Details</h2>
          <div className="flex gap-2">
            <button onClick={handleToggle} disabled={toggling}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-60 ${
                item.active
                  ? 'bg-red-50 text-red-600 hover:bg-red-100'
                  : 'bg-green-50 text-green-600 hover:bg-green-100'
              }`}>
              {toggling ? '…' : item.active ? 'Deactivate' : 'Activate'}
            </button>
            <button onClick={() => { setEditing(!editing); setSaveError('') }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-600 hover:bg-blue-100">
              {editing ? 'Cancel Edit' : 'Edit'}
            </button>
          </div>
        </div>

        {editing ? (
          <form onSubmit={handleSave} className="grid grid-cols-2 gap-4">
            {saveError && (
              <div className="col-span-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{saveError}</div>
            )}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input required value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
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
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="col-span-2 flex justify-end gap-2">
              <button type="button" onClick={() => setEditing(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        ) : (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <dt className="text-gray-500">Item ID</dt>
              <dd className="font-mono font-medium text-gray-900">{item.itemId}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Category</dt>
              <dd className="text-gray-900">{item.category}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Unit</dt>
              <dd className="text-gray-900">{item.unit}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Unit Price</dt>
              <dd className="text-gray-900">₹{item.unitPrice?.toFixed(2)}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Current Stock</dt>
              <dd className={`font-medium ${item.lowStock ? 'text-red-600' : 'text-gray-900'}`}>
                {item.currentStock} {item.unit}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Min Stock Level</dt>
              <dd className="text-gray-900">{item.minStockLevel} {item.unit}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Status</dt>
              <dd className="text-gray-900">{item.active ? 'Active' : 'Inactive'}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Low Stock</dt>
              <dd className={item.lowStock ? 'text-red-600 font-medium' : 'text-gray-900'}>
                {item.lowStock ? 'Yes — reorder needed' : 'No'}
              </dd>
            </div>
            {item.description && (
              <div className="col-span-2">
                <dt className="text-gray-500">Description</dt>
                <dd className="text-gray-900 mt-0.5">{item.description}</dd>
              </div>
            )}
            <div>
              <dt className="text-gray-500">Created</dt>
              <dd className="text-gray-900">{item.createdAt?.replace('T', ' ').slice(0, 16)} by {item.createdBy}</dd>
            </div>
            {item.updatedAt && (
              <div>
                <dt className="text-gray-500">Updated</dt>
                <dd className="text-gray-900">{item.updatedAt?.replace('T', ' ').slice(0, 16)} by {item.updatedBy}</dd>
              </div>
            )}
          </dl>
        )}
      </div>

      <div className="flex gap-3">
        <button onClick={() => navigate(`/transactions?itemId=${item.itemId}`)}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
          View Transactions
        </button>
      </div>
    </div>
  )
}
