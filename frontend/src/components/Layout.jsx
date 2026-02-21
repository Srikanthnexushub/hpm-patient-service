import { NavLink } from 'react-router-dom'

const navSections = [
  {
    heading: 'PATIENTS',
    items: [
      { to: '/patients', label: 'Patients', icon: '👥' },
      { to: '/patients/register', label: 'Register Patient', icon: '➕' },
    ],
  },
  {
    heading: 'APPOINTMENTS',
    items: [
      { to: '/doctors', label: 'Doctors', icon: '👨‍⚕️' },
      { to: '/appointments', label: 'Appointments', icon: '📅' },
      { to: '/appointments/book', label: 'Book Appointment', icon: '➕' },
    ],
  },
  {
    heading: 'MEDICAL RECORDS',
    items: [
      { to: '/records', label: 'Medical Records', icon: '📋' },
      { to: '/records/new', label: 'New Record', icon: '➕' },
    ],
  },
  {
    heading: 'BILLING',
    items: [
      { to: '/invoices', label: 'Invoices', icon: '🧾' },
      { to: '/invoices/new', label: 'New Invoice', icon: '➕' },
    ],
  },
]

export default function Layout({ children }) {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 flex flex-col bg-blue-800 text-white">
        {/* Brand */}
        <div className="flex items-center gap-2 px-5 py-5 border-b border-blue-700">
          <span className="text-2xl">🏥</span>
          <div>
            <p className="text-sm font-bold leading-tight">HPM</p>
            <p className="text-xs text-blue-200 leading-tight">Hospital Management</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          {navSections.map((section) => (
            <div key={section.heading} className="mb-4">
              <p className="px-3 mb-1 text-xs font-semibold text-blue-400 uppercase tracking-wider">
                {section.heading}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-blue-900 text-white'
                          : 'text-blue-100 hover:bg-blue-700 hover:text-white'
                      }`
                    }
                  >
                    <span>{item.icon}</span>
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-blue-700">
          <p className="text-xs text-blue-300">Ai Nexus © 2026</p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-6 py-6">{children}</div>
      </main>
    </div>
  )
}
