import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { listLabTests, deactivateLabTest, activateLabTest, TEST_CATEGORIES } from '../api/labApi'

const STATUS_BADGE = {
  true:  'bg-green-100 text-green-700',
  false: 'bg-gray-100 text-gray-500',
}

export default function LabTestsPage() {
  const navigate = useNavigate()
  const [tests, setTests] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [filters, setFilters] = useState({ name: '', category: '', isActive: '' })

  const fetchTests = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = { page, size: 20 }
      if (filters.name) params.name = filters.name
      if (filters.category) params.category = filters.category
      if (filters.isActive !== '') params.isActive = filters.isActive
      const data = await listLabTests(params)
      setTests(data.content)
      setTotal(data.totalElements)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [page, filters])

  useEffect(() => { fetchTests() }, [fetchTests])

  const handleFilterChange = (e) => {
    setFilters((f) => ({ ...f, [e.target.name]: e.target.value }))
    setPage(0)
  }

  const handleToggleActive = async (e, test) => {
    e.stopPropagation()
    setActionError('')
    try {
      test.active ? await deactivateLabTest(test.testId) : await activateLabTest(test.testId)
      await fetchTests()
    } catch (err) {
      setActionError(err.message)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lab Tests</h1>
          <p className="text-sm text-gray-500">{total} test{total !== 1 ? 's' : ''} in catalog</p>
        </div>
        <button
          onClick={() => navigate('/lab-tests/new')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          + Add Test
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex gap-3 flex-wrap">
        <input
          name="name" placeholder="Search by name" value={filters.name} onChange={handleFilterChange}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-44"
        />
        <select
          name="category" value={filters.category} onChange={handleFilterChange}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Categories</option>
          {TEST_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select
          name="isActive" value={filters.isActive} onChange={handleFilterChange}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}
      {actionError && <div className="bg-orange-50 border border-orange-200 text-orange-700 px-4 py-3 rounded-lg mb-4 text-sm">{actionError}</div>}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="text-center py-10 text-gray-400">Loading…</div>
        ) : tests.length === 0 ? (
          <div className="text-center py-10 text-gray-400">No lab tests found</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Test</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Category</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Normal Range</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Price</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">TAT (hrs)</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tests.map((t) => (
                <tr key={t.testId} onClick={() => navigate(`/lab-tests/${t.testId}`)} className="hover:bg-gray-50 cursor-pointer">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{t.name}</p>
                    <p className="text-xs text-gray-400">{t.testId}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{t.category}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{t.normalRange || '—'} {t.unit && `(${t.unit})`}</td>
                  <td className="px-4 py-3 text-right text-gray-700">₹{Number(t.price).toFixed(2)}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{t.turnaroundHours}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[t.active]}`}>
                      {t.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => handleToggleActive(e, t)}
                      className={`px-2 py-1 text-xs rounded ${t.active ? 'bg-gray-50 text-gray-600 hover:bg-gray-100' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}
                    >
                      {t.active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {total > 20 && (
        <div className="flex justify-center gap-2 mt-4">
          <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="px-3 py-1 rounded border text-sm disabled:opacity-40">Prev</button>
          <span className="px-3 py-1 text-sm text-gray-600">Page {page + 1}</span>
          <button disabled={(page + 1) * 20 >= total} onClick={() => setPage((p) => p + 1)} className="px-3 py-1 rounded border text-sm disabled:opacity-40">Next</button>
        </div>
      )}
    </div>
  )
}
