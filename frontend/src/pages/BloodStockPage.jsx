import { useState, useEffect } from 'react'
import { getStock, BLOOD_GROUPS } from '../api/bloodBankApi'

const BG_COLOR = {
  A_POS:  'bg-red-50 border-red-200',
  A_NEG:  'bg-red-50 border-red-200',
  B_POS:  'bg-blue-50 border-blue-200',
  B_NEG:  'bg-blue-50 border-blue-200',
  AB_POS: 'bg-purple-50 border-purple-200',
  AB_NEG: 'bg-purple-50 border-purple-200',
  O_POS:  'bg-green-50 border-green-200',
  O_NEG:  'bg-green-50 border-green-200',
}

const BG_TEXT = {
  A_POS:  'text-red-700',
  A_NEG:  'text-red-600',
  B_POS:  'text-blue-700',
  B_NEG:  'text-blue-600',
  AB_POS: 'text-purple-700',
  AB_NEG: 'text-purple-600',
  O_POS:  'text-green-700',
  O_NEG:  'text-green-600',
}

const displayGroup = (g) => g.replace('_POS', ' (+)').replace('_NEG', ' (-)')

export default function BloodStockPage() {
  const [stock, setStock] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchStock = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await getStock()
      setStock(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchStock() }, [])

  // Build a map for quick lookup, filling in zeros for missing groups
  const stockMap = {}
  stock.forEach((s) => { stockMap[s.bloodGroup] = s })

  const totalAvailable = stock.reduce((sum, s) => sum + (s.availableUnits || 0), 0)
  const totalExpiring  = stock.reduce((sum, s) => sum + (s.expiringSoonUnits || 0), 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Blood Bank Stock</h1>
          <p className="text-sm text-gray-500">Live inventory across all blood groups</p>
        </div>
        <button
          onClick={fetchStock}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-5 text-sm">{error}</div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500 mb-1">Total Available Units</p>
          <p className="text-3xl font-bold text-gray-900">{totalAvailable}</p>
        </div>
        <div className={`rounded-xl border p-5 ${totalExpiring > 0 ? 'bg-orange-50 border-orange-200' : 'bg-white border-gray-200'}`}>
          <p className="text-sm text-gray-500 mb-1">Expiring Within 7 Days</p>
          <p className={`text-3xl font-bold ${totalExpiring > 0 ? 'text-orange-600' : 'text-gray-900'}`}>
            {totalExpiring}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading…</div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {BLOOD_GROUPS.map((bg) => {
            const s = stockMap[bg] || { availableUnits: 0, expiringSoonUnits: 0 }
            const low = s.availableUnits < 5
            const expiring = s.expiringSoonUnits > 0
            return (
              <div
                key={bg}
                className={`rounded-xl border-2 p-5 ${low ? 'bg-red-50 border-red-300' : BG_COLOR[bg]}`}
              >
                <p className={`text-2xl font-extrabold mb-1 ${low ? 'text-red-700' : BG_TEXT[bg]}`}>
                  {displayGroup(bg)}
                </p>
                <p className="text-4xl font-bold text-gray-900 mb-3">{s.availableUnits}</p>
                <div className="space-y-1">
                  <p className="text-xs text-gray-500">available units</p>
                  {low && s.availableUnits === 0 && (
                    <span className="inline-block px-2 py-0.5 bg-red-600 text-white text-xs rounded-full">OUT OF STOCK</span>
                  )}
                  {low && s.availableUnits > 0 && (
                    <span className="inline-block px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">LOW STOCK</span>
                  )}
                  {expiring && (
                    <p className="text-xs text-orange-600 font-medium">⚠ {s.expiringSoonUnits} expiring soon</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
