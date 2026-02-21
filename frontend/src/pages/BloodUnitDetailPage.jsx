import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getUnit, discardUnit } from '../api/bloodBankApi'

const STATUS_BADGE = {
  AVAILABLE: 'bg-green-100 text-green-700',
  USED:      'bg-gray-100 text-gray-600',
  EXPIRED:   'bg-red-100 text-red-600',
  DISCARDED: 'bg-yellow-100 text-yellow-700',
}

export default function BloodUnitDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [unit, setUnit] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [discarding, setDiscarding] = useState(false)

  useEffect(() => {
    const fetchUnit = async () => {
      setLoading(true)
      setError('')
      try {
        const data = await getUnit(id)
        setUnit(data)
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    fetchUnit()
  }, [id])

  const handleDiscard = async () => {
    if (!window.confirm('Discard this blood unit? This cannot be undone.')) return
    setDiscarding(true)
    setActionError('')
    try {
      const updated = await discardUnit(id)
      setUnit(updated)
    } catch (e) {
      setActionError(e.message)
    } finally {
      setDiscarding(false)
    }
  }

  if (loading) return <div className="text-center py-16 text-gray-400">Loading…</div>
  if (error) return (
    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
  )
  if (!unit) return null

  const today = new Date().toISOString().slice(0, 10)
  const isExpired = unit.expiresAt < today
  const daysToExpiry = Math.ceil((new Date(unit.expiresAt) - new Date(today)) / (1000 * 60 * 60 * 24))

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/blood-units')}
          className="text-sm text-gray-500 hover:text-gray-700">← Back</button>
        <h1 className="text-2xl font-bold text-gray-900">{unit.unitId}</h1>
        <span className="px-3 py-1 rounded-full text-sm font-bold bg-red-100 text-red-700">
          {unit.bloodGroup}
        </span>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_BADGE[unit.status] || 'bg-gray-100 text-gray-600'}`}>
          {unit.status}
        </span>
      </div>

      {actionError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-5 text-sm">{actionError}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Details */}
        <div className="md:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-800 mb-4">Unit Details</h2>
          <dl className="grid grid-cols-2 gap-y-3 gap-x-6 text-sm">
            <div>
              <dt className="text-gray-500">Blood Group</dt>
              <dd className="font-bold text-red-700 text-lg">{unit.bloodGroup}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Status</dt>
              <dd className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[unit.status] || 'bg-gray-100 text-gray-600'}`}>
                {unit.status}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Donor Name</dt>
              <dd className="font-medium text-gray-900">{unit.donorName}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Donor Age</dt>
              <dd className="font-medium text-gray-900">{unit.donorAge} years</dd>
            </div>
            <div>
              <dt className="text-gray-500">Donor Phone</dt>
              <dd className="font-medium text-gray-900">{unit.donorPhone}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Donated At</dt>
              <dd className="font-medium text-gray-900">{unit.donatedAt}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Expires At</dt>
              <dd className={`font-medium ${isExpired ? 'text-red-600' : daysToExpiry <= 7 ? 'text-orange-600' : 'text-gray-900'}`}>
                {unit.expiresAt}
                {unit.status === 'AVAILABLE' && !isExpired && (
                  <span className="ml-1 text-xs">({daysToExpiry}d remaining)</span>
                )}
                {unit.status === 'AVAILABLE' && isExpired && (
                  <span className="ml-1 text-xs text-red-600">(expired)</span>
                )}
              </dd>
            </div>
            {unit.requestId && (
              <div>
                <dt className="text-gray-500">Used For Request</dt>
                <dd
                  className="font-medium text-blue-600 cursor-pointer hover:underline"
                  onClick={() => navigate(`/blood-requests/${unit.requestId}`)}
                >
                  {unit.requestId}
                </dd>
              </div>
            )}
            <div>
              <dt className="text-gray-500">Registered By</dt>
              <dd className="font-medium text-gray-900">{unit.createdBy}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Registered At</dt>
              <dd className="font-medium text-gray-900">{unit.createdAt?.replace('T', ' ').slice(0, 16)}</dd>
            </div>
          </dl>
        </div>

        {/* Actions */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-800 mb-4">Actions</h2>
          {unit.status === 'AVAILABLE' ? (
            <button
              onClick={handleDiscard}
              disabled={discarding}
              className="w-full px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 disabled:opacity-60"
            >
              {discarding ? 'Discarding…' : 'Discard Unit'}
            </button>
          ) : (
            <p className="text-sm text-gray-500">
              No actions available for <span className="font-medium">{unit.status}</span> units.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
