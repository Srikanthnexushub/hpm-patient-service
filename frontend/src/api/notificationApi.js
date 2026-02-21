import axios from 'axios'

const api = axios.create({ baseURL: '/notif-api/v1' })

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const msg =
      error.response?.data?.message ||
      error.response?.statusText ||
      error.message ||
      'An unexpected error occurred'
    return Promise.reject(new Error(msg))
  }
)

// ── Notifications ────────────────────────────────────────────────────────────

export const listNotifications = (params) =>
  api.get('/notifications', { params }).then((r) => r.data.data)

export const getNotification = (id) =>
  api.get(`/notifications/${id}`).then((r) => r.data.data)

export const sendNotification = (data, userId = 'SYSTEM') =>
  api
    .post('/notifications', data, { headers: { 'X-User-ID': userId } })
    .then((r) => r.data.data)

export const markAsRead = (id, userId = 'SYSTEM') =>
  api
    .patch(`/notifications/${id}/read`, null, { headers: { 'X-User-ID': userId } })
    .then((r) => r.data.data)

export const retryNotification = (id, userId = 'SYSTEM') =>
  api
    .patch(`/notifications/${id}/retry`, null, { headers: { 'X-User-ID': userId } })
    .then((r) => r.data.data)

// ── Enums ──────────────────────────────────────────────────────────────────

export const NOTIFICATION_CHANNELS = ['EMAIL', 'SMS', 'IN_APP']
export const RECIPIENT_TYPES = ['PATIENT', 'DOCTOR', 'STAFF']
export const NOTIFICATION_STATUSES = ['ALL', 'PENDING', 'SENT', 'FAILED', 'READ']
export const REFERENCE_TYPES = ['APPOINTMENT', 'INVOICE', 'PATIENT', 'GENERAL']
