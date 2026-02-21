import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  getRecord,
  updateRecord,
  finalizeRecord,
  amendRecord,
  getPrescriptions,
  addPrescription,
  discontinuePrescription,
} from '../api/emrApi'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorAlert from '../components/ErrorAlert'

const STATUS_COLORS = {
  DRAFT: 'bg-yellow-100 text-yellow-700',
  FINALIZED: 'bg-green-100 text-green-700',
  AMENDED: 'bg-blue-100 text-blue-700',
}

function Field({ label, value }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</dt>
      <dd className="mt-0.5 text-sm text-gray-900">{value ?? <span className="text-gray-400">—</span>}</dd>
    </div>
  )
}

function VitalItem({ label, value, unit }) {
  if (value == null || value === '') return null
  return (
    <div className="bg-gray-50 rounded-lg p-3 text-center">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-lg font-semibold text-gray-800">{value}<span className="text-xs font-normal text-gray-400 ml-1">{unit}</span></p>
    </div>
  )
}

export default function RecordDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [record, setRecord] = useState(null)
  const [prescriptions, setPrescriptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actioning, setActioning] = useState(false)
  const [actionError, setActionError] = useState(null)

  // Edit form
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)

  // Add prescription
  const [showPrescForm, setShowPrescForm] = useState(false)
  const [prescForm, setPrescForm] = useState({ medicationName: '', dosage: '', frequency: '', durationDays: '', instructions: '' })
  const [addingPresc, setAddingPresc] = useState(false)
  const [prescError, setPrescError] = useState(null)

  // Discontinue modal
  const [discontinuing, setDiscontinuing] = useState(null) // prescriptionId
  const [discReason, setDiscReason] = useState('')
  const [discError, setDiscError] = useState(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [rec, prescs] = await Promise.all([getRecord(id), getPrescriptions(id)])
      setRecord(rec)
      setPrescriptions(prescs)
      setEditForm(buildEditForm(rec))
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  const buildEditForm = (r) => ({
    chiefComplaint: r.chiefComplaint ?? '',
    clinicalNotes: r.clinicalNotes ?? '',
    diagnosisCode: r.diagnosisCode ?? '',
    diagnosisDescription: r.diagnosisDescription ?? '',
    bloodPressureSystolic: r.bloodPressureSystolic ?? '',
    bloodPressureDiastolic: r.bloodPressureDiastolic ?? '',
    heartRate: r.heartRate ?? '',
    temperatureCelsius: r.temperatureCelsius ?? '',
    weightKg: r.weightKg ?? '',
    heightCm: r.heightCm ?? '',
    oxygenSaturationPercent: r.oxygenSaturationPercent ?? '',
    respiratoryRate: r.respiratoryRate ?? '',
  })

  const setE = (field) => (e) => setEditForm((f) => ({ ...f, [field]: e.target.value }))
  const setP = (field) => (e) => setPrescForm((f) => ({ ...f, [field]: e.target.value }))

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setSaveError(null)
    try {
      const payload = {}
      if (editForm.chiefComplaint) payload.chiefComplaint = editForm.chiefComplaint
      if (editForm.clinicalNotes) payload.clinicalNotes = editForm.clinicalNotes
      if (editForm.diagnosisCode) payload.diagnosisCode = editForm.diagnosisCode
      if (editForm.diagnosisDescription) payload.diagnosisDescription = editForm.diagnosisDescription
      const intFields = ['bloodPressureSystolic', 'bloodPressureDiastolic', 'heartRate', 'oxygenSaturationPercent', 'respiratoryRate']
      intFields.forEach((f) => { if (editForm[f] !== '') payload[f] = parseInt(editForm[f]) })
      const decFields = ['temperatureCelsius', 'weightKg', 'heightCm']
      decFields.forEach((f) => { if (editForm[f] !== '') payload[f] = parseFloat(editForm[f]) })
      const updated = await updateRecord(id, payload)
      setRecord(updated)
      setEditForm(buildEditForm(updated))
      setEditing(false)
    } catch (e) {
      setSaveError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const doAction = async (fn) => {
    setActioning(true)
    setActionError(null)
    try {
      const updated = await fn()
      setRecord(updated)
    } catch (e) {
      setActionError(e.message)
    } finally {
      setActioning(false)
    }
  }

  const handleFinalize = () => doAction(() => finalizeRecord(id))
  const handleAmend = () => doAction(() => amendRecord(id))

  const handleAddPrescription = async (e) => {
    e.preventDefault()
    setAddingPresc(true)
    setPrescError(null)
    try {
      const payload = {
        medicationName: prescForm.medicationName,
        dosage: prescForm.dosage,
        frequency: prescForm.frequency,
        durationDays: parseInt(prescForm.durationDays),
      }
      if (prescForm.instructions) payload.instructions = prescForm.instructions
      const newPresc = await addPrescription(id, payload)
      setPrescriptions((prev) => [...prev, newPresc])
      setPrescForm({ medicationName: '', dosage: '', frequency: '', durationDays: '', instructions: '' })
      setShowPrescForm(false)
    } catch (e) {
      setPrescError(e.message)
    } finally {
      setAddingPresc(false)
    }
  }

  const handleDiscontinue = async (e) => {
    e.preventDefault()
    setDiscError(null)
    try {
      const updated = await discontinuePrescription(id, discontinuing, discReason)
      setPrescriptions((prev) => prev.map((p) => p.prescriptionId === discontinuing ? updated : p))
      setDiscontinuing(null)
      setDiscReason('')
    } catch (e) {
      setDiscError(e.message)
    }
  }

  if (loading) return <LoadingSpinner message="Loading medical record..." />
  if (error) return <ErrorAlert message={error} onRetry={load} />

  const isDraft = record.status === 'DRAFT'
  const canFinalize = isDraft
  const canAmend = record.status === 'FINALIZED'
  const canEdit = isDraft || record.status === 'AMENDED'
  const canAddPresc = isDraft || record.status === 'AMENDED'

  const hasVitals = [
    record.bloodPressureSystolic, record.bloodPressureDiastolic,
    record.heartRate, record.temperatureCelsius, record.weightKg,
    record.heightCm, record.oxygenSaturationPercent, record.respiratoryRate,
  ].some((v) => v != null)

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <button className="btn-secondary btn-sm" onClick={() => navigate('/records')}>← Back</button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-gray-900">{record.recordId}</h1>
              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[record.status] || ''}`}>
                {record.status}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">Patient: {record.patientId} · Doctor: {record.doctorId}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          {canEdit && !editing && (
            <button className="btn-secondary btn-sm" onClick={() => { setEditing(true); setSaveError(null) }}>
              ✏️ Edit
            </button>
          )}
          {canFinalize && (
            <button className="btn-success btn-sm" disabled={actioning} onClick={handleFinalize}>
              {actioning ? '...' : 'Finalize'}
            </button>
          )}
          {canAmend && (
            <button className="btn-primary btn-sm" disabled={actioning} onClick={handleAmend}>
              {actioning ? '...' : 'Amend'}
            </button>
          )}
        </div>
      </div>

      {actionError && <div className="mb-4"><ErrorAlert message={actionError} /></div>}

      {editing ? (
        <form onSubmit={handleSave} className="space-y-5">
          {saveError && <ErrorAlert message={saveError} />}

          <div className="card p-5 space-y-4">
            <h2 className="text-base font-semibold text-gray-900">Clinical Information</h2>
            <div>
              <label className="label">Chief Complaint *</label>
              <textarea className="input resize-none" rows={3} maxLength={2000} required value={editForm.chiefComplaint} onChange={setE('chiefComplaint')} />
            </div>
            <div>
              <label className="label">Clinical Notes</label>
              <textarea className="input resize-none" rows={4} value={editForm.clinicalNotes} onChange={setE('clinicalNotes')} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Diagnosis Code (ICD)</label>
                <input className="input" maxLength={20} value={editForm.diagnosisCode} onChange={setE('diagnosisCode')} />
              </div>
              <div>
                <label className="label">Diagnosis Description</label>
                <input className="input" maxLength={500} value={editForm.diagnosisDescription} onChange={setE('diagnosisDescription')} />
              </div>
            </div>
          </div>

          <div className="card p-5 space-y-4">
            <h2 className="text-base font-semibold text-gray-900">Vitals</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div><label className="label">BP Systolic</label><input type="number" className="input" value={editForm.bloodPressureSystolic} onChange={setE('bloodPressureSystolic')} /></div>
              <div><label className="label">BP Diastolic</label><input type="number" className="input" value={editForm.bloodPressureDiastolic} onChange={setE('bloodPressureDiastolic')} /></div>
              <div><label className="label">Heart Rate</label><input type="number" className="input" value={editForm.heartRate} onChange={setE('heartRate')} /></div>
              <div><label className="label">SpO₂ %</label><input type="number" className="input" value={editForm.oxygenSaturationPercent} onChange={setE('oxygenSaturationPercent')} /></div>
              <div><label className="label">Temp (°C)</label><input type="number" step="0.1" className="input" value={editForm.temperatureCelsius} onChange={setE('temperatureCelsius')} /></div>
              <div><label className="label">Weight (kg)</label><input type="number" step="0.1" className="input" value={editForm.weightKg} onChange={setE('weightKg')} /></div>
              <div><label className="label">Height (cm)</label><input type="number" step="0.1" className="input" value={editForm.heightCm} onChange={setE('heightCm')} /></div>
              <div><label className="label">Resp. Rate</label><input type="number" className="input" value={editForm.respiratoryRate} onChange={setE('respiratoryRate')} /></div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pb-4">
            <button type="button" className="btn-secondary" onClick={() => { setEditing(false); setEditForm(buildEditForm(record)); setSaveError(null) }}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
          </div>
        </form>
      ) : (
        <div className="space-y-5">
          {/* Clinical info */}
          <div className="card p-5">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Clinical Information</h2>
            <dl className="space-y-4">
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Chief Complaint</dt>
                <dd className="mt-0.5 text-sm text-gray-900 whitespace-pre-line">{record.chiefComplaint}</dd>
              </div>
              {record.clinicalNotes && (
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Clinical Notes</dt>
                  <dd className="mt-0.5 text-sm text-gray-900 whitespace-pre-line">{record.clinicalNotes}</dd>
                </div>
              )}
              {(record.diagnosisCode || record.diagnosisDescription) && (
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Diagnosis Code" value={record.diagnosisCode} />
                  <Field label="Diagnosis Description" value={record.diagnosisDescription} />
                </div>
              )}
            </dl>
          </div>

          {/* Vitals */}
          {hasVitals && (
            <div className="card p-5">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Vitals</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <VitalItem label="BP Systolic" value={record.bloodPressureSystolic} unit="mmHg" />
                <VitalItem label="BP Diastolic" value={record.bloodPressureDiastolic} unit="mmHg" />
                <VitalItem label="Heart Rate" value={record.heartRate} unit="bpm" />
                <VitalItem label="SpO₂" value={record.oxygenSaturationPercent} unit="%" />
                <VitalItem label="Temperature" value={record.temperatureCelsius} unit="°C" />
                <VitalItem label="Weight" value={record.weightKg} unit="kg" />
                <VitalItem label="Height" value={record.heightCm} unit="cm" />
                <VitalItem label="Resp. Rate" value={record.respiratoryRate} unit="/min" />
              </div>
            </div>
          )}

          {/* Prescriptions */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900">
                Prescriptions <span className="text-sm font-normal text-gray-400">({prescriptions.length})</span>
              </h2>
              {canAddPresc && (
                <button className="btn-primary btn-sm" onClick={() => { setShowPrescForm(true); setPrescError(null) }}>
                  + Add Prescription
                </button>
              )}
            </div>

            {prescriptions.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No prescriptions yet</p>
            ) : (
              <div className="space-y-3">
                {prescriptions.map((p) => (
                  <div key={p.prescriptionId} className={`border rounded-lg p-4 ${p.status === 'DISCONTINUED' ? 'opacity-60 bg-gray-50' : 'bg-white border-gray-200'}`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{p.medicationName}</p>
                        <p className="text-sm text-gray-600 mt-0.5">{p.dosage} · {p.frequency} · {p.durationDays} days</p>
                        {p.instructions && <p className="text-xs text-gray-500 mt-1">{p.instructions}</p>}
                        {p.status === 'DISCONTINUED' && p.discontinuedReason && (
                          <p className="text-xs text-red-500 mt-1">Discontinued: {p.discontinuedReason}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${p.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                          {p.status}
                        </span>
                        {p.status === 'ACTIVE' && canAddPresc && (
                          <button
                            className="btn-danger btn-sm"
                            onClick={() => { setDiscontinuing(p.prescriptionId); setDiscReason(''); setDiscError(null) }}
                          >
                            Stop
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">ID: {p.prescriptionId} · Added {p.createdAt?.substring(0, 10)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Audit */}
          <div className="card p-5 bg-gray-50">
            <h2 className="text-base font-semibold text-gray-700 mb-4">Audit Trail</h2>
            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <Field label="Created At" value={record.createdAt?.replace('T', ' ').substring(0, 16)} />
              <Field label="Created By" value={record.createdBy} />
              <Field label="Updated At" value={record.updatedAt?.replace('T', ' ').substring(0, 16)} />
              <Field label="Updated By" value={record.updatedBy} />
              {record.finalizedAt && <Field label="Finalized At" value={record.finalizedAt?.replace('T', ' ').substring(0, 16)} />}
              {record.finalizedBy && <Field label="Finalized By" value={record.finalizedBy} />}
              {record.appointmentId && <Field label="Appointment" value={record.appointmentId} />}
            </dl>
          </div>
        </div>
      )}

      {/* Add Prescription Modal */}
      {showPrescForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Prescription</h3>
            <form onSubmit={handleAddPrescription} className="space-y-4">
              {prescError && <ErrorAlert message={prescError} />}
              <div>
                <label className="label">Medication Name *</label>
                <input className="input" maxLength={200} required value={prescForm.medicationName} onChange={setP('medicationName')} placeholder="e.g. Amoxicillin 500mg" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Dosage *</label>
                  <input className="input" maxLength={100} required value={prescForm.dosage} onChange={setP('dosage')} placeholder="e.g. 500mg" />
                </div>
                <div>
                  <label className="label">Frequency *</label>
                  <input className="input" maxLength={100} required value={prescForm.frequency} onChange={setP('frequency')} placeholder="e.g. 3 times daily" />
                </div>
              </div>
              <div>
                <label className="label">Duration (days) *</label>
                <input type="number" className="input" required min={1} value={prescForm.durationDays} onChange={setP('durationDays')} />
              </div>
              <div>
                <label className="label">Instructions</label>
                <textarea className="input resize-none" rows={2} value={prescForm.instructions} onChange={setP('instructions')} placeholder="e.g. Take with food" />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" className="btn-secondary" onClick={() => setShowPrescForm(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={addingPresc}>
                  {addingPresc ? 'Adding...' : 'Add Prescription'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Discontinue Modal */}
      {discontinuing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Discontinue Prescription</h3>
            <form onSubmit={handleDiscontinue}>
              {discError && <div className="mb-4"><ErrorAlert message={discError} /></div>}
              <div className="mb-4">
                <label className="label">Reason *</label>
                <textarea
                  className="input resize-none"
                  rows={3}
                  required
                  value={discReason}
                  onChange={(e) => setDiscReason(e.target.value)}
                  placeholder="Reason for discontinuing..."
                />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" className="btn-secondary" onClick={() => setDiscontinuing(null)}>Cancel</button>
                <button type="submit" className="btn-danger" disabled={!discReason.trim()}>Discontinue</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
