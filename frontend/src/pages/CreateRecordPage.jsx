import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createRecord } from '../api/emrApi'
import ErrorAlert from '../components/ErrorAlert'

export default function CreateRecordPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    patientId: '',
    doctorId: '',
    appointmentId: '',
    chiefComplaint: '',
    clinicalNotes: '',
    diagnosisCode: '',
    diagnosisDescription: '',
    bloodPressureSystolic: '',
    bloodPressureDiastolic: '',
    heartRate: '',
    temperatureCelsius: '',
    weightKg: '',
    heightCm: '',
    oxygenSaturationPercent: '',
    respiratoryRate: '',
  })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setSaveError(null)
    try {
      const payload = { patientId: form.patientId, doctorId: form.doctorId, chiefComplaint: form.chiefComplaint }
      if (form.appointmentId) payload.appointmentId = form.appointmentId
      if (form.clinicalNotes) payload.clinicalNotes = form.clinicalNotes
      if (form.diagnosisCode) payload.diagnosisCode = form.diagnosisCode
      if (form.diagnosisDescription) payload.diagnosisDescription = form.diagnosisDescription
      // Vitals — only include non-empty numeric values
      const numericFields = [
        'bloodPressureSystolic', 'bloodPressureDiastolic', 'heartRate',
        'oxygenSaturationPercent', 'respiratoryRate',
      ]
      numericFields.forEach((f) => {
        if (form[f] !== '') payload[f] = parseInt(form[f])
      })
      const decimalFields = ['temperatureCelsius', 'weightKg', 'heightCm']
      decimalFields.forEach((f) => {
        if (form[f] !== '') payload[f] = parseFloat(form[f])
      })
      const rec = await createRecord(payload)
      navigate(`/records/${rec.recordId}`)
    } catch (e) {
      setSaveError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <button className="btn-secondary btn-sm" onClick={() => navigate('/records')}>← Back</button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Medical Record</h1>
          <p className="text-sm text-gray-500 mt-0.5">Create a new patient medical record</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {saveError && <ErrorAlert message={saveError} />}

        <div className="card p-5 space-y-4">
          <h2 className="text-base font-semibold text-gray-900">Identifiers</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Patient ID *</label>
              <input className="input" placeholder="P2026..." value={form.patientId} onChange={set('patientId')} required />
            </div>
            <div>
              <label className="label">Doctor ID *</label>
              <input className="input" placeholder="DR2026..." value={form.doctorId} onChange={set('doctorId')} required />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Appointment ID (optional)</label>
              <input className="input" placeholder="APT2026..." value={form.appointmentId} onChange={set('appointmentId')} />
            </div>
          </div>
        </div>

        <div className="card p-5 space-y-4">
          <h2 className="text-base font-semibold text-gray-900">Clinical Information</h2>
          <div>
            <label className="label">Chief Complaint *</label>
            <textarea
              className="input resize-none"
              rows={3}
              maxLength={2000}
              required
              value={form.chiefComplaint}
              onChange={set('chiefComplaint')}
              placeholder="Patient's primary complaint..."
            />
          </div>
          <div>
            <label className="label">Clinical Notes</label>
            <textarea
              className="input resize-none"
              rows={4}
              value={form.clinicalNotes}
              onChange={set('clinicalNotes')}
              placeholder="Examination findings, history, plan..."
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Diagnosis Code (ICD)</label>
              <input className="input" maxLength={20} placeholder="e.g. J06.9" value={form.diagnosisCode} onChange={set('diagnosisCode')} />
            </div>
            <div>
              <label className="label">Diagnosis Description</label>
              <input className="input" maxLength={500} placeholder="Brief diagnosis..." value={form.diagnosisDescription} onChange={set('diagnosisDescription')} />
            </div>
          </div>
        </div>

        <div className="card p-5 space-y-4">
          <h2 className="text-base font-semibold text-gray-900">Vitals <span className="text-sm font-normal text-gray-400">(optional)</span></h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="label">BP Systolic</label>
              <input type="number" className="input" placeholder="mmHg" value={form.bloodPressureSystolic} onChange={set('bloodPressureSystolic')} min={0} max={300} />
            </div>
            <div>
              <label className="label">BP Diastolic</label>
              <input type="number" className="input" placeholder="mmHg" value={form.bloodPressureDiastolic} onChange={set('bloodPressureDiastolic')} min={0} max={200} />
            </div>
            <div>
              <label className="label">Heart Rate</label>
              <input type="number" className="input" placeholder="bpm" value={form.heartRate} onChange={set('heartRate')} min={0} max={300} />
            </div>
            <div>
              <label className="label">SpO₂ %</label>
              <input type="number" className="input" placeholder="%" value={form.oxygenSaturationPercent} onChange={set('oxygenSaturationPercent')} min={0} max={100} />
            </div>
            <div>
              <label className="label">Temperature (°C)</label>
              <input type="number" step="0.1" className="input" placeholder="°C" value={form.temperatureCelsius} onChange={set('temperatureCelsius')} min={30} max={45} />
            </div>
            <div>
              <label className="label">Weight (kg)</label>
              <input type="number" step="0.1" className="input" placeholder="kg" value={form.weightKg} onChange={set('weightKg')} min={0} max={500} />
            </div>
            <div>
              <label className="label">Height (cm)</label>
              <input type="number" step="0.1" className="input" placeholder="cm" value={form.heightCm} onChange={set('heightCm')} min={0} max={300} />
            </div>
            <div>
              <label className="label">Resp. Rate</label>
              <input type="number" className="input" placeholder="/min" value={form.respiratoryRate} onChange={set('respiratoryRate')} min={0} max={100} />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pb-6">
          <button type="button" className="btn-secondary" onClick={() => navigate('/records')}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Creating...' : 'Create Record'}
          </button>
        </div>
      </form>
    </div>
  )
}
