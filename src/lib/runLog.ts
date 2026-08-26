import type { ExecutionEvent, ExecutionEventType, IterationRef, SkipReason } from '@/types/workflow'

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


// ── Path taken ────────────────────────────────────────────────

// Which way a run went is reconstructed from events rather than inferred from
// the graph: re-deriving the executor's gating rules here would mean two
// implementations of the same decision, and they would drift.

export type PathState = 'taken' | 'skipped' | 'ahead'

export interface RunPath {
  /** edge id → the branch output that selected it, '' when unconditional. */
  taken: Map<string, string>
  skipped: Map<string, SkipReason>
  /** Node ids in first-start order — the sequence the scrubber steps through. */
  order: string[]
}

export function derivePath(events: ExecutionEvent[]): RunPath {
  const taken = new Map<string, string>()
  const skipped = new Map<string, SkipReason>()
  const order: string[] = []
  const seen = new Set<string>()

  for (const ev of events) {
    if (ev.type === 'edge_taken' && ev.edgeId) {
      taken.set(ev.edgeId, ev.sourceHandle ?? '')
    } else if (ev.type === 'node_skipped' && ev.nodeId && ev.skipReason) {
      skipped.set(ev.nodeId, ev.skipReason)
    } else if (ev.type === 'node_started' && ev.nodeId && !seen.has(ev.nodeId)) {
      // A loop body starts once per pass. The path cares about the node once.
      seen.add(ev.nodeId)
      order.push(ev.nodeId)
    }
  }
  return { taken, skipped, order }
}

export function isEmptyPath(path: RunPath): boolean {
  return path.taken.size === 0 && path.skipped.size === 0 && path.order.length === 0
}

/** step === null shows the whole path; otherwise everything after it is 'ahead'. */
export function edgePathState(path: RunPath, edge: { id: string; source: string }, step: number | null): PathState {
  if (!path.taken.has(edge.id)) return 'skipped'
  if (step === null) return 'taken'
  const idx = path.order.indexOf(edge.source)
  return idx >= 0 && idx <= step ? 'taken' : 'ahead'
}

export function nodePathState(path: RunPath, nodeId: string, step: number | null): PathState {
  if (path.skipped.has(nodeId)) return 'skipped'
  const idx = path.order.indexOf(nodeId)
  // A node that neither ran nor was reported skipped is off the path: a run
  // that ended early never got as far as naming it.
  if (idx < 0) return 'skipped'
  if (step === null) return 'taken'
  return idx <= step ? 'taken' : 'ahead'
}
