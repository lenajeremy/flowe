import { useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getRun, approveRun, rejectRun, retryWithFeedback, type WorkflowRun } from '@/lib/workflowApi'
import { consumeRunStream } from '@/lib/runStream'
import { API } from '@/lib/config'
import type { ExecutionEvent } from '@/types/workflow'
import { apiFetch } from '@/lib/http'
import { CodingAgentActivity } from '@/components/coding/CodingAgentActivity'
import { getCodingAgentCommandActivity } from '@/lib/codingAgentActivity'

function tryJson(str: string): string {
  try {
    const v: unknown = JSON.parse(str)
    // A JSON string scalar reads best as its own text — re-encoding it would
    // show the quotes and turn real newlines back into "\n". Data-store values
    // arrive JSON-encoded, so this is the common case for text.
    if (typeof v === 'string') return v
    return JSON.stringify(v, null, 2)
  } catch {
    return str
  }
}

function statusColor(status: WorkflowRun['status']) {
  if (status === 'completed') return 'text-[var(--color-ok)] bg-[var(--color-ok)]/10'
  if (status === 'error')     return 'text-[var(--color-fail)] bg-[var(--color-fail)]/10'
  return 'text-[var(--color-accent)] bg-[var(--color-accent)]/10'
}

interface NodeCard {
  nodeId: string
  label: string
  output: string | null
  status: 'completed' | 'error' | 'waiting' | 'running'
  message: string
  activities: ExecutionEvent[]
  /** Set from the waiting event: whether the step feeding this gate can be
   *  sent back for another attempt. Only the server knows what feeds the gate,
   *  so this is never inferred here. */
  canRetry?: boolean
  retriesLeft?: number
}

/** One rejected attempt: what the reviewer turned down, and the steer they gave. */
interface FeedbackRound {
  attempt: number
  feedback: string
  rejectedOutput: string | null
}

function buildFeedbackRounds(events: ExecutionEvent[]): FeedbackRound[] {
  const rounds: FeedbackRound[] = []
  for (const ev of events) {
    if (ev.type !== 'approval_feedback') continue
    rounds.push({
      attempt: typeof ev.payload?.attempt === 'number' ? ev.payload.attempt : rounds.length + 1,
      feedback: ev.message,
      rejectedOutput: ev.output ?? null,
    })
  }
  return rounds
}

function buildNodeCards(events: ExecutionEvent[]): NodeCard[] {
  const cards = new Map<string, NodeCard>()
  for (const ev of events) {
    if (!ev.nodeId) continue
    if (ev.type === 'node_started') {
      cards.set(ev.nodeId, {
        nodeId: ev.nodeId,
        label: ev.message || ev.nodeId,
        output: null,
        status: 'running',
        message: '',
        activities: [],
      })
    }
    if (ev.type === 'node_output' && ev.output) {
      const card = cards.get(ev.nodeId)
      if (card) card.output = ev.output
    }
    if (ev.type === 'node_completed') {
      const card = cards.get(ev.nodeId)
      if (card) { card.status = 'completed'; card.message = ev.message }
    }
    if (ev.type === 'node_error') {
      const card = cards.get(ev.nodeId)
      if (card) { card.status = 'error'; card.message = ev.message }
    }
    if (ev.type === 'node_waiting') {
      const card = cards.get(ev.nodeId)
      if (card) {
        card.status = 'waiting'
        card.message = ev.message
        card.canRetry = ev.payload?.canRetry === true
        card.retriesLeft =
          typeof ev.payload?.retriesLeft === 'number' ? ev.payload.retriesLeft : 0
      }
    }
    if (ev.type === 'node_progress') {
      const card = cards.get(ev.nodeId)
      if (card && getCodingAgentCommandActivity(ev)) card.activities.push(ev)
    }
  }
  return [...cards.values()]
}

