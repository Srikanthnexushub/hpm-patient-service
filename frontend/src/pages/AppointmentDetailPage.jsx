import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  getAppointment,
  confirmAppointment,
  cancelAppointment,
  completeAppointment,
  noShowAppointment,
} from '../api/appointmentApi'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorAlert from '../components/ErrorAlert'

const STATUS_COLORS = {
  SCHEDULED: 'bg-blue-100 text-blue-800',
  CONFIRMED: 'bg-green-100 text-green-800',
  COMPLETED: 'bg-gray-100 text-gray-700',
  CANCELLED: 'bg-red-100 text-red-700',
  NO_SHOW: 'bg-yellow-100 text-yellow-700',
}

function Field({ label, value }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</dt>
      <dd className="mt-0.5 text-sm text-gray-900">{value || <span className="text-gray-400">—</span>}</dd>
    </div>
  )
}

export default function AppointmentDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [apt, setApt] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actioning, setActioning] = useState(false)
  const [actionError, setActionError] = useState(null)

  // Cancel modal
  const [showCancel, setShowCancel] = useState(false)
  const [cancelReason, setCancelReason] = useState('')

  // Complete modal
  const [showComplete, setShowComplete] = useState(false)
  const [completionNotes, setCompletionNotes] = useState('')

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getAppointment(id)
      setApt(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  const doAction = async (fn) => {
    setActioning(true)
    setActionError(null)
    try {
      const updated = await fn()
      setApt(updated)
    } catch (e) {
      setActionError(e.message)
    } finally {
      setActioning(false)
    }
  }

  const handleConfirm = () => doAction(() => confirmAppointment(id))
  const handleNoShow = () => doAction(() => noShowAppointment(id))

  const handleCancel = async (e) => {
    e.preventDefault()
    setShowCancel(false)
    doAction(() => cancelAppointment(id, cancelReason))
    setCancelReason('')
  }

  const handleComplete = async (e) => {
    e.preventDefault()
    setShowComplete(false)
    doAction(() => completeAppointment(id, completionNotes))
    setCompletionNotes('')
  }

  if (loading) return <LoadingSpinner message="Loading appointment..." />
  if (error) return <ErrorAlert message={error} onRetry={load} />

  const canConfirm = apt.status === 'SCHEDULED'
  const canCancel = apt.status === 'SCHEDULED' || apt.status === 'CONFIRMED'
  const canComplete = apt.status === 'CONFIRMED'
  const canNoShow = apt.status === 'CONFIRMED'

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <button className="btn-secondary btn-sm" onClick={() => navigate('/appointments')}>← Back</button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-gray-900">{apt.appointmentId}</h1>
              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[apt.status] || ''}`}>
                {apt.status}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">{apt.appointmentDate} at {apt.appointmentTime}</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {canConfirm && (
            <button className="btn-success btn-sm" disabled={actioning} onClick={handleConfirm}>
              {actioning ? '...' : 'Confirm'}
            </button>
          )}
          {canComplete && (
            <button className="btn-primary btn-sm" disabled={actioning} onClick={() => setShowComplete(true)}>
              Complete
            </button>
          )}
          {canNoShow && (
            <button className="btn-secondary btn-sm" disabled={actioning} onClick={handleNoShow}>
              No Show
            </button>
          )}
          {canCancel && (
            <button className="btn-danger btn-sm" disabled={actioning} onClick={() => setShowCancel(true)}>
              Cancel
            </button>
          )}
        </div>
      </div>

      {actionError && <div className="mb-4"><ErrorAlert message={actionError} /></div>}

      <div className="space-y-5">
        <div className="card p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Appointment Details</h2>
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Field label="Patient ID" value={apt.patientId} />
            <Field label="Doctor" value={apt.doctorName} />
            <Field label="Specialization" value={apt.doctorSpecialization} />
            <Field label="Date" value={apt.appointmentDate} />
            <Field label="Time" value={apt.appointmentTime} />
            <Field label="Duration" value={apt.durationMinutes ? `${apt.durationMinutes} min` : null} />
            <Field label="Type" value={apt.appointmentType?.replace('_', ' ')} />
            <Field label="Doctor ID" value={apt.doctorId} />
          </dl>
        </div>

        {(apt.reason || apt.notes) && (
          <div className="card p-5">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Notes</h2>
            <dl className="space-y-3">
              {apt.reason && (
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Reason</dt>
                  <dd className="mt-0.5 text-sm text-gray-900 whitespace-pre-line">{apt.reason}</dd>
                </div>
              )}
              {apt.notes && (
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Clinical Notes</dt>
                  <dd className="mt-0.5 text-sm text-gray-900 whitespace-pre-line">{apt.notes}</dd>
                </div>
              )}
              {apt.cancellationReason && (
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Cancellation Reason</dt>
                  <dd className="mt-0.5 text-sm text-red-700 whitespace-pre-line">{apt.cancellationReason}</dd>
                </div>
              )}
            </dl>
          </div>
        )}

        <div className="card p-5 bg-gray-50">
          <h2 className="text-base font-semibold text-gray-700 mb-4">Audit Trail</h2>
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Field label="Created At" value={apt.createdAt?.replace('T', ' ').substring(0, 16)} />
            <Field label="Created By" value={apt.createdBy} />
            {apt.confirmedAt && <Field label="Confirmed At" value={apt.confirmedAt?.replace('T', ' ').substring(0, 16)} />}
            {apt.confirmedBy && <Field label="Confirmed By" value={apt.confirmedBy} />}
            {apt.completedAt && <Field label="Completed At" value={apt.completedAt?.replace('T', ' ').substring(0, 16)} />}
            {apt.completedBy && <Field label="Completed By" value={apt.completedBy} />}
            {apt.cancelledAt && <Field label="Cancelled At" value={apt.cancelledAt?.replace('T', ' ').substring(0, 16)} />}
            {apt.cancelledBy && <Field label="Cancelled By" value={apt.cancelledBy} />}
            {apt.noShowAt && <Field label="No-Show At" value={apt.noShowAt?.replace('T', ' ').substring(0, 16)} />}
          </dl>
        </div>
      </div>

      {/* Cancel Modal */}
      {showCancel && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Cancel Appointment</h3>
            <form onSubmit={handleCancel}>
              <div className="mb-4">
                <label className="label">Cancellation Reason *</label>
                <textarea
                  className="input resize-none"
                  rows={3}
                  maxLength={500}
                  required
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Please provide a reason..."
                />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" className="btn-secondary" onClick={() => setShowCancel(false)}>Back</button>
                <button type="submit" className="btn-danger" disabled={!cancelReason.trim()}>Cancel Appointment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complete Modal */}
      {showComplete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Complete Appointment</h3>
            <form onSubmit={handleComplete}>
              <div className="mb-4">
                <label className="label">Completion Notes (optional)</label>
                <textarea
                  className="input resize-none"
                  rows={3}
                  maxLength={1000}
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  placeholder="Any notes about the completed appointment..."
                />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" className="btn-secondary" onClick={() => setShowComplete(false)}>Back</button>
                <button type="submit" className="btn-primary">Mark Complete</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
