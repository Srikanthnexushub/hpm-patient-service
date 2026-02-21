import axios from 'axios'

const api = axios.create({ baseURL: '/staff-api/v1' })

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

// ── Staff ─────────────────────────────────────────────────────────────────────

export const listStaff = (params) =>
  api.get('/staff', { params }).then((r) => r.data.data)

export const getStaff = (id) =>
  api.get(`/staff/${id}`).then((r) => r.data.data)

export const createStaff = (data, userId = 'SYSTEM') =>
  api.post('/staff', data, { headers: { 'X-User-Id': userId } }).then((r) => r.data.data)

export const updateStaff = (id, data, userId = 'SYSTEM') =>
  api.put(`/staff/${id}`, data, { headers: { 'X-User-Id': userId } }).then((r) => r.data.data)

export const deactivateStaff = (id, userId = 'SYSTEM') =>
  api.patch(`/staff/${id}/deactivate`, null, { headers: { 'X-User-Id': userId } }).then((r) => r.data.data)

export const activateStaff = (id, userId = 'SYSTEM') =>
  api.patch(`/staff/${id}/activate`, null, { headers: { 'X-User-Id': userId } }).then((r) => r.data.data)

// ── Leave Requests ────────────────────────────────────────────────────────────

export const listLeaves = (params) =>
  api.get('/leaves', { params }).then((r) => r.data.data)

export const getLeave = (id) =>
  api.get(`/leaves/${id}`).then((r) => r.data.data)

export const requestLeave = (data, userId = 'SYSTEM') =>
  api.post('/leaves', data, { headers: { 'X-User-Id': userId } }).then((r) => r.data.data)

export const reviewLeave = (id, data, reviewerId = 'SYSTEM') =>
  api.patch(`/leaves/${id}/review`, data, { headers: { 'X-User-Id': reviewerId } }).then((r) => r.data.data)

export const cancelLeave = (id, userId = 'SYSTEM') =>
  api.patch(`/leaves/${id}/cancel`, null, { headers: { 'X-User-Id': userId } }).then((r) => r.data.data)

// ── Enums ─────────────────────────────────────────────────────────────────────

export const STAFF_ROLES = ['DOCTOR', 'NURSE', 'TECHNICIAN', 'ADMIN', 'PHARMACIST', 'RECEPTIONIST', 'LAB_TECHNICIAN']
export const DEPARTMENTS = ['GENERAL', 'ICU', 'EMERGENCY', 'MATERNITY', 'PEDIATRIC', 'SURGICAL',
  'ORTHOPEDIC', 'RADIOLOGY', 'PHARMACY', 'ADMINISTRATION', 'LABORATORY']
export const STAFF_STATUSES = ['ACTIVE', 'ON_LEAVE', 'RESIGNED', 'TERMINATED']
export const LEAVE_TYPES = ['SICK', 'CASUAL', 'ANNUAL', 'EMERGENCY']
export const LEAVE_STATUSES = ['PENDING', 'APPROVED', 'REJECTED']
