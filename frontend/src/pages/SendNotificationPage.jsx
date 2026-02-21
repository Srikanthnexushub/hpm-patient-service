import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  sendNotification,
  NOTIFICATION_CHANNELS,
  RECIPIENT_TYPES,
  REFERENCE_TYPES,
} from '../api/notificationApi'

export default function SendNotificationPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    recipientId: '',
    recipientType: 'PATIENT',
    channel: 'EMAIL',
    subject: '',
    body: '',
    referenceType: '',
    referenceId: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const payload = {
        recipientId: form.recipientId,
        recipientType: form.recipientType,
        channel: form.channel,
        subject: form.subject,
        body: form.body,
        referenceType: form.referenceType || undefined,
        referenceId: form.referenceId || undefined,
      }
      const notif = await sendNotification(payload)
      navigate(`/notifications/${notif.notificationId}`)
    } catch (e) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-xl">
      <div className="mb-6">
        <button onClick={() => navigate('/notifications')} className="text-sm text-blue-600 hover:underline mb-2">
          ← Back to Notifications
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Send Notification</h1>
        <p className="text-sm text-gray-500">Dispatches immediately via the selected channel.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Recipient ID *</label>
            <input
              name="recipientId"
              value={form.recipientId}
              onChange={handleChange}
              required
              placeholder="e.g. P2026001"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Recipient Type *</label>
            <select
              name="recipientType"
              value={form.recipientType}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {RECIPIENT_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Channel *</label>
          <div className="flex gap-3">
            {NOTIFICATION_CHANNELS.map((ch) => (
              <label key={ch} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="channel"
                  value={ch}
                  checked={form.channel === ch}
                  onChange={handleChange}
                  className="text-blue-600"
                />
                <span className="text-sm">{ch === 'EMAIL' ? '✉️ Email' : ch === 'SMS' ? '📱 SMS' : '🔔 In-App'}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
          <input
            name="subject"
            value={form.subject}
            onChange={handleChange}
            required
            maxLength={255}
            placeholder="Notification subject"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Message *</label>
          <textarea
            name="body"
            value={form.body}
            onChange={handleChange}
            required
            rows={4}
            placeholder="Notification body text"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reference Type</label>
            <select
              name="referenceType"
              value={form.referenceType}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">None</option>
              {REFERENCE_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reference ID</label>
            <input
              name="referenceId"
              value={form.referenceId}
              onChange={handleChange}
              placeholder="e.g. APT20260001"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? 'Sending…' : 'Send Notification'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/notifications')}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
