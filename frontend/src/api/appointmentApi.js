import axios from 'axios'

const api = axios.create({ baseURL: '/apt-api/v1' })

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

// ── Doctors ────────────────────────────────────────────────────────────────

export const searchDoctors = (params) =>
  api.get('/doctors', { params }).then((r) => r.data.data)

export const getDoctor = (id) =>
  api.get(`/doctors/${id}`).then((r) => r.data.data)

export const registerDoctor = (data, userId = 'SYSTEM') =>
  api
    .post('/doctors', data, { headers: { 'X-User-ID': userId } })
    .then((r) => r.data.data)

export const updateDoctor = (id, data, userId = 'SYSTEM') =>
  api
    .put(`/doctors/${id}`, data, { headers: { 'X-User-ID': userId } })
    .then((r) => r.data.data)

export const deactivateDoctor = (id, userId = 'SYSTEM') =>
  api
    .patch(`/doctors/${id}/deactivate`, {}, { headers: { 'X-User-ID': userId } })
    .then((r) => r.data.data)

export const activateDoctor = (id, userId = 'SYSTEM') =>
  api
    .patch(`/doctors/${id}/activate`, {}, { headers: { 'X-User-ID': userId } })
    .then((r) => r.data.data)

// ── Appointments ───────────────────────────────────────────────────────────

export const searchAppointments = (params) =>
  api.get('/appointments', { params }).then((r) => r.data.data)

export const getAppointment = (id) =>
  api.get(`/appointments/${id}`).then((r) => r.data.data)

export const bookAppointment = (data, userId = 'SYSTEM') =>
  api
    .post('/appointments', data, { headers: { 'X-User-ID': userId } })
    .then((r) => r.data.data)

export const updateAppointment = (id, data, userId = 'SYSTEM') =>
  api
    .put(`/appointments/${id}`, data, { headers: { 'X-User-ID': userId } })
    .then((r) => r.data.data)

export const confirmAppointment = (id, userId = 'SYSTEM') =>
  api
    .patch(`/appointments/${id}/confirm`, {}, { headers: { 'X-User-ID': userId } })
    .then((r) => r.data.data)

export const cancelAppointment = (id, reason, userId = 'SYSTEM') =>
  api
    .patch(
      `/appointments/${id}/cancel`,
      { cancellationReason: reason },
      { headers: { 'X-User-ID': userId } }
    )
    .then((r) => r.data.data)

export const completeAppointment = (id, notes = '', userId = 'SYSTEM') =>
  api
    .patch(`/appointments/${id}/complete`, null, {
      params: notes ? { notes } : {},
      headers: { 'X-User-ID': userId },
    })
    .then((r) => r.data.data)

export const noShowAppointment = (id, userId = 'SYSTEM') =>
  api
    .patch(`/appointments/${id}/no-show`, {}, { headers: { 'X-User-ID': userId } })
    .then((r) => r.data.data)

export const getAvailability = (doctorId, date) =>
  api.get('/appointments/availability', { params: { doctorId, date } }).then((r) => r.data.data)

// ── Enums ──────────────────────────────────────────────────────────────────

export const APPOINTMENT_TYPES = ['CONSULTATION', 'FOLLOW_UP', 'PROCEDURE', 'EMERGENCY']
export const APPOINTMENT_STATUSES = ['ALL', 'SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']
export const DOCTOR_STATUS_FILTERS = ['ALL', 'ACTIVE', 'INACTIVE']
