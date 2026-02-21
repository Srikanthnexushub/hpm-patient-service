import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { admitPatient, listBeds } from '../api/bedApi'

export default function CreateAdmissionPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ patientId: '', bedId: '', admitReason: '' })
  const [beds, setBeds] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    listBeds({ status: 'AVAILABLE' })
      .then((data) => setBeds(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const result = await admitPatient(form)
      navigate(`/admissions/${result.admissionId}`)
    } catch (e) {
      setError(e.message)
      setSaving(false)
    }
  }

  return (
    <div className="max-w-xl">
      <div className="mb-6">
        <button onClick={() => navigate('/admissions')} className="text-sm text-blue-600 hover:underline mb-2">← Back to Admissions</button>
        <h1 className="text-2xl font-bold text-gray-900">Admit Patient</h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Patient ID *</label>
            <input required value={form.patientId} onChange={(e) => setForm({ ...form, patientId: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. PAT20260001" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Bed * ({beds.length} available)
            </label>
            <select required value={form.bedId} onChange={(e) => setForm({ ...form, bedId: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Select an available bed</option>
              {beds.map((b) => (
                <option key={b.bedId} value={b.bedId}>
                  {b.bedNumber} — {b.wardName} ({b.bedType})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Admission Reason *</label>
            <textarea required rows={4} value={form.admitReason} onChange={(e) => setForm({ ...form, admitReason: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Reason for admission…" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => navigate('/admissions')}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving || beds.length === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
              {saving ? 'Admitting…' : 'Admit Patient'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
