import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getRequest, fulfillRequest, rejectRequest, cancelRequest } from '../api/bloodBankApi'

const STATUS_BADGE = {
  PENDING:   'bg-yellow-100 text-yellow-700',
  FULFILLED: 'bg-green-100 text-green-700',
  REJECTED:  'bg-red-100 text-red-600',
  CANCELLED: 'bg-gray-100 text-gray-600',
}

const PRIORITY_BADGE = {
  NORMAL:   'bg-blue-100 text-blue-700',
  URGENT:   'bg-orange-100 text-orange-700',
  CRITICAL: 'bg-red-100 text-red-700',
}

export default function BloodRequestDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [request, setRequest] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [actioning, setActioning] = useState('')
  const [rejectNotes, setRejectNotes] = useState('')
  const [showRejectForm, setShowRejectForm] = useState(false)

  const fetchRequest = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await getRequest(id)
      setRequest(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchRequest() }, [id])

  const handleFulfill = async () => {
    if (!window.confirm('Fulfill this blood request? Available units will be consumed (FIFO by expiry).')) return
    setActioning('fulfill')
    setActionError('')
    try {
      const updated = await fulfillRequest(id)
      setRequest(updated)
    } catch (e) {
      setActionError(e.message)
    } finally {
      setActioning('')
    }
  }

  const handleReject = async (e) => {
    e.preventDefault()
    setActioning('reject')
    setActionError('')
    try {
      const updated = await rejectRequest(id, { notes: rejectNotes })
      setRequest(updated)
      setShowRejectForm(false)
      setRejectNotes('')
    } catch (e) {
      setActionError(e.message)
    } finally {
      setActioning('')
    }
  }

  const handleCancel = async () => {
    if (!window.confirm('Cancel this blood request?')) return
    setActioning('cancel')
    setActionError('')
    try {
      const updated = await cancelRequest(id)
      setRequest(updated)
    } catch (e) {
      setActionError(e.message)
    } finally {
      setActioning('')
    }
  }

  if (loading) return <div className="text-center py-16 text-gray-400">Loading…</div>
  if (error) return (
    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
  )
  if (!request) return null

  const isPending = request.status === 'PENDING'

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/blood-requests')}
          className="text-sm text-gray-500 hover:text-gray-700">← Back</button>
        <h1 className="text-2xl font-bold text-gray-900">{request.requestId}</h1>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_BADGE[request.status] || 'bg-gray-100 text-gray-600'}`}>
          {request.status}
        </span>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${PRIORITY_BADGE[request.priority] || 'bg-gray-100 text-gray-600'}`}>
          {request.priority}
        </span>
      </div>

      {actionError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-5 text-sm">{actionError}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Details */}
        <div className="md:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-800 mb-4">Request Details</h2>
          <dl className="grid grid-cols-2 gap-y-3 gap-x-6 text-sm">
            <div>
              <dt className="text-gray-500">Patient ID</dt>
              <dd className="font-medium text-gray-900">{request.patientId}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Blood Group</dt>
              <dd className="font-bold text-red-700 text-base">{request.bloodGroup}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Units Requested</dt>
              <dd className="font-medium text-gray-900">{request.unitsRequested}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Units Fulfilled</dt>
              <dd className={`font-medium ${request.unitsFulfilled === request.unitsRequested && request.unitsRequested > 0 ? 'text-green-700' : 'text-gray-900'}`}>
                {request.unitsFulfilled}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Created By</dt>
              <dd className="font-medium text-gray-900">{request.createdBy}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Created At</dt>
              <dd className="font-medium text-gray-900">{request.createdAt?.replace('T', ' ').slice(0, 16)}</dd>
            </div>
            {request.fulfilledAt && (
              <div>
                <dt className="text-gray-500">Fulfilled At</dt>
                <dd className="font-medium text-green-700">{request.fulfilledAt.replace('T', ' ').slice(0, 16)}</dd>
              </div>
            )}
            {request.notes && (
              <div className="col-span-2">
                <dt className="text-gray-500">Notes</dt>
                <dd className="font-medium text-gray-900">{request.notes}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Actions */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-800 mb-4">Actions</h2>

          {!isPending && (
            <p className="text-sm text-gray-500">
              No actions available for <span className="font-medium">{request.status}</span> requests.
            </p>
          )}

          {isPending && (
            <div className="space-y-3">
              <button
                onClick={handleFulfill}
                disabled={actioning === 'fulfill'}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-60"
              >
                {actioning === 'fulfill' ? 'Fulfilling…' : 'Fulfill Request'}
              </button>

              {!showRejectForm ? (
                <button
                  onClick={() => setShowRejectForm(true)}
                  className="w-full px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50"
                >
                  Reject Request
                </button>
              ) : (
                <form onSubmit={handleReject} className="space-y-2">
                  <textarea
                    rows={3}
                    value={rejectNotes}
                    onChange={(e) => setRejectNotes(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Rejection reason (optional)"
                  />
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setShowRejectForm(false)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                      Cancel
                    </button>
                    <button type="submit" disabled={actioning === 'reject'}
                      className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-60">
                      {actioning === 'reject' ? 'Rejecting…' : 'Confirm Reject'}
                    </button>
                  </div>
                </form>
              )}

              <button
                onClick={handleCancel}
                disabled={actioning === 'cancel'}
                className="w-full px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-60"
              >
                {actioning === 'cancel' ? 'Cancelling…' : 'Cancel Request'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
