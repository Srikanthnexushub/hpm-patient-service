import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  listNotifications,
  markAsRead,
  retryNotification,
  NOTIFICATION_CHANNELS,
  NOTIFICATION_STATUSES,
} from '../api/notificationApi'

const STATUS_BADGE = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  SENT:    'bg-blue-100 text-blue-700',
  FAILED:  'bg-red-100 text-red-700',
  READ:    'bg-green-100 text-green-700',
}

const CHANNEL_ICON = { EMAIL: '✉️', SMS: '📱', IN_APP: '🔔' }

export default function NotificationsPage() {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')

  const [filters, setFilters] = useState({
    recipientId: '',
    channel: '',
    status: 'ALL',
  })

  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = { page, size: 20 }
      if (filters.recipientId) params.recipientId = filters.recipientId
      if (filters.channel) params.channel = filters.channel
      if (filters.status !== 'ALL') params.status = filters.status
      const data = await listNotifications(params)
      setNotifications(data.content)
      setTotal(data.totalElements)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [page, filters])

  useEffect(() => { fetchNotifications() }, [fetchNotifications])

  const handleFilterChange = (e) => {
    setFilters((f) => ({ ...f, [e.target.name]: e.target.value }))
    setPage(0)
  }

  const handleMarkAsRead = async (e, id) => {
    e.stopPropagation()
    setActionError('')
    try {
      await markAsRead(id)
      await fetchNotifications()
    } catch (err) {
      setActionError(err.message)
    }
  }

  const handleRetry = async (e, id) => {
    e.stopPropagation()
    setActionError('')
    try {
      await retryNotification(id)
      await fetchNotifications()
    } catch (err) {
      setActionError(err.message)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-sm text-gray-500">{total} total notification{total !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => navigate('/notifications/send')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          + Send Notification
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex gap-4 flex-wrap">
        <input
          name="recipientId"
          placeholder="Recipient ID"
          value={filters.recipientId}
          onChange={handleFilterChange}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-44"
        />
        <select
          name="channel"
          value={filters.channel}
          onChange={handleFilterChange}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Channels</option>
          {NOTIFICATION_CHANNELS.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select
          name="status"
          value={filters.status}
          onChange={handleFilterChange}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {NOTIFICATION_STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>
      )}
      {actionError && (
        <div className="bg-orange-50 border border-orange-200 text-orange-700 px-4 py-3 rounded-lg mb-4 text-sm">{actionError}</div>
      )}

      <div className="space-y-2">
        {loading ? (
          <div className="text-center py-10 text-gray-400">Loading…</div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-10 text-gray-400">No notifications found</div>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif.notificationId}
              onClick={() => navigate(`/notifications/${notif.notificationId}`)}
              className="bg-white rounded-xl border border-gray-200 px-5 py-4 hover:shadow-sm cursor-pointer flex items-start gap-4"
            >
              <span className="text-xl mt-0.5">{CHANNEL_ICON[notif.channel] || '🔔'}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium text-gray-900 truncate">{notif.subject}</p>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${STATUS_BADGE[notif.status]}`}>
                    {notif.status}
                  </span>
                </div>
                <p className="text-sm text-gray-500 truncate">{notif.body}</p>
                <div className="flex gap-3 mt-1 text-xs text-gray-400">
                  <span>To: {notif.recipientId} ({notif.recipientType})</span>
                  {notif.referenceType && <span>Ref: {notif.referenceType}/{notif.referenceId}</span>}
                  <span>{notif.createdAt?.split('T')[0]}</span>
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                {notif.status === 'SENT' && (
                  <button
                    onClick={(e) => handleMarkAsRead(e, notif.notificationId)}
                    className="px-2 py-1 text-xs bg-green-50 text-green-700 rounded hover:bg-green-100"
                  >
                    Mark Read
                  </button>
                )}
                {notif.status === 'FAILED' && (
                  <button
                    onClick={(e) => handleRetry(e, notif.notificationId)}
                    className="px-2 py-1 text-xs bg-orange-50 text-orange-700 rounded hover:bg-orange-100"
                  >
                    Retry
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
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
