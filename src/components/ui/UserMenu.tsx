import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useTheme, type ThemePref } from '@/lib/theme'

const THEME_OPTIONS: { value: ThemePref; label: string; icon: React.ReactNode }[] = [
  {
    value: 'light',
    label: 'Light',
    icon: (
      <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="2.6" stroke="currentColor" strokeWidth="1.2" />
        <path d="M7 1.2v1.4M7 11.4v1.4M1.2 7h1.4M11.4 7h1.4M2.9 2.9l1 1M10.1 10.1l1 1M11.1 2.9l-1 1M3.9 10.1l-1 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    value: 'dark',
    label: 'Dark',
    icon: (
      <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
        <path d="M11.8 8.6A5.2 5.2 0 0 1 5.4 2.2 5.2 5.2 0 1 0 11.8 8.6z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    value: 'system',
    label: 'Auto',
    icon: (
      <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
        <rect x="1.5" y="2.5" width="11" height="7.5" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
        <path d="M5 12.5h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
  },
]

export function UserMenu() {
  const { user, signOut } = useAuthStore()
  const { pref, setPref } = useTheme()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  if (!user) return null
  const initial = (user.name || user.email)[0]?.toUpperCase() ?? '?'

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="pressable flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-[11px] font-semibold text-white"
        title={user.email}
      >
        {user.avatar_url ? (
          <img src={user.avatar_url} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          initial
        )}
      </button>

      {open && (
        <div
          className="pop-in absolute right-0 top-full z-50 mt-2 w-[220px] rounded-xl border border-[var(--color-border)] bg-[var(--color-elevated)] p-1 shadow-[var(--pop-shadow)]"
          style={{ '--pop-origin': 'top right' } as React.CSSProperties}
        >
          <div className="px-2.5 py-2">
            {user.name && <div className="text-[12px] font-medium text-[var(--color-text)]">{user.name}</div>}
            <div className="micro truncate text-[var(--color-muted)]">{user.email}</div>
          </div>
          <div className="mx-1 my-0.5 h-px bg-[var(--color-border)]" />

          {/* Theme picker */}
          <div className="flex items-center justify-between px-2.5 py-2">
            <span className="text-[12px] text-[var(--color-text)]">Theme</span>
            <div className="flex rounded-lg border border-[var(--color-border)] p-0.5">
              {THEME_OPTIONS.map((opt) => {
                const active = pref === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    title={opt.label}
                    onClick={() => setPref(opt.value)}
                    className={`pressable flex h-6 w-7 items-center justify-center rounded-[6px] transition-colors ${
                      active
                        ? 'bg-[var(--color-hover2)] text-[var(--color-text)]'
                        : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
                    }`}
                  >
                    {opt.icon}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="mx-1 my-0.5 h-px bg-[var(--color-border)]" />
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              void signOut().then(() => navigate('/login'))
            }}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[12px] text-[var(--color-text)] transition-colors hover:bg-[var(--color-hover)]"
          >
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
              <path d="M5.5 2H3.2C2.5 2 2 2.5 2 3.2v7.6C2 11.5 2.5 12 3.2 12h2.3M9 9.5 11.5 7 9 4.5M11.5 7H5.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}
