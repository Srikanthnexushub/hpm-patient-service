import axios from 'axios'

const api = axios.create({ baseURL: '/inv-api/v1' })

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

// ── Items ──────────────────────────────────────────────────────────────────────

export const listItems = (params) =>
  api.get('/items', { params }).then((r) => r.data.data)

export const getItem = (id) =>
  api.get(`/items/${id}`).then((r) => r.data.data)

export const createItem = (data, userId = 'SYSTEM') =>
  api.post('/items', data, { headers: { 'X-User-Id': userId } }).then((r) => r.data.data)

export const updateItem = (id, data, userId = 'SYSTEM') =>
  api.put(`/items/${id}`, data, { headers: { 'X-User-Id': userId } }).then((r) => r.data.data)

export const deactivateItem = (id, userId = 'SYSTEM') =>
  api.patch(`/items/${id}/deactivate`, null, { headers: { 'X-User-Id': userId } }).then((r) => r.data.data)

export const activateItem = (id, userId = 'SYSTEM') =>
  api.patch(`/items/${id}/activate`, null, { headers: { 'X-User-Id': userId } }).then((r) => r.data.data)

// ── Stock Transactions ─────────────────────────────────────────────────────────

export const listTransactions = (params) =>
  api.get('/transactions', { params }).then((r) => r.data.data)

export const getTransaction = (id) =>
  api.get(`/transactions/${id}`).then((r) => r.data.data)

export const recordTransaction = (data, userId = 'SYSTEM') =>
  api.post('/transactions', data, { headers: { 'X-User-Id': userId } }).then((r) => r.data.data)

// ── Enums ──────────────────────────────────────────────────────────────────────

export const ITEM_CATEGORIES = ['MEDICINE', 'SURGICAL', 'DIAGNOSTIC', 'CONSUMABLE', 'EQUIPMENT', 'LABORATORY', 'OFFICE']
export const TRANSACTION_TYPES = ['IN', 'OUT', 'ADJUSTMENT']
