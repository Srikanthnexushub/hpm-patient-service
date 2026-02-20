import { NavLink } from 'react-router-dom'

const navItems = [
  { to: '/patients', label: 'Patients', icon: '👥' },
  { to: '/patients/register', label: 'Register Patient', icon: '➕' },
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
            <p className="text-xs text-blue-200 leading-tight">Patient Service</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/patients/register' ? false : undefined}
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
