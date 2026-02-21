import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  getLabOrder, addLabOrderItem, removeLabOrderItem,
  collectSample, startProcessing, recordResult, cancelLabOrder,
} from '../api/labApi'

const STATUS_BADGE = {
  ORDERED:          'bg-blue-100 text-blue-700',
  SAMPLE_COLLECTED: 'bg-yellow-100 text-yellow-700',
  IN_PROGRESS:      'bg-orange-100 text-orange-700',
  COMPLETED:        'bg-green-100 text-green-700',
  CANCELLED:        'bg-gray-100 text-gray-500',
}

const ITEM_BADGE = {
  PENDING:    'bg-gray-100 text-gray-500',
  COLLECTED:  'bg-yellow-100 text-yellow-700',
  IN_PROGRESS:'bg-orange-100 text-orange-700',
  COMPLETED:  'bg-green-100 text-green-700',
}

export default function LabOrderDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')

  const [newTestId, setNewTestId] = useState('')
  const [addingItem, setAddingItem] = useState(false)

  const [resultInputs, setResultInputs] = useState({}) // itemId -> {result, remarks}
  const [recordingItemId, setRecordingItemId] = useState(null)

  const [cancelReason, setCancelReason] = useState('')
  const [showCancel, setShowCancel] = useState(false)

  const reload = () => getLabOrder(id).then(setOrder).catch((e) => setActionError(e.message))

  useEffect(() => {
    getLabOrder(id)
      .then(setOrder)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  const handleAddItem = async (e) => {
    e.preventDefault()
    if (!newTestId.trim()) return
    setAddingItem(true)
    setActionError('')
    try {
      await addLabOrderItem(id, { testId: newTestId.trim() })
      setNewTestId('')
      await reload()
    } catch (err) {
      setActionError(err.message)
    } finally {
      setAddingItem(false)
    }
  }

  const handleRemoveItem = async (itemId) => {
    setActionError('')
    try { await removeLabOrderItem(id, itemId); await reload() }
    catch (err) { setActionError(err.message) }
  }

  const handleCollect = async () => {
    setActionError('')
    try { const updated = await collectSample(id); setOrder(updated) }
    catch (err) { setActionError(err.message) }
  }

  const handleProcess = async () => {
    setActionError('')
    try { const updated = await startProcessing(id); setOrder(updated) }
    catch (err) { setActionError(err.message) }
  }

  const handleRecordResult = async (itemId) => {
    const input = resultInputs[itemId] || {}
    if (!input.result?.trim()) { setActionError('Result is required'); return }
    setRecordingItemId(itemId)
    setActionError('')
    try {
      await recordResult(id, itemId, { result: input.result.trim(), remarks: input.remarks || '' })
      setResultInputs((r) => { const copy = { ...r }; delete copy[itemId]; return copy })
      setRecordingItemId(null)
      await reload()
    } catch (err) {
      setActionError(err.message)
      setRecordingItemId(null)
    }
  }

  const handleCancel = async () => {
    setActionError('')
    try { const updated = await cancelLabOrder(id, cancelReason); setOrder(updated); setShowCancel(false) }
    catch (err) { setActionError(err.message) }
  }

  if (loading) return <div className="text-center py-20 text-gray-400">Loading…</div>
  if (error) return <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>
  if (!order) return null

  const isOrdered = order.status === 'ORDERED'
  const isCollected = order.status === 'SAMPLE_COLLECTED'
  const isInProgress = order.status === 'IN_PROGRESS'
  const canCancel = isOrdered || isCollected

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <button onClick={() => navigate('/lab-orders')} className="text-sm text-blue-600 hover:underline">← Back to Lab Orders</button>
        <div className="flex items-center justify-between mt-2">
          <h1 className="text-2xl font-bold text-gray-900">{order.orderId}</h1>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_BADGE[order.status]}`}>
            {order.status.replace('_', ' ')}
          </span>
        </div>
      </div>

      {actionError && <div className="bg-orange-50 border border-orange-200 text-orange-700 px-4 py-3 rounded-lg mb-4 text-sm">{actionError}</div>}

      {/* Info */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><p className="text-gray-500">Patient ID</p><p className="font-medium">{order.patientId}</p></div>
          <div><p className="text-gray-500">Doctor ID</p><p className="font-medium">{order.doctorId}</p></div>
          <div><p className="text-gray-500">Total</p><p className="font-semibold">₹{Number(order.totalPrice).toFixed(2)}</p></div>
          <div><p className="text-gray-500">Created</p><p className="font-medium">{order.createdAt?.replace('T', ' ').slice(0, 16)}</p></div>
          {order.completedAt && <div><p className="text-gray-500">Completed</p><p className="font-medium">{order.completedAt.replace('T', ' ').slice(0, 16)}</p></div>}
          {order.cancelledAt && <div><p className="text-gray-500">Cancelled</p><p className="font-medium">{order.cancelledAt.replace('T', ' ').slice(0, 16)}</p></div>}
          {order.cancelReason && <div className="col-span-2"><p className="text-gray-500">Cancel Reason</p><p className="font-medium">{order.cancelReason}</p></div>}
          {order.notes && <div className="col-span-2"><p className="text-gray-500">Notes</p><p className="font-medium">{order.notes}</p></div>}
        </div>
      </div>

      {/* Tests */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
            Tests ({order.items?.length ?? 0})
          </h2>
        </div>

        {isOrdered && (
          <form onSubmit={handleAddItem} className="flex gap-2 mb-4">
            <input
              value={newTestId} onChange={(e) => setNewTestId(e.target.value)}
              placeholder="Test ID (e.g. TST20260001)"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button type="submit" disabled={addingItem}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-60">
              {addingItem ? 'Adding…' : 'Add'}
            </button>
          </form>
        )}

        {!order.items || order.items.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No tests added yet</p>
        ) : (
          <div className="space-y-3">
            {order.items.map((item) => (
              <div key={item.itemId} className="border border-gray-100 rounded-lg p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">{item.testName}</p>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ITEM_BADGE[item.status]}`}>
                        {item.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">{item.testId} · ₹{Number(item.price).toFixed(2)}</p>
                    {item.result && (
                      <div className="mt-2 bg-green-50 rounded px-3 py-2 text-sm">
                        <span className="font-medium text-gray-700">Result: </span>{item.result}
                        {item.remarks && <span className="text-gray-500"> — {item.remarks}</span>}
                        <span className="text-xs text-gray-400 ml-2">{item.resultAt?.replace('T', ' ').slice(0, 16)}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {isOrdered && (
                      <button onClick={() => handleRemoveItem(item.itemId)}
                        className="text-xs text-red-500 hover:text-red-700">Remove</button>
                    )}
                  </div>
                </div>

                {/* Result input for IN_PROGRESS items */}
                {isInProgress && item.status === 'IN_PROGRESS' && (
                  <div className="mt-3 flex gap-2 items-center">
                    <input
                      placeholder="Result *"
                      value={resultInputs[item.itemId]?.result || ''}
                      onChange={(e) => setResultInputs((r) => ({ ...r, [item.itemId]: { ...r[item.itemId], result: e.target.value } }))}
                      className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <input
                      placeholder="Remarks"
                      value={resultInputs[item.itemId]?.remarks || ''}
                      onChange={(e) => setResultInputs((r) => ({ ...r, [item.itemId]: { ...r[item.itemId], remarks: e.target.value } }))}
                      className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => handleRecordResult(item.itemId)}
                      disabled={recordingItemId === item.itemId}
                      className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-60"
                    >
                      {recordingItemId === item.itemId ? 'Saving…' : 'Record'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Workflow Actions */}
      {(isOrdered || isCollected || canCancel) && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Actions</h2>
          <div className="flex gap-3 flex-wrap">
            {isOrdered && (
              <button onClick={handleCollect} disabled={!order.items || order.items.length === 0}
                className="px-4 py-2 bg-yellow-500 text-white rounded-lg text-sm font-medium hover:bg-yellow-600 disabled:opacity-40">
                Collect Sample
              </button>
            )}
            {isCollected && (
              <button onClick={handleProcess}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600">
                Start Processing
              </button>
            )}
            {canCancel && (
              <button onClick={() => setShowCancel((v) => !v)}
                className="px-4 py-2 bg-red-50 text-red-700 rounded-lg text-sm font-medium hover:bg-red-100">
                Cancel Order
              </button>
            )}
          </div>

          {showCancel && (
            <div className="mt-4 flex gap-3 items-center">
              <input value={cancelReason} onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Reason (optional)"
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <button onClick={handleCancel}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">
                Confirm Cancel
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
