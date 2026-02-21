import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  searchDoctors,
  getAvailability,
  bookAppointment,
  APPOINTMENT_TYPES,
} from '../api/appointmentApi'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorAlert from '../components/ErrorAlert'

export default function BookAppointmentPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [form, setForm] = useState({
    patientId: '',
    doctorId: searchParams.get('doctorId') || '',
    appointmentDate: '',
    appointmentTime: '',
    appointmentType: 'CONSULTATION',
    reason: '',
  })

  const [doctors, setDoctors] = useState([])
  const [loadingDoctors, setLoadingDoctors] = useState(false)
  const [availability, setAvailability] = useState(null)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [slotsError, setSlotsError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)

  // Load active doctors for the dropdown
  useEffect(() => {
    setLoadingDoctors(true)
    searchDoctors({ status: 'ACTIVE', size: 100 })
      .then((data) => setDoctors(data.content || []))
      .catch(() => setDoctors([]))
      .finally(() => setLoadingDoctors(false))
  }, [])

  // Load availability when doctor + date both set
  useEffect(() => {
    if (!form.doctorId || !form.appointmentDate) {
      setAvailability(null)
      return
    }
    setLoadingSlots(true)
    setSlotsError(null)
    setForm((f) => ({ ...f, appointmentTime: '' }))
    getAvailability(form.doctorId, form.appointmentDate)
      .then(setAvailability)
      .catch((e) => setSlotsError(e.message))
      .finally(() => setLoadingSlots(false))
  }, [form.doctorId, form.appointmentDate])

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setSaveError(null)
    try {
      const payload = {
        patientId: form.patientId,
        doctorId: form.doctorId,
        appointmentDate: form.appointmentDate,
        appointmentTime: form.appointmentTime,
        appointmentType: form.appointmentType,
      }
      if (form.reason) payload.reason = form.reason
      const apt = await bookAppointment(payload)
      navigate(`/appointments/${apt.appointmentId}`)
    } catch (e) {
      setSaveError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <button className="btn-secondary btn-sm" onClick={() => navigate('/appointments')}>← Back</button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Book Appointment</h1>
          <p className="text-sm text-gray-500 mt-0.5">Schedule a new patient appointment</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {saveError && <ErrorAlert message={saveError} />}

        <div className="card p-5 space-y-4">
          <h2 className="text-base font-semibold text-gray-900">Patient & Doctor</h2>

          <div>
            <label className="label">Patient ID *</label>
            <input
              className="input"
              placeholder="e.g. P2026001"
              value={form.patientId}
              onChange={set('patientId')}
              required
            />
          </div>

          <div>
            <label className="label">Doctor *</label>
            {loadingDoctors ? (
              <div className="text-sm text-gray-500">Loading doctors...</div>
            ) : (
              <select className="input" value={form.doctorId} onChange={set('doctorId')} required>
                <option value="">— Select a doctor —</option>
                {doctors.map((d) => (
                  <option key={d.doctorId} value={d.doctorId}>
                    {d.fullName} · {d.specialization} ({d.consultationDurationMinutes} min)
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        <div className="card p-5 space-y-4">
          <h2 className="text-base font-semibold text-gray-900">Date & Time</h2>

          <div>
            <label className="label">Appointment Date *</label>
            <input
              type="date"
              className="input"
              value={form.appointmentDate}
              min={today}
              onChange={set('appointmentDate')}
              required
            />
          </div>

          {/* Availability slots */}
          {loadingSlots && <LoadingSpinner message="Checking availability..." />}
          {slotsError && <ErrorAlert message={slotsError} />}

          {availability && !loadingSlots && (
            <div>
              <label className="label">Available Slots ({availability.availableSlots?.length ?? 0} open)</label>
              {availability.availableSlots?.length === 0 ? (
                <p className="text-sm text-red-600 mt-1">No available slots for this date.</p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-1">
                  {availability.availableSlots.map((slot) => (
                    <button
                      key={slot.startTime}
                      type="button"
                      className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        form.appointmentTime === slot.startTime
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:text-blue-600'
                      }`}
                      onClick={() => setForm((f) => ({ ...f, appointmentTime: slot.startTime }))}
                    >
                      {slot.startTime}
                    </button>
                  ))}
                </div>
              )}

              {form.appointmentTime && (
                <input type="hidden" name="appointmentTime" value={form.appointmentTime} />
              )}
            </div>
          )}

          {/* Manual time entry if no availability data */}
          {!availability && !loadingSlots && (
            <div>
              <label className="label">Time *</label>
              <input
                type="time"
                className="input"
                value={form.appointmentTime}
                onChange={set('appointmentTime')}
                required
              />
            </div>
          )}
        </div>

        <div className="card p-5 space-y-4">
          <h2 className="text-base font-semibold text-gray-900">Details</h2>

          <div>
            <label className="label">Appointment Type *</label>
            <select className="input" value={form.appointmentType} onChange={set('appointmentType')} required>
              {APPOINTMENT_TYPES.map((t) => (
                <option key={t} value={t}>{t.replace('_', ' ')}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Reason</label>
            <textarea
              className="input resize-none"
              rows={3}
              maxLength={500}
              placeholder="Brief reason for the appointment..."
              value={form.reason}
              onChange={set('reason')}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pb-6">
          <button type="button" className="btn-secondary" onClick={() => navigate('/appointments')}>Cancel</button>
          <button
            type="submit"
            className="btn-primary"
            disabled={saving || !form.patientId || !form.doctorId || !form.appointmentDate || !form.appointmentTime}
          >
            {saving ? 'Booking...' : 'Book Appointment'}
          </button>
        </div>
      </form>
    </div>
  )
}
