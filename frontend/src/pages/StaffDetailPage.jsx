import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getStaff, updateStaff, deactivateStaff, activateStaff, STAFF_ROLES, DEPARTMENTS } from '../api/staffApi'

const STATUS_BADGE = {
  ACTIVE:     'bg-green-100 text-green-700',
  ON_LEAVE:   'bg-yellow-100 text-yellow-700',
  RESIGNED:   'bg-gray-100 text-gray-500',
  TERMINATED: 'bg-red-100 text-red-700',
}

export default function StaffDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [staff, setStaff] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [toggling, setToggling] = useState(false)

  useEffect(() => {
    setLoading(true)
    getStaff(id)
      .then((data) => {
        setStaff(data)
        setForm({
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
          staffRole: data.staffRole,
          department: data.department,
          licenseNumber: data.licenseNumber || '',
        })
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setSaveError('')
    try {
      const updated = await updateStaff(id, form)
      setStaff(updated)
      setEditing(false)
    } catch (e) {
      setSaveError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async () => {
    setToggling(true)
    setError('')
    try {
      const updated = staff.isActive
        ? await deactivateStaff(id)
        : await activateStaff(id)
      setStaff(updated)
    } catch (e) {
      setError(e.message)
    } finally {
      setToggling(false)
    }
  }

  if (loading) return <div className="text-center py-20 text-gray-400">Loading…</div>
  if (error && !staff) return (
    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>
  )

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/staff')}
          className="text-gray-400 hover:text-gray-600 text-sm">← Back</button>
        <h1 className="text-2xl font-bold text-gray-900 flex-1">
          {staff.firstName} {staff.lastName}
        </h1>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[staff.status] || 'bg-gray-100 text-gray-700'}`}>
          {staff.status}
        </span>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-800">Staff Details</h2>
          <div className="flex gap-2">
            <button onClick={handleToggle} disabled={toggling}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-60 ${
                staff.isActive
                  ? 'bg-red-50 text-red-600 hover:bg-red-100'
                  : 'bg-green-50 text-green-600 hover:bg-green-100'
              }`}>
              {toggling ? '…' : staff.isActive ? 'Deactivate' : 'Activate'}
            </button>
            <button onClick={() => { setEditing(!editing); setSaveError('') }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-600 hover:bg-blue-100">
              {editing ? 'Cancel Edit' : 'Edit'}
            </button>
          </div>
        </div>

        {editing ? (
          <form onSubmit={handleSave} className="grid grid-cols-2 gap-4">
            {saveError && (
              <div className="col-span-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{saveError}</div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
              <input required value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
              <input required value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input required type="email" value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
              <input required value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
              <select value={form.staffRole}
                onChange={(e) => setForm({ ...form, staffRole: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {STAFF_ROLES.map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department *</label>
              <select value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">License Number</label>
              <input value={form.licenseNumber}
                onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="col-span-2 flex justify-end gap-2">
              <button type="button" onClick={() => setEditing(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        ) : (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <dt className="text-gray-500">Staff ID</dt>
              <dd className="font-mono font-medium text-gray-900">{staff.staffId}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Status</dt>
              <dd className="text-gray-900">{staff.status}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Full Name</dt>
              <dd className="text-gray-900">{staff.firstName} {staff.lastName}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Email</dt>
              <dd className="text-gray-900">{staff.email}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Phone</dt>
              <dd className="text-gray-900">{staff.phone}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Role</dt>
              <dd className="text-gray-900">{staff.staffRole}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Department</dt>
              <dd className="text-gray-900">{staff.department}</dd>
            </div>
            <div>
              <dt className="text-gray-500">License Number</dt>
              <dd className="text-gray-900">{staff.licenseNumber || '—'}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Join Date</dt>
              <dd className="text-gray-900">{staff.joinDate}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Active</dt>
              <dd className="text-gray-900">{staff.isActive ? 'Yes' : 'No'}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Created</dt>
              <dd className="text-gray-900">{staff.createdAt?.replace('T', ' ').slice(0, 16)} by {staff.createdBy}</dd>
            </div>
            {staff.updatedAt && (
              <div>
                <dt className="text-gray-500">Updated</dt>
                <dd className="text-gray-900">{staff.updatedAt?.replace('T', ' ').slice(0, 16)} by {staff.updatedBy}</dd>
              </div>
            )}
          </dl>
        )}
      </div>

      <div className="flex gap-3">
        <button onClick={() => navigate(`/leaves?staffId=${staff.staffId}`)}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
          View Leave Requests
        </button>
      </div>
    </div>
  )
}
