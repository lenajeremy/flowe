import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { API } from '@/lib/config'
import { apiFetch } from '@/lib/http'

// Members and pending invitations.
//
// Seats are the Team billing unit, so this is really a billing surface: an invite
// commits a seat the moment it is sent, not when it is accepted, and the counter
// here has to say so — otherwise "2 of 2 seats used" looks wrong to someone whose
// colleague has not clicked the link yet.

interface Member {
  user_id: string
  email: string
  name: string
  avatar_url?: string
  role: string
  joined_at: string
  is_you: boolean
}

interface Invite {
  id: string
  email: string
  role: string
  expires_at: string
}

interface MembersData {
  members: Member[]
  invites: Invite[]
  seats: { paid: number; used: number; available: number; over_cap: number; per_seat: boolean }
  plan: string
  plan_name: string
  can_manage: boolean
  can_add: boolean
  unlimited: boolean
}

export function MembersSection({ onSeatsChanged }: { onSeatsChanged?: () => void }) {
  const [data, setData] = useState<MembersData | null>(null)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('member')
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(() => {
    apiFetch(`${API}/api/org/members`)
      .then((r) => r.json())
      .then((d: MembersData) => setData(d))
      .catch(() => toast.error('Could not load your team'))
  }, [])

  useEffect(refresh, [refresh])

  async function invite(e: React.FormEvent) {
    e.preventDefault()
    const addr = email.trim()
    if (!addr) return
    setBusy(true)
    try {
      const res = await apiFetch(`${API}/api/org/invites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: addr, role }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(d.error || 'Could not send the invitation')
        return
      }
      toast.success(`Invitation sent to ${addr}`)
      setEmail('')
      refresh()
      onSeatsChanged?.()
    } finally {
      setBusy(false)
    }
  }

  async function revoke(inv: Invite) {
    const res = await apiFetch(`${API}/api/org/invites/${inv.id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success(`Invitation to ${inv.email} withdrawn`)
      refresh()
      onSeatsChanged?.()
    } else {
      toast.error('Could not withdraw that invitation')
    }
  }

  async function remove(m: Member) {
    const what = m.is_you
      ? 'Leave this organization?'
      : `Remove ${m.name || m.email}?`
    // Removing someone revokes their access to every workflow the org owns, which
    // is worth one confirmation.
    if (!window.confirm(`${what}\n\nThey will lose access to this organization's workflows immediately.`)) return
    const res = await apiFetch(`${API}/api/org/members/${m.user_id}`, { method: 'DELETE' })
    const d = await res.json().catch(() => ({}))
    if (res.ok) {
      toast.success(m.is_you ? 'You left the organization' : 'Removed')
      refresh()
      onSeatsChanged?.()
    } else {
      toast.error(d.error || 'Could not remove them')
    }
  }

  if (!data) {
    return <div className="mt-4 h-32 animate-pulse rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]" />
  }

  const soloPlan = !data.unlimited && data.seats.paid <= 1
  // The server refuses to remove the last owner, since an org without one has
  // nobody who can manage billing or membership. Offering the action anyway would
  // be a button whose only outcome is an error.
  const owners = data.members.filter((m) => m.role === 'owner').length
  const canLeave = (m: Member) => !(m.role === 'owner' && owners <= 1)

  return (
    <section className="mt-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-[14px] font-semibold">Team</h3>
        {!data.unlimited && (
          <span className="font-mono text-[12px] text-[var(--color-muted)]">
            {data.seats.used} of {data.seats.paid} {data.seats.paid === 1 ? 'seat' : 'seats'} used
          </span>
        )}
      </div>

      {/* After a downgrade an org can hold more people than its plan includes. Nobody
          is cut off automatically — revoking a colleague's access because the owner
          changed plan would be worse than saying so — but it has to be visible, and
          the owner is the only one who can decide who stays. */}
      {data.seats.over_cap > 0 && (
        <div className="mt-4 rounded-xl px-3.5 py-3 text-[13px] leading-relaxed"
          style={{ border: '1px solid rgba(245,158,11,0.32)', background: 'rgba(245,158,11,0.08)' }}>
          <strong className="text-[var(--color-text)]">
            {data.seats.used} people, {data.seats.paid} included on {data.plan_name}.
          </strong>{' '}
          Everyone keeps working for now. To settle it, remove {data.seats.over_cap}{' '}
          {data.seats.over_cap === 1 ? 'person' : 'people'} below, or add seats in the
          billing portal.
        </div>
      )}

      {soloPlan && data.seats.over_cap === 0 ? (
        <p className="mt-3 text-[13px] text-[var(--color-muted)]">
          Your plan is for one person. Upgrade to Team to invite others — each seat
          brings its own AI allowance.
        </p>
      ) : (
        <>
          <ul className="mt-4 flex flex-col">
            {data.members.map((m) => (
              <li key={m.user_id}
                className="flex items-center gap-3 border-b border-[var(--color-border)] py-2.5">
                <Avatar member={m} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-medium">
                    {m.name || m.email}
                    {m.is_you && <span className="ml-1.5 text-[var(--color-muted)]">(you)</span>}
                  </div>
                  {m.name && <div className="truncate text-[12px] text-[var(--color-muted)]">{m.email}</div>}
                </div>
                <span className="shrink-0 font-mono text-[11px] uppercase tracking-wider text-[var(--color-subtle)]">
                  {m.role}
                </span>
                {(data.can_manage || m.is_you) && canLeave(m) && (
                  <button onClick={() => remove(m)}
                    className="shrink-0 text-[12px] text-[var(--color-muted)] transition-colors hover:text-red-400">
                    {m.is_you ? 'Leave' : 'Remove'}
                  </button>
                )}
              </li>
            ))}

            {data.invites.map((i) => (
              <li key={i.id}
                className="flex items-center gap-3 border-b border-[var(--color-border)] py-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-dashed border-[var(--color-border2)] text-[11px] text-[var(--color-subtle)]">
                  ?
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px]">{i.email}</div>
                  {/* Says why the seat is already counted. */}
                  <div className="text-[12px] text-[var(--color-muted)]">
                    Invited · holding a seat until they accept
                  </div>
                </div>
                <span className="shrink-0 font-mono text-[11px] uppercase tracking-wider text-[var(--color-subtle)]">
                  {i.role}
                </span>
                {data.can_manage && (
                  <button onClick={() => revoke(i)}
                    className="shrink-0 text-[12px] text-[var(--color-muted)] transition-colors hover:text-[var(--color-text)]">
                    Withdraw
                  </button>
                )}
              </li>
            ))}
          </ul>

          {data.can_manage && (
            <form onSubmit={invite} className="mt-5 flex flex-wrap items-center gap-2">
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="teammate@company.com"
                disabled={!data.can_add}
                className="h-10 min-w-0 flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-canvas)] px-3.5 text-[13px] outline-none transition-colors placeholder:text-[var(--color-placeholder)] focus:border-[var(--color-accent)] disabled:opacity-50"
              />
              <select value={role} onChange={(e) => setRole(e.target.value)} disabled={!data.can_add}
                className="h-10 rounded-xl border border-[var(--color-border)] bg-[var(--color-canvas)] px-2.5 text-[13px] outline-none disabled:opacity-50">
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
              <button type="submit" disabled={busy || !data.can_add || !email.trim()}
                className="pressable h-10 shrink-0 rounded-xl bg-[var(--color-accent)] px-4 text-[13px] font-semibold text-[var(--fern-forest)] hover:opacity-90 disabled:opacity-40">
                {busy ? 'Sending…' : 'Invite'}
              </button>
            </form>
          )}

          {!data.can_add && data.can_manage && (
            <p className="mt-2.5 text-[12.5px] text-[var(--color-muted)]">
              Every seat is in use. Add a seat in the billing portal to invite
              someone else, or withdraw a pending invitation.
            </p>
          )}
        </>
      )}
    </section>
  )
}

function Avatar({ member }: { member: Member }) {
  const initial = (member.name || member.email).trim().charAt(0).toUpperCase()
  if (member.avatar_url) {
    return (
      <img src={member.avatar_url} alt="" referrerPolicy="no-referrer"
        className="h-7 w-7 shrink-0 rounded-full object-cover" />
    )
  }
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--fern-emerald)] to-[var(--fern-pine)] text-[11px] font-semibold text-white">
      {initial}
    </div>
  )
}
