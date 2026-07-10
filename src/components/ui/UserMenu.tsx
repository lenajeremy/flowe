import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

export function UserMenu() {
  const { user, signOut } = useAuthStore()
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
        <div className="absolute right-0 top-full z-50 mt-2 w-[220px] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1 shadow-[0_8px_24px_rgba(0,0,0,0.4)]">
          <div className="px-2.5 py-2">
            {user.name && <div className="text-[12px] font-medium text-[var(--color-text)]">{user.name}</div>}
            <div className="micro truncate text-[var(--color-muted)]">{user.email}</div>
          </div>
          <div className="mx-1 my-0.5 h-px bg-[var(--color-border)]" />
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              void signOut().then(() => navigate('/login'))
            }}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[12px] text-[var(--color-text)] transition-colors hover:bg-white/5"
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
