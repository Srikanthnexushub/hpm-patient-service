import axios from 'axios'

const api = axios.create({ baseURL: '/emr-api/v1' })

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

// ── Medical Records ────────────────────────────────────────────────────────

export const searchRecords = (params) =>
  api.get('/records', { params }).then((r) => r.data.data)

export const getRecord = (id) =>
  api.get(`/records/${id}`).then((r) => r.data.data)

export const createRecord = (data, userId = 'SYSTEM') =>
  api
    .post('/records', data, { headers: { 'X-User-ID': userId } })
    .then((r) => r.data.data)

export const updateRecord = (id, data, userId = 'SYSTEM') =>
  api
    .put(`/records/${id}`, data, { headers: { 'X-User-ID': userId } })
    .then((r) => r.data.data)

export const finalizeRecord = (id, userId = 'SYSTEM') =>
  api
    .patch(`/records/${id}/finalize`, {}, { headers: { 'X-User-ID': userId } })
    .then((r) => r.data.data)

export const amendRecord = (id, userId = 'SYSTEM') =>
  api
    .patch(`/records/${id}/amend`, {}, { headers: { 'X-User-ID': userId } })
    .then((r) => r.data.data)

// ── Prescriptions ──────────────────────────────────────────────────────────

export const getPrescriptions = (recordId) =>
  api.get(`/records/${recordId}/prescriptions`).then((r) => r.data.data)

export const addPrescription = (recordId, data, userId = 'SYSTEM') =>
  api
    .post(`/records/${recordId}/prescriptions`, data, { headers: { 'X-User-ID': userId } })
    .then((r) => r.data.data)

export const discontinuePrescription = (recordId, prescriptionId, reason, userId = 'SYSTEM') =>
  api
    .patch(
      `/records/${recordId}/prescriptions/${prescriptionId}/discontinue`,
      { discontinuedReason: reason },
      { headers: { 'X-User-ID': userId } }
    )
    .then((r) => r.data.data)

export const getActivePatientPrescriptions = (patientId) =>
  api.get(`/prescriptions/patient/${patientId}/active`).then((r) => r.data.data)

// ── Enums ──────────────────────────────────────────────────────────────────

export const RECORD_STATUS_FILTERS = ['ALL', 'DRAFT', 'FINALIZED', 'AMENDED']
