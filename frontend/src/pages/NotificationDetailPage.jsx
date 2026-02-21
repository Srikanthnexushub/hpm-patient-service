import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getNotification, markAsRead, retryNotification } from '../api/notificationApi'

const STATUS_BADGE = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  SENT:    'bg-blue-100 text-blue-700',
  FAILED:  'bg-red-100 text-red-700',
  READ:    'bg-green-100 text-green-700',
}

const CHANNEL_ICON = { EMAIL: '✉️', SMS: '📱', IN_APP: '🔔' }

export default function NotificationDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [notification, setNotification] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [actioning, setActioning] = useState(false)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setNotification(await getNotification(id))
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { fetch() }, [fetch])

  const handleMarkAsRead = async () => {
    setActioning(true)
    setActionError('')
    try {
      setNotification(await markAsRead(id))
    } catch (e) {
      setActionError(e.message)
    } finally {
      setActioning(false)
    }
  }

  const handleRetry = async () => {
    setActioning(true)
    setActionError('')
    try {
      setNotification(await retryNotification(id))
    } catch (e) {
      setActionError(e.message)
    } finally {
      setActioning(false)
    }
  }

  if (loading) return <div className="text-center py-10 text-gray-400">Loading…</div>
  if (error) return (
    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
  )
  if (!notification) return null

  const fmt = (ts) => ts ? new Date(ts).toLocaleString() : '—'

  return (
    <div className="max-w-2xl">
      <button onClick={() => navigate('/notifications')} className="text-sm text-blue-600 hover:underline mb-4">
        ← Back to Notifications
      </button>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{CHANNEL_ICON[notification.channel] || '🔔'}</span>
            <div>
              <h1 className="text-lg font-bold text-gray-900">{notification.subject}</h1>
              <p className="text-xs text-gray-400 font-mono">{notification.notificationId}</p>
            </div>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[notification.status]}`}>
            {notification.status}
          </span>
        </div>

        {actionError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
            {actionError}
          </div>
        )}

        {/* Body */}
        <div className="bg-gray-50 rounded-lg p-4 mb-5">
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{notification.body}</p>
        </div>

        {/* Metadata grid */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm mb-5">
          {[
            { label: 'Recipient ID', value: notification.recipientId },
            { label: 'Recipient Type', value: notification.recipientType },
            { label: 'Channel', value: notification.channel },
            { label: 'Reference', value: notification.referenceType ? `${notification.referenceType}/${notification.referenceId}` : '—' },
            { label: 'Created At', value: fmt(notification.createdAt) },
            { label: 'Created By', value: notification.createdBy },
            { label: 'Sent At', value: fmt(notification.sentAt) },
            { label: 'Read At', value: fmt(notification.readAt) },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-xs text-gray-500 mb-0.5">{label}</p>
              <p className="font-medium text-gray-800">{value || '—'}</p>
            </div>
          ))}
        </div>

        {notification.errorMessage && (
          <div className="bg-red-50 rounded-lg p-4 mb-5">
            <p className="text-xs text-red-500 font-semibold mb-1">Error</p>
            <p className="text-sm text-red-700">{notification.errorMessage}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          {notification.status === 'SENT' && (
            <button
              onClick={handleMarkAsRead}
              disabled={actioning}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {actioning ? 'Marking…' : 'Mark as Read'}
            </button>
          )}
          {notification.status === 'FAILED' && (
            <button
              onClick={handleRetry}
              disabled={actioning}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50"
            >
              {actioning ? 'Retrying…' : 'Retry'}
            </button>
          )}
          <button
            onClick={() => navigate('/notifications/send')}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
          >
            Send Similar
          </button>
        </div>
      </div>
    </div>
  )
}
