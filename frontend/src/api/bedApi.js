import axios from 'axios'

const api = axios.create({ baseURL: '/bed-api/v1' })

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

// ── Wards ─────────────────────────────────────────────────────────────────────

export const listWards = (params) =>
  api.get('/wards', { params }).then((r) => r.data.data)

export const getWard = (id) =>
  api.get(`/wards/${id}`).then((r) => r.data.data)

export const createWard = (data, userId = 'SYSTEM') =>
  api.post('/wards', data, { headers: { 'X-User-Id': userId } }).then((r) => r.data.data)

export const deactivateWard = (id, userId = 'SYSTEM') =>
  api.patch(`/wards/${id}/deactivate`, null, { headers: { 'X-User-Id': userId } }).then((r) => r.data.data)

export const activateWard = (id, userId = 'SYSTEM') =>
  api.patch(`/wards/${id}/activate`, null, { headers: { 'X-User-Id': userId } }).then((r) => r.data.data)

// ── Beds ──────────────────────────────────────────────────────────────────────

export const listBeds = (params) =>
  api.get('/beds', { params }).then((r) => r.data.data)

export const getBed = (id) =>
  api.get(`/beds/${id}`).then((r) => r.data.data)

export const createBed = (data, userId = 'SYSTEM') =>
  api.post('/beds', data, { headers: { 'X-User-Id': userId } }).then((r) => r.data.data)

export const updateBedStatus = (id, status, userId = 'SYSTEM') =>
  api.patch(`/beds/${id}/status`, { status }, { headers: { 'X-User-Id': userId } }).then((r) => r.data.data)

// ── Admissions ────────────────────────────────────────────────────────────────

export const listAdmissions = (params) =>
  api.get('/admissions', { params }).then((r) => r.data.data)

export const getAdmission = (id) =>
  api.get(`/admissions/${id}`).then((r) => r.data.data)

export const admitPatient = (data, userId = 'SYSTEM') =>
  api.post('/admissions', data, { headers: { 'X-User-Id': userId } }).then((r) => r.data.data)

export const transferPatient = (id, newBedId, userId = 'SYSTEM') =>
  api.patch(`/admissions/${id}/transfer`, { newBedId }, { headers: { 'X-User-Id': userId } }).then((r) => r.data.data)

export const dischargePatient = (id, dischargeNotes, userId = 'SYSTEM') =>
  api.patch(`/admissions/${id}/discharge`, { dischargeNotes }, { headers: { 'X-User-Id': userId } }).then((r) => r.data.data)

// ── Enums ─────────────────────────────────────────────────────────────────────

export const WARD_TYPES = ['GENERAL', 'ICU', 'EMERGENCY', 'MATERNITY', 'PEDIATRIC', 'SURGICAL', 'ORTHOPEDIC']
export const BED_TYPES = ['GENERAL', 'ICU', 'PRIVATE', 'SEMI_PRIVATE']
export const BED_STATUSES = ['ALL', 'AVAILABLE', 'OCCUPIED', 'MAINTENANCE']
export const ADMISSION_STATUSES = ['ADMITTED', 'DISCHARGED']
