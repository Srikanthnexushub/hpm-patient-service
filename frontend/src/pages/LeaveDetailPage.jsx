import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getLeave, reviewLeave, cancelLeave } from '../api/staffApi'

const STATUS_BADGE = {
  PENDING:  'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
}

const TYPE_BADGE = {
  SICK:      'bg-red-100 text-red-600',
  CASUAL:    'bg-blue-100 text-blue-600',
  ANNUAL:    'bg-green-100 text-green-600',
  EMERGENCY: 'bg-orange-100 text-orange-600',
}

export default function LeaveDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [leave, setLeave] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showReview, setShowReview] = useState(false)
  const [reviewForm, setReviewForm] = useState({ decision: 'APPROVED', reviewNotes: '' })
  const [reviewing, setReviewing] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    setLoading(true)
    getLeave(id)
      .then(setLeave)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  const handleReview = async (e) => {
    e.preventDefault()
    setReviewing(true)
    setError('')
    try {
      const updated = await reviewLeave(id, reviewForm)
      setLeave(updated)
      setShowReview(false)
    } catch (e) {
      setError(e.message)
    } finally {
      setReviewing(false)
    }
  }

  const handleCancel = async () => {
    if (!window.confirm('Cancel this leave request?')) return
    setCancelling(true)
    setError('')
    try {
      const updated = await cancelLeave(id)
      setLeave(updated)
    } catch (e) {
      setError(e.message)
    } finally {
      setCancelling(false)
    }
  }

  if (loading) return <div className="text-center py-20 text-gray-400">Loading…</div>
  if (error && !leave) return (
    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>
  )

  const isPending = leave?.status === 'PENDING'

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/leaves')}
          className="text-gray-400 hover:text-gray-600 text-sm">← Back</button>
        <h1 className="text-2xl font-bold text-gray-900 flex-1">{leave.leaveId}</h1>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_BADGE[leave.leaveType] || 'bg-gray-100 text-gray-700'}`}>
          {leave.leaveType}
        </span>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[leave.status] || 'bg-gray-100 text-gray-700'}`}>
          {leave.status}
        </span>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
        <h2 className="font-semibold text-gray-800 mb-4">Leave Details</h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div>
            <dt className="text-gray-500">Leave ID</dt>
            <dd className="font-mono font-medium text-gray-900">{leave.leaveId}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Staff ID</dt>
            <dd
              className="font-medium text-blue-600 cursor-pointer hover:underline"
              onClick={() => navigate(`/staff/${leave.staffId}`)}
            >
              {leave.staffId}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">Leave Type</dt>
            <dd className="text-gray-900">{leave.leaveType}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Duration</dt>
            <dd className="text-gray-900">{leave.durationDays} day{leave.durationDays !== 1 ? 's' : ''}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Start Date</dt>
            <dd className="text-gray-900">{leave.startDate}</dd>
          </div>
          <div>
            <dt className="text-gray-500">End Date</dt>
            <dd className="text-gray-900">{leave.endDate}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-gray-500">Reason</dt>
            <dd className="text-gray-900 mt-0.5">{leave.reason}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Submitted</dt>
            <dd className="text-gray-900">{leave.createdAt?.replace('T', ' ').slice(0, 16)} by {leave.createdBy}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Status</dt>
            <dd className="text-gray-900">{leave.status}</dd>
          </div>
          {leave.reviewedAt && (
            <>
              <div>
                <dt className="text-gray-500">Reviewed At</dt>
                <dd className="text-gray-900">{leave.reviewedAt?.replace('T', ' ').slice(0, 16)}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Reviewed By</dt>
                <dd className="text-gray-900">{leave.reviewedBy}</dd>
              </div>
              {leave.reviewNotes && (
                <div className="col-span-2">
                  <dt className="text-gray-500">Review Notes</dt>
                  <dd className="text-gray-900 mt-0.5">{leave.reviewNotes}</dd>
                </div>
              )}
            </>
          )}
        </dl>
      </div>

      {isPending && (
        <div className="space-y-3">
          {showReview ? (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-800 mb-4">Review Leave Request</h2>
              <form onSubmit={handleReview} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Decision *</label>
                  <select value={reviewForm.decision}
                    onChange={(e) => setReviewForm({ ...reviewForm, decision: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="APPROVED">APPROVED</option>
                    <option value="REJECTED">REJECTED</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Review Notes</label>
                  <textarea rows={2} value={reviewForm.reviewNotes}
                    onChange={(e) => setReviewForm({ ...reviewForm, reviewNotes: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Optional notes" />
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setShowReview(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
                  <button type="submit" disabled={reviewing}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
                    {reviewing ? 'Submitting…' : 'Submit Decision'}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="flex gap-3">
              <button onClick={() => setShowReview(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                Review (Approve / Reject)
              </button>
              <button onClick={handleCancel} disabled={cancelling}
                className="px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 disabled:opacity-60">
                {cancelling ? 'Cancelling…' : 'Cancel Request'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
