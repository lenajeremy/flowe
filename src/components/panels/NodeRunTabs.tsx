import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useWorkflowStore } from '@/store/workflowStore'
import { useShallow } from 'zustand/react/shallow'
import type { ExecutionEvent } from '@/types/workflow'

// ── Figma frames 164–167: run Status / Logs tabs + output modal ──

type RunBadge = 'ok' | 'warning' | 'error' | 'running' | 'info'

interface EventGroup {
  key: string
  label: string
  badge: RunBadge
  startedAt: number
  endedAt?: number
  events: ExecutionEvent[]
  output?: string
}

const BADGE_STYLES: Record<RunBadge, { text: string; color: string; bg: string }> = {
  ok:      { text: 'OK',      color: 'var(--color-ok)',     bg: 'var(--tint-ok)'   },
  warning: { text: 'Warning', color: 'var(--color-hold)',   bg: 'var(--tint-hold)' },
  error:   { text: 'Error',   color: 'var(--color-fail)',   bg: 'var(--tint-fail)' },
  running: { text: 'Running', color: 'var(--color-accent)', bg: 'color-mix(in srgb, var(--color-accent) 12%, transparent)' },
  info:    { text: 'Info',    color: 'var(--color-ok)',     bg: 'var(--tint-ok)'   },
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', hour12: true,
  }).toLowerCase().replace(' ', '')
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.max(ms, 1)}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

/** Groups the flat execution log into per-node sections plus workflow start/end markers */
function groupEvents(log: ExecutionEvent[]): EventGroup[] {
  const groups: EventGroup[] = []
  const byNode = new Map<string, EventGroup>()

  for (const ev of log) {
    if (ev.type === 'workflow_started') {
      groups.push({
        key: `wf-start-${ev.id}`, label: 'Workflow Started', badge: 'info',
        startedAt: ev.timestamp, endedAt: ev.timestamp, events: [ev],
      })
      continue
    }
    if (ev.type === 'workflow_completed' || ev.type === 'workflow_error') {
      groups.push({
        key: `wf-end-${ev.id}`,
        label: ev.type === 'workflow_completed' ? 'Workflow Completed' : 'Workflow Failed',
        badge: ev.type === 'workflow_completed' ? 'ok' : 'error',
        startedAt: ev.timestamp, endedAt: ev.timestamp, events: [ev],
      })
      continue
    }
    if (!ev.nodeId) continue

    let group = byNode.get(ev.nodeId)
    if (!group) {
      group = {
        key: `node-${ev.nodeId}-${ev.id}`,
        label: ev.nodeLabel ?? ev.nodeId,
        badge: 'running',
        startedAt: ev.timestamp,
        events: [],
      }
      byNode.set(ev.nodeId, group)
      groups.push(group)
    }
    group.events.push(ev)
    if (ev.output) group.output = ev.output
    if (ev.type === 'node_completed') { group.badge = 'ok'; group.endedAt = ev.timestamp }
    if (ev.type === 'node_error')     { group.badge = 'error'; group.endedAt = ev.timestamp }
    if (ev.type === 'node_waiting')   { group.badge = 'warning' }
  }
  return groups
}

// ── Shared atoms ─────────────────────────────────────────────

function GradientDot() {
  return (
    <span
      className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
      style={{
        background:
          'linear-gradient(180deg, color-mix(in srgb, var(--color-text) 50%, transparent) 0%, color-mix(in srgb, var(--color-text) 5%, transparent) 100%)',
      }}
    />
  )
}

function StatusPill({ badge }: { badge: RunBadge }) {
  const s = BADGE_STYLES[badge]
  return (
    <span
      className="flex-shrink-0 rounded-[15px] px-2 py-0.5 text-[10px] font-medium uppercase"
      style={{ color: s.color, background: s.bg, letterSpacing: '0.04em' }}
    >
      {s.text}
    </span>
  )
}

function ExpandIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M8.5 1.5h4v4M5.5 12.5h-4v-4M12.5 1.5L8 6M1.5 12.5L6 8"
        stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CheckMini() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="flex-shrink-0" style={{ color: 'var(--color-ok)' }}>
      <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1" strokeOpacity="0.4" />
      <path d="M3.8 6l1.6 1.6 2.8-3" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function EmptyRuns({ hint }: { hint: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 py-16 text-center">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-[var(--color-dim)]">
        <path d="M13 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-6-6z"
          stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
        <path d="M13 2v6h6M9.5 13.5l5 5M14.5 13.5l-5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div>
        <p className="text-[14px] font-medium text-[var(--color-text)]">No runs yet</p>
        <p className="mt-1 text-[10px] leading-relaxed text-[var(--color-dim)]">{hint}</p>
      </div>
    </div>
  )
}