export function RunDetailPage() {
  const { runId } = useParams<{ runId: string }>()
  const [run, setRun] = useState<WorkflowRun | null>(null)
  const [liveEvents, setLiveEvents] = useState<ExecutionEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [approving, setApproving] = useState(false)
  const [decided, setDecided] = useState<'approved' | 'rejected' | null>(null)
  // Reject opens a choice rather than ending the run outright: end it, or send
  // the previous step back with a steer.
  const [rejecting, setRejecting] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [decisionError, setDecisionError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!runId) return
    let cancelled = false

    getRun(runId)
      .then((r) => {
        if (cancelled) return
        setRun(r)
        setLoading(false)

        if (r.status === 'running') {
          // Connect to live SSE stream for in-progress runs
          const ctrl = new AbortController()
          abortRef.current = ctrl
          apiFetch(`${API}/api/runs/${runId}/stream`, { signal: ctrl.signal })
            .then(async (res) => {
              if (!res.body) return
              await consumeRunStream(res.body.getReader(), (ev) => {
                if (cancelled) return
                setLiveEvents((prev) => [...prev, ev])
                // When the stream signals completion, refetch the run for final status
                if (ev.type === 'workflow_completed' || ev.type === 'workflow_error') {
                  getRun(runId).then((updated) => {
                    if (!cancelled) setRun(updated)
                  }).catch(() => {})
                }
              })
            })
            .catch(() => {}) // aborted or network error — ignore
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('Run not found')
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
      abortRef.current?.abort()
    }
  }, [runId])

  // Prefer live events for running runs; fall back to DB events for completed runs
  const events: ExecutionEvent[] =
    liveEvents.length > 0 ? liveEvents : (run?.events ?? [])

  const cards = buildNodeCards(events)
  const waitingCard = cards.find((c) => c.status === 'waiting')
  const waitingIdx = waitingCard ? cards.indexOf(waitingCard) : -1
  const prevCard = waitingIdx > 0 ? cards[waitingIdx - 1] : null
  const rounds = buildFeedbackRounds(events)

  async function handleDecision(approve: boolean) {
    if (!run || !waitingCard || approving) return
    setApproving(true)
    setDecisionError(null)
    try {
      if (approve) {
        await approveRun(run.id, waitingCard.nodeId)
        setDecided('approved')
      } else {
        await rejectRun(run.id, waitingCard.nodeId)
        setDecided('rejected')
      }
    } catch (err) {
      setDecisionError(err instanceof Error ? err.message : 'Could not save that decision.')
    } finally {
      setApproving(false)
    }
  }

  async function handleRetry() {
    if (!run || !waitingCard || approving) return
    const steer = feedback.trim()
    if (!steer) return
    setApproving(true)
    setDecisionError(null)
    try {
      await retryWithFeedback(run.id, waitingCard.nodeId, steer)
      // The run is not finished — it goes back to the previous step and will
      // pause here again with a new result, so the panel closes rather than
      // showing an outcome.
      setFeedback('')
      setRejecting(false)
    } catch (err) {
      setDecisionError(err instanceof Error ? err.message : 'Could not send that feedback.')
    } finally {
      setApproving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-canvas)] flex items-center justify-center">
        <p className="text-sm text-[var(--color-muted)]">Loading run…</p>
      </div>
    )
  }

  if (error || !run) {
    return (
      <div className="min-h-screen bg-[var(--color-canvas)] flex items-center justify-center">
        <p className="text-sm text-[var(--color-muted)]">{error ?? 'Something went wrong'}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--color-canvas)] text-[var(--color-text)]">
      {/* Header */}
      <div className="border-b border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-4 flex items-center gap-4">
        <Link
          to={run.workflow_id ? `/workflows/${run.workflow_id}` : '/workflows'}
          className="text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </Link>
        <div className="flex-1 min-w-0">
          <p className="micro text-[var(--color-subtle)]">Run detail</p>
          <p className="text-sm font-semibold truncate">{run.workflow_name ?? run.id}</p>
        </div>
        <span className={`micro rounded-full px-2.5 py-1 ${statusColor(run.status)}`}>
          {run.status}
        </span>
        <span className="font-mono text-[11px] text-[var(--color-subtle)]">
          {new Date(run.created_at).toLocaleString()}
        </span>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 flex flex-col gap-4">

        {/* Approval required banner */}
        {waitingCard && !decided && (
          <div className="flex flex-col gap-4 rounded-xl border border-[var(--color-hold)]/30 bg-[var(--color-hold)]/8 p-5">
            <div>
              <p className="text-sm font-semibold text-[var(--color-hold)]">Approval required</p>
              <p className="mt-1 text-xs text-[var(--color-muted)]">{waitingCard.message}</p>
            </div>

            {/* Show what the previous node produced — the thing being approved */}
            {prevCard?.output && (
              <div className="flex flex-col gap-1.5">
                <p className="micro text-[var(--color-subtle)]">
                  Content to review — {prevCard.label}
                </p>
                <pre className="text-[12px] text-[var(--color-text)] bg-[var(--color-canvas)] border border-[var(--color-border)] rounded-lg px-4 py-3 whitespace-pre-wrap break-words max-h-[420px] overflow-y-auto leading-relaxed">
                  {tryJson(prevCard.output)}
                </pre>
              </div>
            )}

            {rounds.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="micro text-[var(--color-subtle)]">
                  {rounds.length === 1 ? '1 earlier attempt' : `${rounds.length} earlier attempts`}
                </p>
                {rounds.map((round) => (
                  <div
                    key={round.attempt}
                    className="rounded-lg border border-[var(--color-border)] bg-[var(--color-canvas)] px-3 py-2"
                  >
                    <p className="micro text-[var(--color-subtle)]">Attempt {round.attempt} — you asked for</p>
                    <p className="mt-1 text-[12px] text-[var(--color-text)]">{round.feedback}</p>
                  </div>
                ))}
              </div>
            )}

            {decisionError && (
              <p className="text-xs text-[var(--color-fail)]">{decisionError}</p>
            )}

            {!rejecting ? (
              <div className="flex gap-3">
                <button
                  onClick={() => void handleDecision(true)}
                  disabled={approving}
                  className="pressable flex-1 rounded-lg bg-[var(--color-ok)] px-4 py-2.5 text-sm font-semibold text-[var(--color-canvas)] disabled:opacity-50"
                >
                  {approving ? 'Saving…' : 'Approve'}
                </button>
                <button
                  onClick={() => {
                    // With nothing to steer there is only one thing reject can
                    // mean, so skip the extra click and end the run.
                    if (waitingCard.canRetry) setRejecting(true)
                    else void handleDecision(false)
                  }}
                  disabled={approving}
                  className="pressable flex-1 rounded-lg bg-[var(--color-fail)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-canvas)] p-4">
                <div>
                  <p className="text-sm font-semibold text-[var(--color-text)]">
                    Send it back to {prevCard?.label ?? 'the previous step'}?
                  </p>
                  <p className="mt-1 text-xs text-[var(--color-muted)]">
                    Say what to change and it will try again in this run, then come back to you.
                    {typeof waitingCard.retriesLeft === 'number' && waitingCard.retriesLeft > 0 && (
                      <> {waitingCard.retriesLeft} attempt{waitingCard.retriesLeft === 1 ? '' : 's'} left.</>
                    )}
                  </p>
                </div>

                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  autoFocus
                  rows={4}
                  maxLength={4000}
                  placeholder="Don't open with a greeting — lead with what changed, and keep it under three lines."
                  className="w-full resize-y rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[13px] text-[var(--color-text)] placeholder:text-[var(--color-subtle)] focus:border-[var(--color-accent)] focus:outline-none"
                />

                <div className="flex gap-3">
                  <button
                    onClick={() => void handleRetry()}
                    disabled={approving || !feedback.trim()}
                    className="pressable flex-1 rounded-lg bg-[var(--color-accent)] px-4 py-2.5 text-sm font-semibold text-[var(--color-canvas)] disabled:opacity-40"
                  >
                    {approving ? 'Sending…' : 'Retry with feedback'}
                  </button>
                  <button
                    onClick={() => void handleDecision(false)}
                    disabled={approving}
                    className="pressable rounded-lg border border-[var(--color-fail)]/50 px-4 py-2.5 text-sm font-semibold text-[var(--color-fail)] disabled:opacity-50"
                  >
                    End the run
                  </button>
                  <button
                    onClick={() => { setRejecting(false); setDecisionError(null) }}
                    disabled={approving}
                    className="pressable rounded-lg px-3 py-2.5 text-sm text-[var(--color-muted)] disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Decision confirmation */}
        {decided && (
          <div className={`rounded-xl border p-4 text-center text-sm font-medium ${
            decided === 'approved'
              ? 'border-[var(--color-ok)]/30 bg-[var(--color-ok)]/10 text-[var(--color-ok)]'
              : 'border-[var(--color-fail)]/30 bg-[var(--color-fail)]/10 text-[var(--color-fail)]'
          }`}>
            {decided === 'approved' ? 'Approved — workflow continuing.' : 'Rejected — workflow will skip this step.'}
          </div>
        )}

        {/* Node output cards */}
        {cards.map((card, i) => (
          <div
            key={card.nodeId}
            className={`rounded-xl border bg-[var(--color-surface)] overflow-hidden ${
              card.status === 'waiting' && !decided
                ? 'border-[var(--color-hold)]/40'
                : card.status === 'error'
                ? 'border-[var(--color-fail)]/30'
                : 'border-[var(--color-border)]'
            }`}
          >
            {/* Card header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border)]">
              <span className="text-[11px] text-[var(--color-muted)] tabular-nums">{i + 1}</span>
              <span className="text-[13px] font-medium flex-1">{card.label}</span>
              <span className={`micro rounded-full px-2 py-0.5 ${
                card.status === 'completed' ? 'bg-[var(--color-ok)]/15 text-[var(--color-ok)]' :
                card.status === 'error'     ? 'bg-[var(--color-fail)]/15 text-[var(--color-fail)]' :
                card.status === 'waiting'   ? 'bg-[var(--color-hold)]/15 text-[var(--color-hold)]' :
                'bg-[var(--color-accent)]/15 text-[var(--color-accent)]'
              }`}>
                {card.status}
              </span>
            </div>

            {/* Output */}
            {card.activities.length > 0 && (
              <div className="flex flex-col gap-3 border-b border-[var(--color-border)] px-4 py-3">
                <p className="micro text-[var(--color-subtle)]">Agent activity</p>
                {card.activities.map((event) => <CodingAgentActivity key={event.id} event={event} />)}
              </div>
            )}

            {card.output ? (
              <pre className="px-4 py-3 text-[12px] text-[var(--color-text)] whitespace-pre-wrap break-words max-h-80 overflow-y-auto leading-relaxed">
                {tryJson(card.output)}
              </pre>
            ) : card.status === 'waiting' ? (
              <p className="px-4 py-3 text-[12px] text-[var(--color-muted)] italic">Waiting for approval…</p>
            ) : (
              <p className="px-4 py-3 text-[12px] text-[var(--color-muted)] italic">No output</p>
            )}

            {/* Error message */}
            {card.status === 'error' && card.message && (
              <div className="px-4 pb-3">
                <p className="text-[11px] text-[var(--color-fail)]">{card.message}</p>
              </div>
            )}
          </div>
        ))}

        {cards.length === 0 && (
          <div className="text-center py-12">
            <p className="text-sm text-[var(--color-muted)]">
              {run.status === 'running' ? 'Connecting to live stream…' : 'No events recorded for this run.'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
