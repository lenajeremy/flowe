import type { ExecutionEvent, ExecutionEventType, IterationRef } from '@/types/workflow'

// ── Loop iteration grouping ───────────────────────────────────

// Events arrive flat and chronological, so a 200-item loop buries the three
// passes that failed under six hundred rows. Each event names its pass
// structurally, which is what makes folding them into collapsible groups
// possible at all — the old "[3/200] " message prefix could only be parsed.

export type IterationRow = {
  kind: 'iteration'
  key: string
  ref: IterationRef
  status: 'ok' | 'error' | 'running'
  events: ExecutionEvent[]
  startedAt: number
  endedAt?: number
}

export type LogRow = { kind: 'event'; event: ExecutionEvent } | IterationRow

// edge_taken drives the canvas overlay. Here it would be one row per hop and
// nothing else, so it stays out of the log.
const HIDDEN_IN_LOG = new Set<ExecutionEventType>(['edge_taken'])

export function groupLog(events: ExecutionEvent[]): LogRow[] {
  const rows: LogRow[] = []
  const open = new Map<string, IterationRow>()

  for (const event of events) {
    if (HIDDEN_IN_LOG.has(event.type)) continue

    const ref = event.iteration
    if (!ref) {
      rows.push({ kind: 'event', event })
      continue
    }

    const key = `${ref.loopNodeId}:${ref.index}`
    let group = open.get(key)
    if (!group) {
      // A group can be opened by any event of its pass, not only by
      // iteration_started — a log replayed from a truncated run may be missing
      // the header, and dropping the body with it would hide real work.
      group = { kind: 'iteration', key, ref, status: 'running', events: [], startedAt: event.timestamp }
      open.set(key, group)
      rows.push(group)
    }
    if (event.type === 'iteration_started') continue
    if (event.type === 'iteration_completed') {
      group.status = event.status === 'error' ? 'error' : 'ok'
      group.endedAt = event.timestamp
      continue
    }
    group.events.push(event)
  }
  return rows
}

export function isFailure(row: LogRow): boolean {
  return row.kind === 'iteration'
    ? row.status === 'error'
    : row.event.type === 'node_error' || row.event.type === 'workflow_error'
}

