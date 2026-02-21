import axios from 'axios'

const api = axios.create({ baseURL: '/pharm-api/v1' })

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

// ── Medicines ─────────────────────────────────────────────────────────────────

export const listMedicines = (params) =>
  api.get('/medicines', { params }).then((r) => r.data.data)

export const getMedicine = (id) =>
  api.get(`/medicines/${id}`).then((r) => r.data.data)

export const addMedicine = (data, userId = 'SYSTEM') =>
  api
    .post('/medicines', data, { headers: { 'X-User-ID': userId } })
    .then((r) => r.data.data)

export const updateMedicine = (id, data, userId = 'SYSTEM') =>
  api
    .put(`/medicines/${id}`, data, { headers: { 'X-User-ID': userId } })
    .then((r) => r.data.data)

export const adjustStock = (id, quantity, userId = 'SYSTEM') =>
  api
    .patch(`/medicines/${id}/stock`, { quantity }, { headers: { 'X-User-ID': userId } })
    .then((r) => r.data.data)

export const deactivateMedicine = (id, userId = 'SYSTEM') =>
  api
    .patch(`/medicines/${id}/deactivate`, null, { headers: { 'X-User-ID': userId } })
    .then((r) => r.data.data)

export const activateMedicine = (id, userId = 'SYSTEM') =>
  api
    .patch(`/medicines/${id}/activate`, null, { headers: { 'X-User-ID': userId } })
    .then((r) => r.data.data)

// ── Prescriptions ─────────────────────────────────────────────────────────────

export const listPrescriptions = (params) =>
  api.get('/prescriptions', { params }).then((r) => r.data.data)

export const getPrescription = (id) =>
  api.get(`/prescriptions/${id}`).then((r) => r.data.data)

export const createPrescription = (data, userId = 'SYSTEM') =>
  api
    .post('/prescriptions', data, { headers: { 'X-User-ID': userId } })
    .then((r) => r.data.data)

export const addPrescriptionItem = (prescriptionId, data, userId = 'SYSTEM') =>
  api
    .post(`/prescriptions/${prescriptionId}/items`, data, { headers: { 'X-User-ID': userId } })
    .then((r) => r.data.data)

export const removePrescriptionItem = (prescriptionId, itemId, userId = 'SYSTEM') =>
  api
    .delete(`/prescriptions/${prescriptionId}/items/${itemId}`, { headers: { 'X-User-ID': userId } })
    .then((r) => r.data.data)

export const dispensePrescription = (id, userId = 'SYSTEM') =>
  api
    .patch(`/prescriptions/${id}/dispense`, null, { headers: { 'X-User-ID': userId } })
    .then((r) => r.data.data)

export const cancelPrescription = (id, reason, userId = 'SYSTEM') =>
  api
    .patch(`/prescriptions/${id}/cancel`, { reason }, { headers: { 'X-User-ID': userId } })
    .then((r) => r.data.data)

// ── Enums ─────────────────────────────────────────────────────────────────────

export const MEDICINE_CATEGORIES = [
  'TABLET', 'CAPSULE', 'SYRUP', 'INJECTION', 'OINTMENT', 'DROPS', 'INHALER', 'OTHER',
]
export const PRESCRIPTION_STATUSES = ['ALL', 'PENDING', 'DISPENSED', 'CANCELLED']
