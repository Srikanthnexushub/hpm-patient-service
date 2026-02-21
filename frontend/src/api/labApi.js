import axios from 'axios'

const api = axios.create({ baseURL: '/lab-api/v1' })

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

// ── Lab Tests ─────────────────────────────────────────────────────────────────

export const listLabTests = (params) =>
  api.get('/lab-tests', { params }).then((r) => r.data.data)

export const getLabTest = (id) =>
  api.get(`/lab-tests/${id}`).then((r) => r.data.data)

export const addLabTest = (data, userId = 'SYSTEM') =>
  api.post('/lab-tests', data, { headers: { 'X-User-ID': userId } }).then((r) => r.data.data)

export const updateLabTest = (id, data, userId = 'SYSTEM') =>
  api.put(`/lab-tests/${id}`, data, { headers: { 'X-User-ID': userId } }).then((r) => r.data.data)

export const deactivateLabTest = (id, userId = 'SYSTEM') =>
  api.patch(`/lab-tests/${id}/deactivate`, null, { headers: { 'X-User-ID': userId } }).then((r) => r.data.data)

export const activateLabTest = (id, userId = 'SYSTEM') =>
  api.patch(`/lab-tests/${id}/activate`, null, { headers: { 'X-User-ID': userId } }).then((r) => r.data.data)

// ── Lab Orders ────────────────────────────────────────────────────────────────

export const listLabOrders = (params) =>
  api.get('/lab-orders', { params }).then((r) => r.data.data)

export const getLabOrder = (id) =>
  api.get(`/lab-orders/${id}`).then((r) => r.data.data)

export const createLabOrder = (data, userId = 'SYSTEM') =>
  api.post('/lab-orders', data, { headers: { 'X-User-ID': userId } }).then((r) => r.data.data)

export const addLabOrderItem = (orderId, data, userId = 'SYSTEM') =>
  api.post(`/lab-orders/${orderId}/items`, data, { headers: { 'X-User-ID': userId } }).then((r) => r.data.data)

export const removeLabOrderItem = (orderId, itemId, userId = 'SYSTEM') =>
  api.delete(`/lab-orders/${orderId}/items/${itemId}`, { headers: { 'X-User-ID': userId } }).then((r) => r.data.data)

export const collectSample = (orderId, userId = 'SYSTEM') =>
  api.patch(`/lab-orders/${orderId}/collect`, null, { headers: { 'X-User-ID': userId } }).then((r) => r.data.data)

export const startProcessing = (orderId, userId = 'SYSTEM') =>
  api.patch(`/lab-orders/${orderId}/process`, null, { headers: { 'X-User-ID': userId } }).then((r) => r.data.data)

export const recordResult = (orderId, itemId, data, userId = 'SYSTEM') =>
  api.patch(`/lab-orders/${orderId}/items/${itemId}/result`, data, { headers: { 'X-User-ID': userId } }).then((r) => r.data.data)

export const cancelLabOrder = (orderId, reason, userId = 'SYSTEM') =>
  api.patch(`/lab-orders/${orderId}/cancel`, { reason }, { headers: { 'X-User-ID': userId } }).then((r) => r.data.data)

// ── Enums ─────────────────────────────────────────────────────────────────────

export const TEST_CATEGORIES = [
  'HEMATOLOGY', 'BIOCHEMISTRY', 'MICROBIOLOGY', 'PATHOLOGY', 'RADIOLOGY', 'IMMUNOLOGY', 'OTHER',
]
export const ORDER_STATUSES = ['ALL', 'ORDERED', 'SAMPLE_COLLECTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']