// ── Run-output modal — Figma frame 167 ───────────────────────

export function RunOutputModal({ group, onClose }: { group: EventGroup; onClose: () => void }) {
  const request = group.events.find((e) => e.type === 'node_started')?.message
    ?? group.events[0]?.message ?? ''
  const lines = group.events.filter((e) => e.message && e.type !== 'node_started')

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-6"
      style={{ background: 'var(--color-scrim)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-[629px] max-w-full flex-col overflow-hidden rounded-3xl border border-[var(--color-border)]"
        style={{ background: 'var(--color-elevated)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between px-6 pt-6 pb-4">
          <h3 className="text-[16px] font-medium text-[var(--color-text)]">{group.label}</h3>
          <button
            onClick={onClose}
            className="flex h-6 w-6 items-center justify-center rounded-lg border border-[var(--color-chip-border)] text-[var(--color-muted)] transition-colors hover:text-[var(--color-text)]"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {/* Request / trigger line */}
          {request && (
            <>
              <p className="mb-2 text-[12px] leading-4 text-[var(--color-dim)]">{request}</p>
              <div className="rounded-xl p-4" style={{ background: 'var(--color-chip)' }}>
                <pre className="whitespace-pre-wrap break-words text-[12px] leading-relaxed text-[var(--color-dim)]">
                  {lines.map((e) => e.message).join('\n') || request}
                </pre>
              </div>
            </>
          )}

          {/* Outputs */}
          <p className="mb-1 mt-6 text-[14px] font-medium text-[var(--color-text)]">Outputs</p>
          {group.endedAt && (
            <p className="mb-2 text-[12px] text-[var(--color-dim)]">
              Finished in {formatDuration(group.endedAt - group.startedAt)}
            </p>
          )}
          <div className="rounded-xl p-4" style={{ background: 'var(--color-chip)' }}>
            <pre className="whitespace-pre-wrap break-words text-[13px] font-medium leading-5 text-[var(--color-muted)]">
              {group.output ?? 'No output produced.'}
            </pre>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}

// ── Logs tab — Figma frames 164 & 165 ────────────────────────

export function NodeLogsTab() {
  const { executionLog } = useWorkflowStore(
    useShallow((s) => ({ executionLog: s.executionLog })),
  )
  const [openKeys, setOpenKeys] = useState<Set<string>>(new Set())
  const [modalGroup, setModalGroup] = useState<EventGroup | null>(null)

  const groups = useMemo(() => groupEvents(executionLog), [executionLog])

  if (groups.length === 0) {
    return <EmptyRuns hint="Run the workflow to see a step-by-step execution log here" />
  }

  function toggle(key: string) {
    setOpenKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <div className="flex flex-col overflow-y-auto px-4 py-4">
      {groups.map((group, i) => {
        const open = openKeys.has(group.key)
        return (
          <div key={group.key} className="relative">
            {/* Dashed connector to the next row (Figma: 1px dashed #33333D at dot center) */}
            {i < groups.length - 1 && (
              <span
                aria-hidden
                className="absolute bottom-0 left-[5px] top-6 w-px"
                style={{ borderLeft: '1px dashed var(--color-chip-border)' }}
              />
            )}

            {/* Collapsed row */}
            <button
              type="button"
              onClick={() => toggle(group.key)}
              className="flex w-full items-center justify-between gap-2 py-3 text-left"
            >
              <span className="flex min-w-0 items-center gap-4">
                <GradientDot />
                <span className="truncate text-[14px] leading-5 text-[var(--color-text)]">{group.label}</span>
              </span>
              <span className="flex flex-shrink-0 items-center gap-2">
                <span className="text-[12px] font-medium text-[var(--color-dim)]">{formatTime(group.startedAt)}</span>
                <StatusPill badge={group.badge} />
                <svg
                  width="16" height="16" viewBox="0 0 16 16" fill="none"
                  className={`text-[var(--color-dim)] transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
                >
                  <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </button>

            {/* Expanded card — frame 165 */}
            {open && (
              <div className="relative mb-3 ml-[26px] rounded-xl border border-[var(--color-chip-border)] p-4">
                <button
                  type="button"
                  onClick={() => setModalGroup(group)}
                  className="absolute right-3 top-3 text-[var(--color-dim)] transition-colors hover:text-[var(--color-text)]"
                  title="Open full output"
                >
                  <ExpandIcon />
                </button>
                <p className="pr-6 text-[14px] leading-5 text-[var(--color-text)]">{group.label}</p>

                <div className="mt-2 flex flex-col gap-2">
                  {group.events.filter((e) => e.message).map((ev) => (
                    <div key={ev.id} className="flex items-start gap-2">
                      {ev.type === 'node_error' ? (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="mt-0.5 flex-shrink-0" style={{ color: 'var(--color-fail)' }}>
                          <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1" strokeOpacity="0.4" />
                          <path d="M4 4l4 4M8 4l-4 4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
                        </svg>
                      ) : (
                        <span className="mt-0.5"><CheckMini /></span>
                      )}
                      <span className="min-w-0 break-words text-[12px] font-medium leading-4 text-[var(--color-dim)]">
                        {ev.message}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Output snippet chips */}
                {group.output && (
                  <div className="mt-3 flex items-center gap-1.5 overflow-hidden">
                    <span className="max-w-[70%] truncate rounded-md bg-[var(--color-hover)] px-2 py-0.5 text-[12px] text-[var(--color-text)]">
                      {group.output.slice(0, 60)}
                    </span>
                    {group.output.length > 60 && (
                      <span className="rounded-md bg-[var(--color-hover)] px-2 py-0.5 text-[12px] text-[var(--color-text)]">…</span>
                    )}
                  </div>
                )}

                {/* Warning banner */}
                {group.badge === 'warning' && (
                  <div
                    className="mt-3 rounded px-2 py-0.5 text-[12px] leading-4"
                    style={{ background: 'var(--tint-hold)', color: 'var(--color-hold)' }}
                  >
                    Warning: this step is waiting for manual review
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}

      {modalGroup && <RunOutputModal group={modalGroup} onClose={() => setModalGroup(null)} />}
    </div>
  )
}

// ── Status tab — Figma frame 166 ─────────────────────────────

export function NodeStatusTab() {
  const { executionLog } = useWorkflowStore(
    useShallow((s) => ({ executionLog: s.executionLog })),
  )
  const [modalGroup, setModalGroup] = useState<EventGroup | null>(null)

  const groups = useMemo(() => groupEvents(executionLog), [executionLog])

  if (groups.length === 0) {
    return <EmptyRuns hint="Run the workflow to see request payloads, latency and outputs here" />
  }

  return (
    <div className="flex flex-col gap-6 overflow-y-auto px-4 py-4">
      {groups.map((group) => {
        const duration = group.endedAt ? group.endedAt - group.startedAt : null
        const summary = group.events.find((e) => e.message)?.message ?? ''
        return (
          <section key={group.key} className="flex flex-col gap-2">
            <p className="text-[14px] font-medium text-[var(--color-text)]">{group.label}</p>
            {summary && (
              <p className="text-[12px] leading-4 text-[var(--color-dim)]">{summary}</p>
            )}

            {/* Payload block with expand */}
            {group.output && (
              <div className="relative rounded-lg bg-[var(--color-surface2)] p-3 pr-9">
                <pre className="max-h-24 overflow-hidden whitespace-pre-wrap break-words text-[11px] leading-relaxed text-[var(--color-dim)]">
                  {group.output.slice(0, 400)}
                </pre>
                <button
                  type="button"
                  onClick={() => setModalGroup(group)}
                  className="absolute right-2.5 top-2.5 text-[var(--color-dim)] transition-colors hover:text-[var(--color-text)]"
                  title="Open full output"
                >
                  <ExpandIcon />
                </button>
              </div>
            )}

            {/* Stat chips — Figma: "Status : 200" / "Latency : 1884ms" / "input_tokens : 612" */}
            <div className="flex flex-wrap gap-2">
              <StatChip label="Status" value={BADGE_STYLES[group.badge].text} />
              {duration !== null && <StatChip label="Latency" value={formatDuration(duration)} />}
              {group.output && <StatChip label="output_chars" value={String(group.output.length)} />}
            </div>
          </section>
        )
      })}

      {modalGroup && <RunOutputModal group={modalGroup} onClose={() => setModalGroup(null)} />}
    </div>
  )
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-md border border-[var(--color-chip-border)] bg-[var(--color-chip)] px-2 py-1 text-[11px] text-[var(--color-dim)]">
      {label} : <span className="text-[var(--color-text)]">{value}</span>
    </span>
  )
}
