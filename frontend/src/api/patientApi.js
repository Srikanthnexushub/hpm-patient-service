import axios from 'axios'

const api = axios.create({ baseURL: '/api/v1' })

// Unwrap the ApiResponse envelope: { success, message, data }
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Normalise error message from API envelope or HTTP error
    const msg =
      error.response?.data?.message ||
      error.response?.statusText ||
      error.message ||
      'An unexpected error occurred'
    return Promise.reject(new Error(msg))
  }
)

export const searchPatients = (params) =>
  api.get('/patients', { params }).then((r) => r.data.data)

export const registerPatient = (data, userId = 'SYSTEM') =>
  api
    .post('/patients', data, { headers: { 'X-User-ID': userId } })
    .then((r) => r.data.data)

export const getPatient = (id) =>
  api.get(`/patients/${id}`).then((r) => r.data.data)

export const updatePatient = (id, data, userId = 'SYSTEM') =>
  api
    .put(`/patients/${id}`, data, { headers: { 'X-User-ID': userId } })
    .then((r) => r.data.data)

export const deactivatePatient = (id, userId = 'SYSTEM') =>
  api
    .patch(`/patients/${id}/deactivate`, {}, { headers: { 'X-User-ID': userId } })
    .then((r) => r.data.data)

export const activatePatient = (id, userId = 'SYSTEM') =>
  api
    .patch(`/patients/${id}/activate`, {}, { headers: { 'X-User-ID': userId } })
    .then((r) => r.data.data)

// Enum constants for use in forms / filters
export const GENDERS = ['MALE', 'FEMALE', 'OTHER']

export const BLOOD_GROUPS = [
  { value: 'A_POS', label: 'A+' },
  { value: 'A_NEG', label: 'A-' },
  { value: 'B_POS', label: 'B+' },
  { value: 'B_NEG', label: 'B-' },
  { value: 'AB_POS', label: 'AB+' },
  { value: 'AB_NEG', label: 'AB-' },
  { value: 'O_POS', label: 'O+' },
  { value: 'O_NEG', label: 'O-' },
  { value: 'UNKNOWN', label: 'Unknown' },
]

export const STATUS_FILTERS = ['ALL', 'ACTIVE', 'INACTIVE']
