import { Link, NavLink, Outlet } from 'react-router-dom'
import { UserMenu } from '@/components/ui/UserMenu'
import { PlanBadge } from '@/components/PlanBadge'
import { FloweIcon } from '@/components/FloweIcon'
import { NODE_ICONS } from '@/lib/nodeIcons'
import { cn } from '@/lib/utils'

/**
 * The frame every signed-in page hangs off.
 *
 * Before this, each page drew its own header, and each one offered a different
 * set of destinations — you could reach Connections from Workflows but not from
 * Data, and Data was linked from exactly one place in the whole app. Sections
 * now live in one list, so they cannot drift apart again, and all four are
 * always on screen: reachable from anywhere, in the same order, with the current
 * one marked.
 *
 * The full-canvas pages (the editor and the workflow chat) deliberately sit
 * outside this shell. They already carry their own bar, and stacking a second
 * one on top would cost canvas height to say something the breadcrumb in their
 * own bar already says.
 */

const WORKFLOWS_ICON = (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
    <rect x="1" y="1" width="5" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.2" />
    <rect x="8" y="1" width="5" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.2" />
    <rect x="1" y="8" width="5" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.2" />
    <rect x="8" y="8" width="5" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.2" />
  </svg>
)

const CONNECTIONS_ICON = (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
    <path d="M6.5 9.5L9.5 6.5M5 11l-1 1a2.5 2.5 0 01-3.5-3.5l2-2A2.5 2.5 0 015 6.5M11 5l1-1a2.5 2.5 0 013.5 3.5l-2 2A2.5 2.5 0 0111 9.5"
      stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
)

const AGENTS_ICON = (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
    <rect x="2" y="3.5" width="10" height="8" rx="2" stroke="currentColor" strokeWidth="1.2" />
    <path d="M7 1.3v2.2M4.5 7h.01M9.5 7h.01M5 9.2h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
)

const SETTINGS_ICON = (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
    <circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1.2" />
    <path d="M7 1.4v1.3M7 11.3v1.3M1.4 7h1.3M11.3 7h1.3M3 3l.9.9M10.1 10.1l.9.9M11 3l-.9.9M3.9 10.1L3 11"
      stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
)

/**
 * The app's sections, in nav order.
 *
 * `end` is false everywhere on purpose: /workflows/new and /workflows/:id belong
 * under Workflows, and /settings/billing belongs under Settings, so a prefix
 * match is what marks the right tab.
 */
const SECTIONS = [
  { to: '/workflows', label: 'Workflows', icon: WORKFLOWS_ICON },
  { to: '/agents', label: 'Agents', icon: AGENTS_ICON },
  { to: '/data', label: 'Data', icon: NODE_ICONS.data },
  { to: '/connections', label: 'Connections', icon: CONNECTIONS_ICON },
  { to: '/settings', label: 'Settings', icon: SETTINGS_ICON },
]

function SectionLink({ to, label, icon }: { to: string; label: string; icon: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-colors',
          isActive
            ? 'bg-[var(--color-hover2)] text-[var(--color-text)]'
            : 'text-[var(--color-muted)] hover:bg-[var(--color-hover)] hover:text-[var(--color-text)]',
        )
      }
    >
      <span className="h-3.5 w-3.5 shrink-0 [&>svg]:h-full [&>svg]:w-full">{icon}</span>
      {label}
    </NavLink>
  )
}

export function AppShell() {
  return (
    <div className="min-h-screen bg-[var(--color-canvas)] font-sans text-[var(--color-text)]">
      <header
        className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-canvas)]/90"
        style={{ backdropFilter: 'blur(12px) saturate(150%)' }}
      >
        <div className="mx-auto flex h-14 max-w-[1280px] items-center gap-3 px-8">
          {/* The logo goes to the app's own home. It used to go to the marketing
              page, which meant the one control on every screen that looks like
              "take me home" was the one that threw you out of the app. */}
          <Link
            to="/workflows"
            aria-label="Fernary — all workflows"
            className="pressable flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--color-text)] hover:bg-[var(--color-hover)]"
          >
            <FloweIcon size={20} />
          </Link>

          {/* Sections scroll rather than collapse on narrow screens. A hamburger
              would hide the thing this component exists to make visible. */}
          <nav
            aria-label="Sections"
            className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto"
            style={{ scrollbarWidth: 'none' }}
          >
            {SECTIONS.map((s) => (
              <SectionLink key={s.to} {...s} />
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-3">
            <PlanBadge />
            <UserMenu />
          </div>
        </div>
      </header>

      <Outlet />
    </div>
  )
}
