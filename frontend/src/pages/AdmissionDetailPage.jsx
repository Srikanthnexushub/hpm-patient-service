import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getAdmission, listBeds, transferPatient, dischargePatient } from '../api/bedApi'

const STATUS_BADGE = {
  ADMITTED:   'bg-blue-100 text-blue-700',
  DISCHARGED: 'bg-gray-100 text-gray-500',
}

export default function AdmissionDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [admission, setAdmission] = useState(null)
  const [availableBeds, setAvailableBeds] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showTransfer, setShowTransfer] = useState(false)
  const [showDischarge, setShowDischarge] = useState(false)
  const [newBedId, setNewBedId] = useState('')
  const [dischargeNotes, setDischargeNotes] = useState('')
  const [actionError, setActionError] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const fetchAdmission = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await getAdmission(id)
      setAdmission(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAdmission() }, [id])

  useEffect(() => {
    if (showTransfer) {
      listBeds({ status: 'AVAILABLE' })
        .then((data) => setAvailableBeds(Array.isArray(data) ? data : []))
        .catch(() => {})
    }
  }, [showTransfer])

  const handleTransfer = async () => {
    if (!newBedId) return
    setActionLoading(true)
    setActionError('')
    try {
      await transferPatient(id, newBedId)
      setShowTransfer(false)
      setNewBedId('')
      fetchAdmission()
    } catch (e) {
      setActionError(e.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleDischarge = async () => {
    setActionLoading(true)
    setActionError('')
    try {
      await dischargePatient(id, dischargeNotes)
      setShowDischarge(false)
      fetchAdmission()
    } catch (e) {
      setActionError(e.message)
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) return <div className="text-center py-10 text-gray-400">Loading…</div>
  if (error) return <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
  if (!admission) return null

  const isAdmitted = admission.status === 'ADMITTED'

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <button onClick={() => navigate('/admissions')} className="text-sm text-blue-600 hover:underline mb-2">← Back to Admissions</button>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">{admission.admissionId}</h1>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_BADGE[admission.status] || 'bg-gray-100 text-gray-700'}`}>
            {admission.status}
          </span>
        </div>
      </div>

      {/* Details */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
        <h2 className="font-semibold text-gray-800 mb-4">Admission Details</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Patient ID</p>
            <p className="font-medium text-gray-900">{admission.patientId}</p>
          </div>
          <div>
            <p className="text-gray-500">Bed</p>
            <p className="font-medium text-gray-900">Bed {admission.bedNumber}</p>
          </div>
          <div>
            <p className="text-gray-500">Ward</p>
            <p className="font-medium text-gray-900">{admission.wardName}</p>
          </div>
          <div>
            <p className="text-gray-500">Ward ID</p>
            <p className="font-medium text-gray-900">{admission.wardId}</p>
          </div>
          <div>
            <p className="text-gray-500">Admitted At</p>
            <p className="font-medium text-gray-900">{admission.admittedAt?.replace('T', ' ').slice(0, 16)}</p>
          </div>
          {admission.dischargedAt && (
            <div>
              <p className="text-gray-500">Discharged At</p>
              <p className="font-medium text-gray-900">{admission.dischargedAt?.replace('T', ' ').slice(0, 16)}</p>
            </div>
          )}
          <div className="col-span-2">
            <p className="text-gray-500">Admission Reason</p>
            <p className="font-medium text-gray-900 mt-1">{admission.admitReason}</p>
          </div>
          {admission.dischargeNotes && (
            <div className="col-span-2">
              <p className="text-gray-500">Discharge Notes</p>
              <p className="font-medium text-gray-900 mt-1">{admission.dischargeNotes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      {isAdmitted && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-800 mb-4">Actions</h2>

          {actionError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{actionError}</div>
          )}

          {/* Transfer */}
          {!showDischarge && (
            <div className="mb-4">
              {!showTransfer ? (
                <button onClick={() => { setShowTransfer(true); setShowDischarge(false); setActionError('') }}
                  className="px-4 py-2 bg-orange-50 text-orange-700 border border-orange-200 rounded-lg text-sm font-medium hover:bg-orange-100">
                  Transfer to Another Bed
                </button>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-gray-700">Select New Bed ({availableBeds.length} available)</p>
                  <select value={newBedId} onChange={(e) => setNewBedId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Select a bed…</option>
                    {availableBeds.filter((b) => b.bedId !== admission.bedId).map((b) => (
                      <option key={b.bedId} value={b.bedId}>
                        Bed {b.bedNumber} — {b.wardName} ({b.bedType})
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <button onClick={() => setShowTransfer(false)}
                      className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
                    <button onClick={handleTransfer} disabled={actionLoading || !newBedId}
                      className="px-3 py-1.5 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-60">
                      {actionLoading ? 'Transferring…' : 'Confirm Transfer'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Discharge */}
          {!showTransfer && (
            <div>
              {!showDischarge ? (
                <button onClick={() => { setShowDischarge(true); setShowTransfer(false); setActionError('') }}
                  className="px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm font-medium hover:bg-red-100">
                  Discharge Patient
                </button>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-gray-700">Discharge Notes (optional)</p>
                  <textarea rows={3} value={dischargeNotes} onChange={(e) => setDischargeNotes(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Add discharge notes…" />
                  <div className="flex gap-2">
                    <button onClick={() => setShowDischarge(false)}
                      className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
                    <button onClick={handleDischarge} disabled={actionLoading}
                      className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-60">
                      {actionLoading ? 'Discharging…' : 'Confirm Discharge'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Audit */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 mt-4 text-xs text-gray-400 space-y-1">
        <p>Created: {admission.createdAt?.replace('T', ' ').slice(0, 16)} by {admission.createdBy}</p>
        {admission.updatedAt && <p>Updated: {admission.updatedAt?.replace('T', ' ').slice(0, 16)} by {admission.updatedBy}</p>}
      </div>
    </div>
  )
}
