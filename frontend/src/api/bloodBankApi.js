import axios from 'axios'

const api = axios.create({ baseURL: '/blood-api/v1' })

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

// ── Blood Units ────────────────────────────────────────────────────────────────

export const listUnits = (params) =>
  api.get('/units', { params }).then((r) => r.data.data)

export const getUnit = (id) =>
  api.get(`/units/${id}`).then((r) => r.data.data)

export const registerUnit = (data, userId = 'SYSTEM') =>
  api.post('/units', data, { headers: { 'X-User-Id': userId } }).then((r) => r.data.data)

export const discardUnit = (id, userId = 'SYSTEM') =>
  api.patch(`/units/${id}/discard`, null, { headers: { 'X-User-Id': userId } }).then((r) => r.data.data)

export const getStock = () =>
  api.get('/stock').then((r) => r.data.data)

// ── Blood Requests ─────────────────────────────────────────────────────────────

export const listRequests = (params) =>
  api.get('/requests', { params }).then((r) => r.data.data)

export const getRequest = (id) =>
  api.get(`/requests/${id}`).then((r) => r.data.data)

export const createRequest = (data, userId = 'SYSTEM') =>
  api.post('/requests', data, { headers: { 'X-User-Id': userId } }).then((r) => r.data.data)

export const fulfillRequest = (id, userId = 'SYSTEM') =>
  api.patch(`/requests/${id}/fulfill`, null, { headers: { 'X-User-Id': userId } }).then((r) => r.data.data)

export const rejectRequest = (id, data = {}, userId = 'SYSTEM') =>
  api.patch(`/requests/${id}/reject`, data, { headers: { 'X-User-Id': userId } }).then((r) => r.data.data)

export const cancelRequest = (id, userId = 'SYSTEM') =>
  api.patch(`/requests/${id}/cancel`, null, { headers: { 'X-User-Id': userId } }).then((r) => r.data.data)

// ── Enums ──────────────────────────────────────────────────────────────────────

export const BLOOD_GROUPS = ['A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'AB_POS', 'AB_NEG', 'O_POS', 'O_NEG']
export const UNIT_STATUSES = ['AVAILABLE', 'USED', 'EXPIRED', 'DISCARDED']
export const REQUEST_STATUSES = ['PENDING', 'FULFILLED', 'REJECTED', 'CANCELLED']
export const REQUEST_PRIORITIES = ['NORMAL', 'URGENT', 'CRITICAL']
