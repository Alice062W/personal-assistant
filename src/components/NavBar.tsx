import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/', label: 'Timer', icon: '⏱' },
  { to: '/history', label: 'History', icon: '📅' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
]

export default function NavBar() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-surface border-t border-overlay flex max-w-md mx-auto">
      {tabs.map(tab => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === '/'}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center py-3 gap-1 text-xs transition-colors ${
              isActive ? 'text-accent' : 'text-subtext'
            }`
          }
        >
          <span className="text-xl">{tab.icon}</span>
          <span>{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
