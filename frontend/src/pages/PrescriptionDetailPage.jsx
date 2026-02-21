import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  getPrescription,
  addPrescriptionItem,
  removePrescriptionItem,
  dispensePrescription,
  cancelPrescription,
  MEDICINE_CATEGORIES,
} from '../api/pharmacyApi'

const STATUS_BADGE = {
  PENDING:    'bg-yellow-100 text-yellow-700',
  DISPENSED:  'bg-green-100 text-green-700',
  CANCELLED:  'bg-gray-100 text-gray-500',
}

const BLANK_ITEM = {
  medicineId: '', dosage: '', frequency: '', durationDays: '', quantity: '',
}

export default function PrescriptionDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [rx, setRx] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [showAddItem, setShowAddItem] = useState(false)
  const [itemForm, setItemForm] = useState(BLANK_ITEM)
  const [addingItem, setAddingItem] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [showCancel, setShowCancel] = useState(false)

  const reload = () =>
    getPrescription(id).then(setRx).catch((e) => setError(e.message))

  useEffect(() => {
    getPrescription(id)
      .then(setRx)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  const handleAddItem = async (e) => {
    e.preventDefault()
    setAddingItem(true)
    setActionError('')
    try {
      await addPrescriptionItem(id, {
        medicineId: itemForm.medicineId.trim(),
        dosage: itemForm.dosage.trim(),
        frequency: itemForm.frequency.trim(),
        durationDays: parseInt(itemForm.durationDays, 10),
        quantity: parseInt(itemForm.quantity, 10),
      })
      setItemForm(BLANK_ITEM)
      setShowAddItem(false)
      await reload()
    } catch (err) {
      setActionError(err.message)
    } finally {
      setAddingItem(false)
    }
  }

  const handleRemoveItem = async (itemId) => {
    setActionError('')
    try {
      await removePrescriptionItem(id, itemId)
      await reload()
    } catch (err) {
      setActionError(err.message)
    }
  }

  const handleDispense = async () => {
    setActionError('')
    try {
      const updated = await dispensePrescription(id)
      setRx(updated)
    } catch (err) {
      setActionError(err.message)
    }
  }

  const handleCancel = async () => {
    setActionError('')
    try {
      const updated = await cancelPrescription(id, cancelReason)
      setRx(updated)
      setShowCancel(false)
    } catch (err) {
      setActionError(err.message)
    }
  }

  if (loading) return <div className="text-center py-20 text-gray-400">Loading…</div>
  if (error) return <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>
  if (!rx) return null

  const isPending = rx.status === 'PENDING'

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <button onClick={() => navigate('/prescriptions')} className="text-sm text-blue-600 hover:underline">
          ← Back to Prescriptions
        </button>
        <div className="flex items-center justify-between mt-2">
          <h1 className="text-2xl font-bold text-gray-900">{rx.prescriptionId}</h1>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_BADGE[rx.status]}`}>
            {rx.status}
          </span>
        </div>
      </div>

      {actionError && (
        <div className="bg-orange-50 border border-orange-200 text-orange-700 px-4 py-3 rounded-lg mb-4 text-sm">{actionError}</div>
      )}

      {/* Header info */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><p className="text-gray-500">Patient ID</p><p className="font-medium">{rx.patientId}</p></div>
          <div><p className="text-gray-500">Doctor ID</p><p className="font-medium">{rx.doctorId}</p></div>
          <div><p className="text-gray-500">Total Price</p><p className="font-semibold text-gray-900">₹{Number(rx.totalPrice).toFixed(2)}</p></div>
          <div><p className="text-gray-500">Created</p><p className="font-medium">{rx.createdAt?.replace('T', ' ').slice(0, 16)}</p></div>
          {rx.dispensedAt && <div><p className="text-gray-500">Dispensed</p><p className="font-medium">{rx.dispensedAt.replace('T', ' ').slice(0, 16)}</p></div>}
          {rx.cancelledAt && <div><p className="text-gray-500">Cancelled</p><p className="font-medium">{rx.cancelledAt.replace('T', ' ').slice(0, 16)}</p></div>}
          {rx.cancelReason && <div className="col-span-2"><p className="text-gray-500">Cancel Reason</p><p className="font-medium">{rx.cancelReason}</p></div>}
          {rx.notes && <div className="col-span-2"><p className="text-gray-500">Notes</p><p className="font-medium">{rx.notes}</p></div>}
        </div>
      </div>

      {/* Items */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
            Prescription Items ({rx.items?.length ?? 0})
          </h2>
          {isPending && (
            <button
              onClick={() => setShowAddItem((v) => !v)}
              className="px-3 py-1 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
            >
              {showAddItem ? 'Cancel' : '+ Add Item'}
            </button>
          )}
        </div>

        {showAddItem && (
          <form onSubmit={handleAddItem} className="bg-gray-50 rounded-lg p-4 mb-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Medicine ID *</label>
                <input
                  required value={itemForm.medicineId}
                  onChange={(e) => setItemForm((f) => ({ ...f, medicineId: e.target.value }))}
                  placeholder="e.g. MED20260001"
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Dosage *</label>
                <input
                  required value={itemForm.dosage}
                  onChange={(e) => setItemForm((f) => ({ ...f, dosage: e.target.value }))}
                  placeholder="e.g. 500mg"
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Frequency *</label>
                <input
                  required value={itemForm.frequency}
                  onChange={(e) => setItemForm((f) => ({ ...f, frequency: e.target.value }))}
                  placeholder="e.g. Twice daily"
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Duration (days) *</label>
                <input
                  required type="number" min="1" value={itemForm.durationDays}
                  onChange={(e) => setItemForm((f) => ({ ...f, durationDays: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Quantity *</label>
                <input
                  required type="number" min="1" value={itemForm.quantity}
                  onChange={(e) => setItemForm((f) => ({ ...f, quantity: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
            <button
              type="submit" disabled={addingItem}
              className="px-4 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-60"
            >
              {addingItem ? 'Adding…' : 'Add Item'}
            </button>
          </form>
        )}

        {!rx.items || rx.items.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-4">No items yet</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-3 py-2 text-gray-600 font-medium">Medicine</th>
                <th className="text-left px-3 py-2 text-gray-600 font-medium">Dosage</th>
                <th className="text-left px-3 py-2 text-gray-600 font-medium">Frequency</th>
                <th className="text-center px-3 py-2 text-gray-600 font-medium">Days</th>
                <th className="text-center px-3 py-2 text-gray-600 font-medium">Qty</th>
                <th className="text-right px-3 py-2 text-gray-600 font-medium">Total</th>
                {isPending && <th className="px-3 py-2"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rx.items.map((item) => (
                <tr key={item.itemId}>
                  <td className="px-3 py-2">
                    <p className="font-medium">{item.medicineName}</p>
                    <p className="text-xs text-gray-400">{item.medicineId}</p>
                  </td>
                  <td className="px-3 py-2 text-gray-600">{item.dosage}</td>
                  <td className="px-3 py-2 text-gray-600">{item.frequency}</td>
                  <td className="px-3 py-2 text-center text-gray-600">{item.durationDays}</td>
                  <td className="px-3 py-2 text-center text-gray-600">{item.quantity}</td>
                  <td className="px-3 py-2 text-right text-gray-700">₹{Number(item.totalPrice).toFixed(2)}</td>
                  {isPending && (
                    <td className="px-3 py-2">
                      <button
                        onClick={() => handleRemoveItem(item.itemId)}
                        className="text-xs text-red-500 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Actions */}
      {isPending && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Actions</h2>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={handleDispense}
              disabled={!rx.items || rx.items.length === 0}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-40"
            >
              Dispense Prescription
            </button>
            <button
              onClick={() => setShowCancel((v) => !v)}
              className="px-4 py-2 bg-red-50 text-red-700 rounded-lg text-sm font-medium hover:bg-red-100"
            >
              Cancel Prescription
            </button>
          </div>

          {showCancel && (
            <div className="mt-4 flex gap-3 items-center">
              <input
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Reason (optional)"
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleCancel}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
              >
                Confirm Cancel
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
