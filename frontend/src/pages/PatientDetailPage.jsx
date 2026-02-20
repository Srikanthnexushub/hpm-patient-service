import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  getPatient,
  updatePatient,
  activatePatient,
  deactivatePatient,
  GENDERS,
  BLOOD_GROUPS,
} from '../api/patientApi'
import StatusBadge from '../components/StatusBadge'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorAlert from '../components/ErrorAlert'

const bloodGroupLabel = (val) =>
  BLOOD_GROUPS.find((b) => b.value === val)?.label ?? val ?? '—'

function DetailField({ label, value }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</dt>
      <dd className="mt-0.5 text-sm text-gray-900">{value || <span className="text-gray-400">—</span>}</dd>
    </div>
  )
}

export default function PatientDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [patient, setPatient] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [toggling, setToggling] = useState(false)
  const [toggleError, setToggleError] = useState(null)
  const [duplicateWarning, setDuplicateWarning] = useState(false)

  useEffect(() => {
    loadPatient()
  }, [id])

  const loadPatient = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getPatient(id)
      setPatient(data)
      setForm(buildForm(data))
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const buildForm = (p) => ({
    firstName: p.firstName ?? '',
    lastName: p.lastName ?? '',
    dateOfBirth: p.dateOfBirth ?? '',
    gender: p.gender ?? '',
    phoneNumber: p.phoneNumber ?? '',
    email: p.email ?? '',
    address: p.address ?? '',
    city: p.city ?? '',
    state: p.state ?? '',
    zipCode: p.zipCode ?? '',
    emergencyContactName: p.emergencyContactName ?? '',
    emergencyContactPhone: p.emergencyContactPhone ?? '',
    emergencyContactRelationship: p.emergencyContactRelationship ?? '',
    bloodGroup: p.bloodGroup ?? '',
    knownAllergies: p.knownAllergies ?? '',
    chronicConditions: p.chronicConditions ?? '',
  })

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setSaveError(null)
    setDuplicateWarning(false)
    const payload = Object.fromEntries(Object.entries(form).filter(([, v]) => v !== ''))
    if (!payload.bloodGroup) delete payload.bloodGroup
    try {
      const updated = await updatePatient(id, payload)
      setPatient(updated)
      setForm(buildForm(updated))
      setEditing(false)
      if (updated.duplicatePhoneWarning) setDuplicateWarning(true)
    } catch (e) {
      setSaveError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleToggleStatus = async () => {
    setToggling(true)
    setToggleError(null)
    try {
      const updated =
        patient.status === 'ACTIVE'
          ? await deactivatePatient(id)
          : await activatePatient(id)
      setPatient(updated)
    } catch (e) {
      setToggleError(e.message)
    } finally {
      setToggling(false)
    }
  }

  const inputCls = 'input'

  if (loading) return <LoadingSpinner message="Loading patient..." />
  if (error) return <ErrorAlert message={error} onRetry={loadPatient} />

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <button className="btn-secondary btn-sm" onClick={() => navigate('/patients')}>
            ← Back
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">
                {patient.firstName} {patient.lastName}
              </h1>
              <StatusBadge status={patient.status} />
            </div>
            <p className="text-sm text-gray-500 font-mono mt-0.5">{patient.patientId}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!editing && (
            <button className="btn-secondary btn-sm" onClick={() => { setEditing(true); setSaveError(null) }}>
              ✏️ Edit
            </button>
          )}
          <button
            className={`btn-sm ${patient.status === 'ACTIVE' ? 'btn-danger' : 'btn-success'}`}
            disabled={toggling}
            onClick={handleToggleStatus}
          >
            {toggling ? '...' : patient.status === 'ACTIVE' ? '🚫 Deactivate' : '✅ Activate'}
          </button>
        </div>
      </div>

      {/* Alerts */}
      {duplicateWarning && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex gap-3">
          <span className="text-yellow-500">⚠️</span>
          <p className="text-sm text-yellow-700">
            This phone number is already registered to another patient.
          </p>
        </div>
      )}
      {toggleError && <div className="mb-4"><ErrorAlert message={toggleError} /></div>}

      {editing ? (
        /* ── Edit Form ── */
        <form onSubmit={handleSave} className="space-y-5">
          {saveError && <ErrorAlert message={saveError} />}

          <div className="card p-5">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Personal Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">First Name *</label>
                <input className={inputCls} value={form.firstName} onChange={set('firstName')} maxLength={50} required />
              </div>
              <div>
                <label className="label">Last Name *</label>
                <input className={inputCls} value={form.lastName} onChange={set('lastName')} maxLength={50} required />
              </div>
              <div>
                <label className="label">Date of Birth *</label>
                <input type="date" className={inputCls} value={form.dateOfBirth} onChange={set('dateOfBirth')} required />
              </div>
              <div>
                <label className="label">Gender *</label>
                <select className={inputCls} value={form.gender} onChange={set('gender')} required>
                  <option value="">Select</option>
                  {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Blood Group</label>
                <select className={inputCls} value={form.bloodGroup} onChange={set('bloodGroup')}>
                  <option value="">Unknown</option>
                  {BLOOD_GROUPS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="card p-5">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Contact Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Phone Number *</label>
                <input className={inputCls} value={form.phoneNumber} onChange={set('phoneNumber')} maxLength={20} required />
              </div>
              <div>
                <label className="label">Email</label>
                <input type="email" className={inputCls} value={form.email} onChange={set('email')} maxLength={100} />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Address</label>
                <input className={inputCls} value={form.address} onChange={set('address')} maxLength={200} />
              </div>
              <div><label className="label">City</label><input className={inputCls} value={form.city} onChange={set('city')} /></div>
              <div><label className="label">State</label><input className={inputCls} value={form.state} onChange={set('state')} /></div>
              <div><label className="label">Zip Code</label><input className={inputCls} value={form.zipCode} onChange={set('zipCode')} maxLength={20} /></div>
            </div>
          </div>

          <div className="card p-5">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Emergency Contact</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className="label">Name</label><input className={inputCls} value={form.emergencyContactName} onChange={set('emergencyContactName')} /></div>
              <div><label className="label">Phone</label><input className={inputCls} value={form.emergencyContactPhone} onChange={set('emergencyContactPhone')} maxLength={20} /></div>
              <div><label className="label">Relationship</label><input className={inputCls} value={form.emergencyContactRelationship} onChange={set('emergencyContactRelationship')} /></div>
            </div>
          </div>

          <div className="card p-5">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Medical Information</h2>
            <div className="space-y-4">
              <div>
                <label className="label">Known Allergies</label>
                <textarea rows={3} className="input resize-none" value={form.knownAllergies} onChange={set('knownAllergies')} />
              </div>
              <div>
                <label className="label">Chronic Conditions</label>
                <textarea rows={3} className="input resize-none" value={form.chronicConditions} onChange={set('chronicConditions')} />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pb-6">
            <button type="button" className="btn-secondary" onClick={() => { setEditing(false); setForm(buildForm(patient)); setSaveError(null) }}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      ) : (
        /* ── View Mode ── */
        <div className="space-y-5">
          <div className="card p-5">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Personal Information</h2>
            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <DetailField label="First Name" value={patient.firstName} />
              <DetailField label="Last Name" value={patient.lastName} />
              <DetailField label="Date of Birth" value={patient.dateOfBirth} />
              <DetailField label="Age" value={patient.age != null ? `${patient.age} years` : null} />
              <DetailField label="Gender" value={patient.gender} />
              <DetailField label="Blood Group" value={bloodGroupLabel(patient.bloodGroup)} />
            </dl>
          </div>

          <div className="card p-5">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Contact Information</h2>
            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <DetailField label="Phone" value={patient.phoneNumber} />
              <DetailField label="Email" value={patient.email} />
              <DetailField label="Address" value={patient.address} />
              <DetailField label="City" value={patient.city} />
              <DetailField label="State" value={patient.state} />
              <DetailField label="Zip Code" value={patient.zipCode} />
            </dl>
          </div>

          {(patient.emergencyContactName || patient.emergencyContactPhone) && (
            <div className="card p-5">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Emergency Contact</h2>
              <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <DetailField label="Name" value={patient.emergencyContactName} />
                <DetailField label="Phone" value={patient.emergencyContactPhone} />
                <DetailField label="Relationship" value={patient.emergencyContactRelationship} />
              </dl>
            </div>
          )}

          {(patient.knownAllergies || patient.chronicConditions) && (
            <div className="card p-5">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Medical Information</h2>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {patient.knownAllergies && (
                  <div>
                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Known Allergies</dt>
                    <dd className="mt-0.5 text-sm text-gray-900 whitespace-pre-line">{patient.knownAllergies}</dd>
                  </div>
                )}
                {patient.chronicConditions && (
                  <div>
                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Chronic Conditions</dt>
                    <dd className="mt-0.5 text-sm text-gray-900 whitespace-pre-line">{patient.chronicConditions}</dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          {/* Audit */}
          <div className="card p-5 bg-gray-50">
            <h2 className="text-base font-semibold text-gray-700 mb-4">Audit Trail</h2>
            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <DetailField label="Created At" value={patient.createdAt?.replace('T', ' ').substring(0, 16)} />
              <DetailField label="Created By" value={patient.createdBy} />
              <DetailField label="Updated At" value={patient.updatedAt?.replace('T', ' ').substring(0, 16)} />
              <DetailField label="Updated By" value={patient.updatedBy} />
              {patient.deactivatedAt && <>
                <DetailField label="Deactivated At" value={patient.deactivatedAt?.replace('T', ' ').substring(0, 16)} />
                <DetailField label="Deactivated By" value={patient.deactivatedBy} />
              </>}
              {patient.activatedAt && <>
                <DetailField label="Activated At" value={patient.activatedAt?.replace('T', ' ').substring(0, 16)} />
                <DetailField label="Activated By" value={patient.activatedBy} />
              </>}
            </dl>
          </div>
        </div>
      )}
    </div>
  )
}
