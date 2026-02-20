import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { registerPatient, GENDERS, BLOOD_GROUPS } from '../api/patientApi'

const EMPTY_FORM = {
  firstName: '',
  lastName: '',
  dateOfBirth: '',
  gender: '',
  phoneNumber: '',
  email: '',
  address: '',
  city: '',
  state: '',
  zipCode: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  emergencyContactRelationship: '',
  bloodGroup: '',
  knownAllergies: '',
  chronicConditions: '',
}

export default function RegisterPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState(EMPTY_FORM)
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [globalError, setGlobalError] = useState(null)
  const [duplicateWarning, setDuplicateWarning] = useState(false)

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFieldErrors({})
    setGlobalError(null)
    setDuplicateWarning(false)
    setSubmitting(true)

    // Build payload — omit empty optional strings
    const payload = Object.fromEntries(
      Object.entries(form).filter(([, v]) => v !== '')
    )
    if (!payload.bloodGroup) delete payload.bloodGroup

    try {
      const patient = await registerPatient(payload)
      if (patient.duplicatePhoneWarning) {
        setDuplicateWarning(true)
        // Navigate after short delay so user sees the warning
        setTimeout(() => navigate(`/patients/${patient.patientId}`), 2000)
      } else {
        navigate(`/patients/${patient.patientId}`)
      }
    } catch (e) {
      // Check if it's a 400 validation error — message is a JSON-like field map
      // The API returns field errors in the data field; axios interceptor gives us the top-level message
      // Try to parse structured validation errors from the raw response
      setGlobalError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  const inputProps = (field) => ({
    id: field,
    value: form[field],
    onChange: set(field),
    className: `input ${fieldErrors[field] ? 'input-error' : ''}`,
  })

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button className="btn-secondary btn-sm" onClick={() => navigate('/patients')}>
          ← Back
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Register Patient</h1>
          <p className="text-sm text-gray-500">Add a new patient to the system</p>
        </div>
      </div>

      {/* Duplicate phone warning */}
      {duplicateWarning && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex gap-3">
          <span className="text-yellow-500">⚠️</span>
          <div>
            <p className="text-sm font-medium text-yellow-800">Duplicate Phone Warning</p>
            <p className="text-sm text-yellow-700">
              This phone number is already registered to another patient. Registration succeeded — redirecting...
            </p>
          </div>
        </div>
      )}

      {/* Global error */}
      {globalError && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
          <span className="text-red-500">⚠️</span>
          <p className="text-sm text-red-700">{globalError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Information */}
        <div className="card p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Personal Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="firstName">First Name <span className="text-red-500">*</span></label>
              <input {...inputProps('firstName')} placeholder="John" maxLength={50} required />
              {fieldErrors.firstName && <p className="error-text">{fieldErrors.firstName}</p>}
            </div>
            <div>
              <label className="label" htmlFor="lastName">Last Name <span className="text-red-500">*</span></label>
              <input {...inputProps('lastName')} placeholder="Doe" maxLength={50} required />
              {fieldErrors.lastName && <p className="error-text">{fieldErrors.lastName}</p>}
            </div>
            <div>
              <label className="label" htmlFor="dateOfBirth">Date of Birth <span className="text-red-500">*</span></label>
              <input type="date" {...inputProps('dateOfBirth')} required />
              {fieldErrors.dateOfBirth && <p className="error-text">{fieldErrors.dateOfBirth}</p>}
            </div>
            <div>
              <label className="label" htmlFor="gender">Gender <span className="text-red-500">*</span></label>
              <select {...inputProps('gender')} required>
                <option value="">Select gender</option>
                {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
              {fieldErrors.gender && <p className="error-text">{fieldErrors.gender}</p>}
            </div>
            <div>
              <label className="label" htmlFor="bloodGroup">Blood Group</label>
              <select {...inputProps('bloodGroup')}>
                <option value="">Unknown</option>
                {BLOOD_GROUPS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="card p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Contact Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="phoneNumber">Phone Number <span className="text-red-500">*</span></label>
              <input {...inputProps('phoneNumber')} placeholder="555-123-4567" maxLength={20} required />
              {fieldErrors.phoneNumber && <p className="error-text">{fieldErrors.phoneNumber}</p>}
            </div>
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input type="email" {...inputProps('email')} placeholder="john.doe@example.com" maxLength={100} />
              {fieldErrors.email && <p className="error-text">{fieldErrors.email}</p>}
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="address">Address</label>
              <input {...inputProps('address')} placeholder="123 Main St" maxLength={200} />
            </div>
            <div>
              <label className="label" htmlFor="city">City</label>
              <input {...inputProps('city')} placeholder="Springfield" />
            </div>
            <div>
              <label className="label" htmlFor="state">State</label>
              <input {...inputProps('state')} placeholder="IL" />
            </div>
            <div>
              <label className="label" htmlFor="zipCode">Zip Code</label>
              <input {...inputProps('zipCode')} placeholder="62701" maxLength={20} />
            </div>
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="card p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Emergency Contact</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="emergencyContactName">Contact Name</label>
              <input {...inputProps('emergencyContactName')} placeholder="Jane Doe" />
            </div>
            <div>
              <label className="label" htmlFor="emergencyContactPhone">Contact Phone</label>
              <input {...inputProps('emergencyContactPhone')} placeholder="555-987-6543" maxLength={20} />
            </div>
            <div>
              <label className="label" htmlFor="emergencyContactRelationship">Relationship</label>
              <input {...inputProps('emergencyContactRelationship')} placeholder="Spouse" />
            </div>
          </div>
        </div>

        {/* Medical Information */}
        <div className="card p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Medical Information</h2>
          <div className="space-y-4">
            <div>
              <label className="label" htmlFor="knownAllergies">Known Allergies</label>
              <textarea
                id="knownAllergies"
                rows={3}
                value={form.knownAllergies}
                onChange={set('knownAllergies')}
                className="input resize-none"
                placeholder="List any known allergies..."
              />
            </div>
            <div>
              <label className="label" htmlFor="chronicConditions">Chronic Conditions</label>
              <textarea
                id="chronicConditions"
                rows={3}
                value={form.chronicConditions}
                onChange={set('chronicConditions')}
                className="input resize-none"
                placeholder="List any chronic conditions..."
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pb-6">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => navigate('/patients')}
          >
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Registering...' : 'Register Patient'}
          </button>
        </div>
      </form>
    </div>
  )
}
