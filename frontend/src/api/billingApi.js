import axios from 'axios'

const api = axios.create({ baseURL: '/bill-api/v1' })

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

// ── Invoices ────────────────────────────────────────────────────────────────

export const listInvoices = (params) =>
  api.get('/invoices', { params }).then((r) => r.data.data)

export const getInvoice = (id) =>
  api.get(`/invoices/${id}`).then((r) => r.data.data)

export const createInvoice = (data, userId = 'SYSTEM') =>
  api
    .post('/invoices', data, { headers: { 'X-User-ID': userId } })
    .then((r) => r.data.data)

export const updateInvoice = (id, data, userId = 'SYSTEM') =>
  api
    .put(`/invoices/${id}`, data, { headers: { 'X-User-ID': userId } })
    .then((r) => r.data.data)

export const issueInvoice = (id, userId = 'SYSTEM') =>
  api
    .patch(`/invoices/${id}/issue`, null, { headers: { 'X-User-ID': userId } })
    .then((r) => r.data.data)

export const recordPayment = (id, data, userId = 'SYSTEM') =>
  api
    .patch(`/invoices/${id}/pay`, data, { headers: { 'X-User-ID': userId } })
    .then((r) => r.data.data)

export const cancelInvoice = (id, reason, userId = 'SYSTEM') =>
  api
    .patch(`/invoices/${id}/cancel`, { reason }, { headers: { 'X-User-ID': userId } })
    .then((r) => r.data.data)

export const addInvoiceItem = (invoiceId, data, userId = 'SYSTEM') =>
  api
    .post(`/invoices/${invoiceId}/items`, data, { headers: { 'X-User-ID': userId } })
    .then((r) => r.data.data)

export const removeInvoiceItem = (invoiceId, itemId, userId = 'SYSTEM') =>
  api
    .delete(`/invoices/${invoiceId}/items/${itemId}`, { headers: { 'X-User-ID': userId } })
    .then((r) => r.data)

// ── Enums ──────────────────────────────────────────────────────────────────

export const INVOICE_STATUSES = ['ALL', 'DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'CANCELLED']
export const PAYMENT_METHODS = ['CASH', 'CARD', 'INSURANCE', 'BANK_TRANSFER', 'OTHER']
