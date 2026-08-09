import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'

/**
 * Billing and Usage are one screen split in half. They used to link to each
 * other with a bare text link in a header that also held four other unrelated
 * destinations, so it read as "somewhere else" rather than "the other half of
 * this". A two-item tab row says which of the pair you are on.
 */
const TABS = [
  { to: '/settings/billing', label: 'Billing' },
  { to: '/settings/usage', label: 'Usage' },
]

export function SettingsTabs() {
  return (
    <nav aria-label="Settings" className="flex items-center gap-0.5 rounded-xl border border-[var(--color-border)] p-0.5">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className={({ isActive }) =>
            cn(
              'rounded-[10px] px-3 py-1.5 text-[12.5px] font-medium transition-colors',
              isActive
                ? 'bg-[var(--color-hover2)] text-[var(--color-text)]'
                : 'text-[var(--color-muted)] hover:text-[var(--color-text)]',
            )
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  )
}
