import { NavLink, Outlet } from 'react-router-dom'

const navItems = [
  { to: '/', label: '製品ログ', icon: '📦' },
  { to: '/skin-log', label: '肌ログ', icon: '📝' },
  { to: '/settings', label: '設定', icon: '⚙️' },
]

export function Layout() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <main className="flex-1 pb-16 overflow-y-auto">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200">
        <ul className="flex justify-around">
          {navItems.map(({ to, label, icon }) => (
            <li key={to} className="flex-1">
              <NavLink
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex flex-col items-center py-2 text-xs ${
                    isActive ? 'text-teal-600' : 'text-gray-400'
                  }`
                }
              >
                <span className="text-xl">{icon}</span>
                <span>{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
