import { useRef, useState, useEffect, useCallback } from 'react'
import { useWorkflowStore } from '@/store/workflowStore'
import { useShallow } from 'zustand/react/shallow'
import { FormField, inputClass, textareaClass } from '@/components/ui/FormField'
import { SliderField } from '@/components/ui/SliderField'
import { Select } from '@/components/ui/Select'
import { NODE_LABELS, NODE_ACCENT_COLORS, NODE_ACCENT_HEX } from '@/lib/nodeColors'
import type { LLMModel, FlowNode, FlowEdge, FlowNodeData } from '@/types/workflow'
import { API } from '@/lib/config'

const HTTP_METHODS: Array<{ value: string; label: string }> = [
  { value: 'GET',    label: 'GET'    },
  { value: 'POST',   label: 'POST'   },
  { value: 'PUT',    label: 'PUT'    },
  { value: 'DELETE', label: 'DELETE' },
  { value: 'PATCH',  label: 'PATCH'  },
]

const FREQUENCY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'hourly',  label: 'Every hour'  },
  { value: 'daily',   label: 'Every day'   },
  { value: 'weekly',  label: 'Every week'  },
  { value: 'monthly', label: 'Every month' },
]

const WEEKDAY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '0', label: 'Sunday'    },
  { value: '1', label: 'Monday'    },
  { value: '2', label: 'Tuesday'   },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday'  },
  { value: '5', label: 'Friday'    },
  { value: '6', label: 'Saturday'  },
]

const APPROVAL_TIMEOUTS: Array<{ value: string; label: string }> = [
  { value: '0',     label: 'No timeout'  },
  { value: '300',   label: '5 minutes'   },
  { value: '900',   label: '15 minutes'  },
  { value: '3600',  label: '1 hour'      },
  { value: '86400', label: '24 hours'    },
]

const LLM_MODELS: Array<{ value: string; label: string }> = [
  { value: 'gpt-4o',            label: 'GPT-4o' },
  { value: 'gpt-4o-mini',       label: 'GPT-4o Mini' },
  { value: 'claude-opus-4-5',   label: 'Claude Opus 4.5' },
  { value: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5' },
  { value: 'claude-haiku-4-5',  label: 'Claude Haiku 4.5' },
]

/** Returns all nodes that have an edge pointing TO targetId (direct upstream only) */
function getUpstreamNodes(targetId: string, nodes: FlowNode[], edges: FlowEdge[]): FlowNode[] {
  const sourceIds = edges
    .filter((e) => e.target === targetId)
    .map((e) => e.source)
  return nodes.filter((n) => sourceIds.includes(n.id))
}

// ── Available Inputs chip strip ──────────────────────────────
interface AvailableInputsProps {
  upstreamNodes: FlowNode[]
  onInsert: (token: string) => void
}

function AvailableInputs({ upstreamNodes, onInsert }: AvailableInputsProps) {
  const [copied, setCopied] = useState<string | null>(null)

  if (upstreamNodes.length === 0) return null

  function handleClick(node: FlowNode) {
    const token = `{{${node.id}.output}}`
    onInsert(token)
    setCopied(node.id)
    setTimeout(() => setCopied(null), 1200)
  }

  return (
    <div className="mb-3 p-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-canvas)]">
      <p className="text-[10px] text-[var(--color-muted)] uppercase tracking-wider mb-2">
        Available Inputs
      </p>
      <div className="flex flex-col gap-1.5">
        {upstreamNodes.map((node) => {
          const token = `{{${node.id}.output}}`
          const isCopied = copied === node.id
          return (
            <button
              key={node.id}
              onClick={() => handleClick(node)}
              title={`Click to insert ${token} at cursor`}
              className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded border border-[var(--color-border)] bg-[var(--color-surface2)] hover:border-[var(--color-accent)] hover:bg-[var(--color-surface)] transition-all group"
            >
              {/* Color dot */}
              <div
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: NODE_ACCENT_HEX[node.data.nodeType] }}
              />
              {/* Label */}
              <span className="text-[11px] text-[var(--color-text)] font-medium truncate flex-1">
                {node.data.label}
              </span>
              {/* Token preview */}
              <code className="text-[10px] text-blue-400 font-[var(--font-mono)] truncate max-w-[110px] opacity-60 group-hover:opacity-100 transition-opacity">
                {token}
              </code>
              {/* Action hint */}
              <span className={`text-[9px] flex-shrink-0 transition-colors ${isCopied ? 'text-emerald-400' : 'text-[var(--color-muted)] group-hover:text-blue-400'}`}>
                {isCopied ? '✓ inserted' : '+ insert'}
              </span>
            </button>
          )
        })}
      </div>
      <p className="text-[10px] text-[var(--color-muted)] mt-2 leading-relaxed">
        Click a node to insert its output token at your cursor position.
      </p>
    </div>
  )
}

// ── Branch upstream hint ─────────────────────────────────────
function BranchInputHint({ upstreamNodes }: { upstreamNodes: FlowNode[] }) {
  if (upstreamNodes.length === 0) return null
  const upstream = upstreamNodes[0]
  return (
    <div className="mb-3 p-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-canvas)]">
      <p className="text-[10px] text-[var(--color-muted)] uppercase tracking-wider mb-1.5">
        Condition context
      </p>
      <p className="text-[11px] text-[var(--color-text)] leading-relaxed">
        <code className="text-amber-400">output</code>
        {' '}= output of{' '}
        <span className="font-medium">{upstream.data.label}</span>
        {' '}(parsed as JSON if valid)
      </p>
      <div className="mt-2 flex flex-col gap-1">
        <p className="text-[10px] text-[var(--color-muted)]">Examples:</p>
        {[
          'output.sentiment === "positive"',
          'output.score > 0.5',
          'output.includes("yes")',
          'output === "true"',
        ].map((ex) => (
          <code key={ex} className="text-[10px] text-amber-300/80 font-[var(--font-mono)] block">
            {ex}
          </code>
        ))}
      </div>
    </div>
  )
}

// ── Tracked focus state for token insertion ──────────────────
interface FocusedField {
  el: HTMLTextAreaElement | HTMLInputElement
  /** The FlowNodeData key that this element maps to */
  field: string
}

// ── Main panel ───────────────────────────────────────────────
export function ConfigPanel() {
  const { nodes, edges, selectedNodeId, selectedNodeIds, updateNodeData, executionState, executionLog, dbId } = useWorkflowStore(
    useShallow((s) => ({
      nodes: s.nodes,
      edges: s.edges,
      selectedNodeId: s.selectedNodeId,
      selectedNodeIds: s.selectedNodeIds,
      updateNodeData: s.updateNodeData,
      executionState: s.executionState,
      executionLog: s.executionLog,
      dbId: s.dbId,
    })),
  )

  // Refs to textareas so we can insert at cursor position (LLM node)
  const systemRef = useRef<HTMLTextAreaElement>(null)
  const userRef   = useRef<HTMLTextAreaElement>(null)

  /**
   * Tracks the last field that had focus, including the cursor offsets at the
   * moment focus moved away. This is captured via onBlur so that when an
   * "Available Input" button is clicked (which steals focus from the field),
   * insertToken still knows where to write.
   */
  const lastFocusedRef = useRef<FocusedField & { start: number; end: number } | null>(null)

  function handleFieldFocus(el: HTMLTextAreaElement | HTMLInputElement, field: string) {
    // Update on every focus so the ref always holds the current element.
    lastFocusedRef.current = {
      el,
      field,
      start: el.selectionStart ?? el.value.length,
      end:   el.selectionEnd   ?? el.value.length,
    }
  }

  function handleFieldBlur(el: HTMLTextAreaElement | HTMLInputElement, field: string) {
    // Capture the cursor position at the moment focus leaves the field,
    // because by the time the button's onClick fires, selectionStart is gone.
    lastFocusedRef.current = {
      el,
      field,
      start: el.selectionStart ?? el.value.length,
      end:   el.selectionEnd   ?? el.value.length,
    }
  }

  // ── Webhook URL state ────────────────────────────────────────
  const [webhookUrl, setWebhookUrl] = useState<string | null>(null)
  const [webhookLoading, setWebhookLoading] = useState(false)

  const fetchWebhook = useCallback(async () => {
    if (!dbId) return
    setWebhookLoading(true)
    try {
      const r = await fetch(`${API}/api/workflows/${dbId}/webhook`)
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const wh = await r.json() as { token: string }
      setWebhookUrl(`${window.location.origin}/trigger/${wh.token}`)
    } catch {
      // ignore
    } finally {
      setWebhookLoading(false)
    }
  }, [dbId])

  // ── Schedule timezone helpers ────────────────────────────────
  function utcToLocal(utcHHMM: string): string {
    const [h, m] = utcHHMM.split(':').map(Number)
    const d = new Date()
    d.setUTCHours(h, m, 0, 0)
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }
  function localToUtc(localHHMM: string): string {
    const [h, m] = localHHMM.split(':').map(Number)
    const d = new Date()
    d.setHours(h, m, 0, 0)
    return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`
  }
  const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone

  // ── Schedule state ───────────────────────────────────────────
  const [schedFrequency, setSchedFrequency] = useState('daily')
  const [schedTime, setSchedTime] = useState('09:00') // stored in local time
  const [schedDayOfWeek, setSchedDayOfWeek] = useState(1)   // Monday
  const [schedDayOfMonth, setSchedDayOfMonth] = useState(1)
  const [schedRepeat, setSchedRepeat] = useState(true)
  const [schedSaving, setSchedSaving] = useState(false)
  const [schedNextRun, setSchedNextRun] = useState<string | null>(null)

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) ?? null

  // Clear the tracked focus whenever the user switches to a different node
  useEffect(() => {
    lastFocusedRef.current = null
  }, [selectedNodeId])

  useEffect(() => {
    if (selectedNode?.data.nodeType === 'webhookTrigger') {
      fetchWebhook()
    }
  }, [selectedNode?.data.nodeType, fetchWebhook])

  useEffect(() => {
    if (selectedNode?.data.nodeType !== 'scheduledTrigger' || !dbId) return
    fetch(`${API}/api/workflows/${dbId}/schedule`)
      .then((r) => r.ok ? r.json() : null)
      .then((s: { frequency?: string; run_time?: string; day_of_week?: number; day_of_month?: number; repeat?: boolean; next_run_at?: string } | null) => {
        if (!s) return
        if (s.frequency)    setSchedFrequency(s.frequency)
        if (s.run_time)     setSchedTime(utcToLocal(s.run_time))
        if (s.day_of_week != null)  setSchedDayOfWeek(s.day_of_week)
        if (s.day_of_month != null) setSchedDayOfMonth(s.day_of_month)
        if (s.repeat != null)       setSchedRepeat(s.repeat)
        if (s.next_run_at)  setSchedNextRun(s.next_run_at)
      })
      .catch(() => {})
  }, [selectedNode?.data.nodeType, dbId])

  async function saveSchedule(overrides?: Partial<{ frequency: string; run_time: string; day_of_week: number; day_of_month: number; repeat: boolean }>) {
    if (!dbId || !selectedNodeId) return
    setSchedSaving(true)
    const localTime = overrides?.run_time ?? schedTime
    const payload = {
      frequency:    overrides?.frequency    ?? schedFrequency,
      run_time:     localToUtc(localTime),
      day_of_week:  overrides?.day_of_week  ?? schedDayOfWeek,
      day_of_month: overrides?.day_of_month ?? schedDayOfMonth,
      repeat:       overrides?.repeat       ?? schedRepeat,
    }
    try {
      const r = await fetch(`${API}/api/workflows/${dbId}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (r.ok) {
        const s = await r.json() as { next_run_at?: string; frequency: string; run_time: string; day_of_week: number; day_of_month: number; repeat: boolean }
        if (s.next_run_at) setSchedNextRun(s.next_run_at)
        // Push schedule data into node so the canvas node stays in sync
        updateNodeData(selectedNodeId, {
          scheduleFrequency:  s.frequency,
          scheduleRunTime:    s.run_time,
          scheduleDayOfWeek:  s.day_of_week,
          scheduleDayOfMonth: s.day_of_month,
          scheduleRepeat:     s.repeat,
          scheduleNextRunAt:  s.next_run_at,
        } as Parameters<typeof updateNodeData>[1])
      }
    } catch { /* ignore */ } finally {
      setSchedSaving(false)
    }
  }

  async function handleRegenerateWebhook() {
    if (!dbId) return
    try {
      await fetch(`${API}/api/workflows/${dbId}/webhook`, { method: 'DELETE' })
      await fetchWebhook()
    } catch {
      // best-effort
    }
  }

  if (!selectedNode || selectedNodeIds.length > 1) {
    const triggerCount = nodes.filter((node) => node.data.nodeType === 'textInput' || node.data.label.toLowerCase().includes('trigger')).length
    const aiCount = nodes.filter((node) => node.data.nodeType === 'llm').length
    const actionCount = nodes.filter((node) => node.data.nodeType === 'textOutput').length
    const readiness = [
      { label: 'Trigger input', complete: triggerCount > 0 },
      { label: 'AI decision step', complete: aiCount > 0 },
      { label: 'Output or action', complete: actionCount > 0 },
      { label: 'Connected path', complete: edges.length > 0 },
    ]

    return (
      <aside className="flex h-full w-full flex-col overflow-hidden border-l border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="border-b border-[var(--color-border)] px-4 py-4">
          <p className="text-[10px] uppercase tracking-wider text-[var(--color-muted)]">Workflow</p>
          <h2 className="mt-1 text-[15px] font-semibold text-[var(--color-text)]">Run Inspector</h2>
          <p className="mt-1 text-[12px] leading-relaxed text-[var(--color-muted)]">
            Select a step to configure it, or use this panel to check whether the workflow is ready to run.
          </p>
        </div>

        <div className="overflow-y-auto">
          <section className="border-b border-[var(--color-border)] px-4 py-4">
            <h2 className="mb-3 text-[13px] font-semibold text-[var(--color-text)]">Run State</h2>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-[7px] bg-[var(--color-surface2)] px-3 py-2">
                <p className="text-[10px] uppercase tracking-wider text-[var(--color-muted)]">Status</p>
                <p className="mt-1 text-[12px] font-semibold capitalize text-[var(--color-text)]">{executionState}</p>
              </div>
              <div className="rounded-[7px] bg-[var(--color-surface2)] px-3 py-2">
                <p className="text-[10px] uppercase tracking-wider text-[var(--color-muted)]">Events</p>
                <p className="mt-1 text-[12px] font-semibold text-[var(--color-text)]">{executionLog.length}</p>
              </div>
              <div className="rounded-[7px] bg-[var(--color-surface2)] px-3 py-2">
                <p className="text-[10px] uppercase tracking-wider text-[var(--color-muted)]">Steps</p>
                <p className="mt-1 text-[12px] font-semibold text-[var(--color-text)]">{nodes.length}</p>
              </div>
              <div className="rounded-[7px] bg-[var(--color-surface2)] px-3 py-2">
                <p className="text-[10px] uppercase tracking-wider text-[var(--color-muted)]">Links</p>
                <p className="mt-1 text-[12px] font-semibold text-[var(--color-text)]">{edges.length}</p>
              </div>
            </div>
          </section>

          <section className="border-b border-[var(--color-border)] px-4 py-4">
            <h2 className="mb-3 text-[13px] font-semibold text-[var(--color-text)]">Readiness</h2>
            <div className="flex flex-col gap-2">
              {readiness.map((item) => (
                <div key={item.label} className="flex items-center gap-2 text-[12px]">
                  <span className={`h-2 w-2 rounded-full ${item.complete ? 'bg-emerald-500' : 'bg-[var(--color-border2)]'}`} />
                  <span className={item.complete ? 'text-[var(--color-text)]' : 'text-[var(--color-muted)]'}>{item.label}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="border-b border-[var(--color-border)] px-4 py-4">
            <h2 className="mb-2 text-[13px] font-semibold text-[var(--color-text)]">Next Best Step</h2>
            <p className="text-[12px] leading-relaxed text-[var(--color-muted)]">
              Add a trigger, connect it to an AI step, then end with an action or report output.
            </p>
          </section>

          <div className="px-4 py-8 text-center">
            <p className="text-[12px] text-[var(--color-muted)]">Select a node to edit prompts, inputs, branches, and outputs.</p>
          </div>
        </div>
      </aside>
    )
  }

  const { data, id: nodeId } = selectedNode
  const nodeType = data.nodeType
  const upstreamNodes = getUpstreamNodes(nodeId, nodes, edges)

  /** Insert token at the cursor position of the last-focused field.
   *
   *  Strategy: clicking the "Available Input" button steals focus away from the
   *  field the user was editing, so `document.activeElement` is the button by
   *  the time this runs.  Instead we rely on `lastFocusedRef`, which is written
   *  both onFocus and onBlur for every insertable field, so it always contains
   *  the last field the user touched together with the exact cursor offsets
   *  captured at blur time.
   *
   *  We also keep the old `document.activeElement` path as a secondary fallback
   *  (handles the edge case where the user clicks a chip without ever having
   *  clicked away from a field in the same render cycle).
   */
  function insertToken(token: string) {
    // ── 1. Try the tracked last-focused field (primary path) ──
    const tracked = lastFocusedRef.current
    if (tracked && tracked.field && tracked.el) {
      const { el, field, start, end } = tracked
      const newValue = el.value.slice(0, start) + token + el.value.slice(end)
      const cursorPos = start + token.length
      updateNodeData(nodeId, { [field]: newValue })
      requestAnimationFrame(() => {
        el.focus()
        el.setSelectionRange(cursorPos, cursorPos)
      })
      // Advance the stored cursor so repeated inserts chain correctly
      lastFocusedRef.current = { el, field, start: cursorPos, end: cursorPos }
      return
    }

    // ── 2. Fallback: check document.activeElement (e.g. still-focused field) ──
    const activeEl = document.activeElement
    if (
      (activeEl instanceof HTMLTextAreaElement || activeEl instanceof HTMLInputElement) &&
      activeEl.id !== 'cfg-label'
    ) {
      const fieldMap: Record<string, string> = {
        'cfg-http-url':      'url',
        'cfg-http-body':     'requestBody',
        'cfg-http-headers':  'requestHeaders',
        'cfg-email-to':      'emailTo',
        'cfg-email-subject': 'emailSubject',
        'cfg-email-body':    'emailBody',
        'cfg-approval-msg':  'approvalMessage',
        'cfg-system':        'systemPrompt',
        'cfg-user':          'userPrompt',
      }
      const field = fieldMap[activeEl.id]
      if (field) {
        const start = activeEl.selectionStart ?? activeEl.value.length
        const end   = activeEl.selectionEnd   ?? activeEl.value.length
        const newValue = activeEl.value.slice(0, start) + token + activeEl.value.slice(end)
        const cursorPos = start + token.length
        updateNodeData(nodeId, { [field]: newValue })
        requestAnimationFrame(() => {
          activeEl.focus()
          activeEl.setSelectionRange(cursorPos, cursorPos)
        })
        return
      }
    }

    // ── 3. Last resort: LLM user prompt ──────────────────────
    const el = userRef.current
    if (!el) return
    const start = el.selectionStart ?? el.value.length
    const end   = el.selectionEnd   ?? el.value.length
    const newValue = el.value.slice(0, start) + token + el.value.slice(end)
    updateNodeData(nodeId, { userPrompt: newValue })
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(start + token.length, start + token.length)
    })
  }

  const hasOutput = typeof data.executionOutput === 'string' && data.executionOutput.length > 0
  const isCompleted = data.executionStatus === 'completed'

  return (
    <aside className="flex h-full w-full flex-col overflow-y-auto border-l border-[var(--color-border)] bg-[var(--color-surface)]">
      {/* Header */}
      <div className="flex flex-shrink-0 items-center gap-2 border-b border-[var(--color-border)] px-4 py-3">
        <div
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: NODE_ACCENT_COLORS[nodeType] }}
        />
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-[var(--color-muted)] uppercase tracking-wider leading-none mb-0.5">
            {NODE_LABELS[nodeType]}
          </p>
          <p className="text-[13px] font-semibold text-[var(--color-text)]">Step Settings</p>
        </div>
        {data.executionStatus && data.executionStatus !== 'idle' && (
          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium uppercase tracking-wide flex-shrink-0 ${
            data.executionStatus === 'running'   ? 'bg-blue-500/20 text-blue-400'      :
            data.executionStatus === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
            'bg-red-500/20 text-red-400'
          }`}>
            {data.executionStatus === 'running' ? '● running' :
             data.executionStatus === 'completed' ? '✓ done' : '✗ error'}
          </span>
        )}
      </div>

      {/* ── Output block — shown FIRST when node has completed output ── */}
      {isCompleted && hasOutput && (
        <div className="mx-4 mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/5 overflow-hidden flex-shrink-0">
          <div className="flex items-center gap-1.5 px-3 py-2 border-b border-emerald-500/20">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="#10b981" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="text-[10px] text-emerald-400 font-medium uppercase tracking-wider">Output</span>
          </div>
          <pre className="px-3 py-2.5 text-[11px] text-emerald-300 leading-relaxed whitespace-pre-wrap break-words max-h-52 overflow-y-auto font-[var(--font-mono)]">
            {data.executionOutput as string}
          </pre>
        </div>
      )}

      <div className="flex flex-col p-4">
        {/* Common: Label */}
        <FormField label="Label" htmlFor="cfg-label">
          <input
            id="cfg-label"
            type="text"
            value={data.label}
            onChange={(e) => updateNodeData(nodeId, { label: e.target.value })}
            className={inputClass}
          />
        </FormField>

        {/* TextInput */}
        {nodeType === 'textInput' && (
          <FormField label="Default Value" htmlFor="cfg-default">
            <textarea
              id="cfg-default"
              rows={4}
              value={typeof data.defaultValue === 'string' ? data.defaultValue : ''}
              onChange={(e) => updateNodeData(nodeId, { defaultValue: e.target.value })}
              className={textareaClass}
              placeholder="Enter default text…"
            />
          </FormField>
        )}

        {/* ImageInput */}
        {nodeType === 'imageInput' && (
          <div className="flex flex-col gap-2">
            {/* Preview */}
            {typeof data.imageUrl === 'string' && data.imageUrl && (
              <div className="relative rounded-xl overflow-hidden border border-[var(--color-border)]">
                <img
                  src={data.imageUrl as string}
                  alt="preview"
                  className="w-full max-h-48 object-cover"
                />
                <button
                  onClick={() => updateNodeData(nodeId, { imageUrl: '' })}
                  className="absolute top-2 right-2 rounded-full bg-black/60 p-1 text-white/70 hover:text-white hover:bg-black/80 transition-colors"
                  title="Remove image"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            )}

            {/* Upload button */}
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--color-border)] px-4 py-4 text-[12px] text-[var(--color-muted)] transition-colors hover:border-[var(--color-border2)] hover:text-[var(--color-text)]">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1v8M4 4l3-3 3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M1 10v1.5A1.5 1.5 0 002.5 13h9a1.5 1.5 0 001.5-1.5V10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              {typeof data.imageUrl === 'string' && data.imageUrl ? 'Replace image' : 'Upload image'}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  const reader = new FileReader()
                  reader.onload = (ev) => {
                    const result = ev.target?.result
                    if (typeof result === 'string') {
                      updateNodeData(nodeId, { imageUrl: result })
                    }
                  }
                  reader.readAsDataURL(file)
                  // reset so same file can be re-selected
                  e.target.value = ''
                }}
              />
            </label>
            <p className="text-[10px] text-[var(--color-muted)]">
              JPEG, PNG, GIF, WebP · Sent to the LLM as a vision input
            </p>
          </div>
        )}

        {/* LLM */}
        {nodeType === 'llm' && (
          <>
            <FormField label="Model" htmlFor="cfg-model">
              <Select
                id="cfg-model"
                value={typeof data.model === 'string' ? data.model : 'gpt-4o'}
                onChange={(v) => updateNodeData(nodeId, { model: v as LLMModel })}
                options={LLM_MODELS}
              />
            </FormField>

            {/* Available inputs — shown above system prompt so user sees them before writing */}
            <AvailableInputs upstreamNodes={upstreamNodes} onInsert={insertToken} />

            <FormField label="System Prompt" htmlFor="cfg-system">
              <textarea
                id="cfg-system"
                ref={systemRef}
                rows={4}
                value={typeof data.systemPrompt === 'string' ? data.systemPrompt : ''}
                onChange={(e) => updateNodeData(nodeId, { systemPrompt: e.target.value })}
                onFocus={(e) => handleFieldFocus(e.currentTarget, 'systemPrompt')}
                onBlur={(e)  => handleFieldBlur(e.currentTarget,  'systemPrompt')}
                className={textareaClass}
                placeholder="You are a helpful assistant…"
              />
            </FormField>
            <FormField label="User Prompt" htmlFor="cfg-user">
              <textarea
                id="cfg-user"
                ref={userRef}
                rows={4}
                value={typeof data.userPrompt === 'string' ? data.userPrompt : ''}
                onChange={(e) => updateNodeData(nodeId, { userPrompt: e.target.value })}
                onFocus={(e) => handleFieldFocus(e.currentTarget, 'userPrompt')}
                onBlur={(e)  => handleFieldBlur(e.currentTarget,  'userPrompt')}
                className={textareaClass}
                placeholder="{{nodeId.output}}"
              />
            </FormField>

            <SliderField
              label="Temperature"
              id="cfg-temp"
              min={0}
              max={2}
              step={0.1}
              value={typeof data.temperature === 'number' ? data.temperature : 0.7}
              onChange={(v) => updateNodeData(nodeId, { temperature: v })}
            />
            <FormField label="Max Tokens" htmlFor="cfg-tokens">
              <input
                id="cfg-tokens"
                type="number"
                min={64}
                max={8192}
                step={64}
                value={typeof data.maxTokens === 'number' ? data.maxTokens : 1024}
                onChange={(e) => updateNodeData(nodeId, { maxTokens: Number(e.target.value) })}
                className={inputClass}
              />
            </FormField>
            <FormField label="Expected output schema (JSON)" htmlFor="cfg-schema">
              <textarea
                id="cfg-schema"
                rows={3}
                value={typeof data.outputSchema === 'string' ? data.outputSchema : ''}
                onChange={(e) => updateNodeData(nodeId, { outputSchema: e.target.value })}
                className={textareaClass}
                placeholder={'{"sentiment": "string", "score": "number", "summary": "string"}'}
              />
              <p className="text-[10px] text-[var(--color-muted)] mt-1 leading-relaxed">
                If set, the AI is instructed to respond with valid JSON matching this schema.
              </p>
            </FormField>
          </>
        )}

        {/* Branch */}
        {nodeType === 'branch' && (
          <>
            <BranchInputHint upstreamNodes={upstreamNodes} />
            <FormField label="Condition" htmlFor="cfg-condition">
              <input
                id="cfg-condition"
                type="text"
                value={typeof data.condition === 'string' ? data.condition : ''}
                onChange={(e) => updateNodeData(nodeId, { condition: e.target.value })}
                className={inputClass}
                placeholder='output.sentiment === "positive"'
              />
              <p className="text-[10px] text-[var(--color-muted)] mt-1">
                Must evaluate to{' '}
                <code className="text-emerald-400">true</code> or{' '}
                <code className="text-red-400">false</code>
              </p>
            </FormField>
          </>
        )}

        {/* Loop */}
        {nodeType === 'loop' && (
          <>
            <FormField label="Loop Over Field" htmlFor="cfg-loopfield">
              <input
                id="cfg-loopfield"
                type="text"
                value={typeof data.loopOverField === 'string' ? data.loopOverField : ''}
                onChange={(e) => updateNodeData(nodeId, { loopOverField: e.target.value })}
                className={inputClass}
                placeholder="output.items"
              />
            </FormField>
            <FormField label="Execution Strategy" htmlFor="cfg-mode">
              <Select
                id="cfg-mode"
                value={data.mode === 'concurrent' ? 'concurrent' : 'sequential'}
                onChange={(v) => updateNodeData(nodeId, { mode: v as 'sequential' | 'concurrent' })}
                options={[
                  { value: 'sequential', label: 'Sequential' },
                  { value: 'concurrent', label: 'Concurrent' },
                ]}
              />
            </FormField>
          </>
        )}

        {/* TextOutput — read only */}
        {nodeType === 'textOutput' && (
          <FormField label="Output" htmlFor="cfg-output">
            {typeof data.executionOutput === 'string' && data.executionOutput ? (
              <pre
                id="cfg-output"
                className="w-full bg-[var(--color-surface2)] border border-[var(--color-border)] rounded px-2.5 py-2 text-[11px] text-emerald-300 leading-relaxed whitespace-pre-wrap break-words max-h-48 overflow-y-auto font-[var(--font-mono)]"
              >
                {data.executionOutput}
              </pre>
            ) : (
              <p id="cfg-output" className="text-[11px] text-[var(--color-muted)] italic">
                Run the workflow to see output here.
              </p>
            )}
          </FormField>
        )}

        {/* httpRequest */}
        {nodeType === 'httpRequest' && (
          <>
            <AvailableInputs upstreamNodes={upstreamNodes} onInsert={insertToken} />
            <FormField label="Method" htmlFor="cfg-http-method">
              <Select
                id="cfg-http-method"
                value={typeof data.method === 'string' ? data.method : 'GET'}
                onChange={(v) => updateNodeData(nodeId, { method: v as FlowNodeData['method'] })}
                options={HTTP_METHODS}
              />
            </FormField>
            <FormField label="URL" htmlFor="cfg-http-url">
              <input
                id="cfg-http-url"
                type="text"
                value={typeof data.url === 'string' ? data.url : ''}
                onChange={(e) => updateNodeData(nodeId, { url: e.target.value })}
                onFocus={(e) => handleFieldFocus(e.currentTarget, 'url')}
                onBlur={(e)  => handleFieldBlur(e.currentTarget,  'url')}
                className={inputClass}
                placeholder="https://api.example.com/endpoint"
              />
              <p className="text-[10px] text-[var(--color-muted)] mt-1">
                Template tokens like <code className="text-blue-400">{'{{nodeId.output}}'}</code> are supported.
              </p>
            </FormField>
            <FormField label="Request Headers (JSON)" htmlFor="cfg-http-headers">
              <textarea
                id="cfg-http-headers"
                rows={3}
                value={typeof data.requestHeaders === 'string' ? data.requestHeaders : '{}'}
                onChange={(e) => updateNodeData(nodeId, { requestHeaders: e.target.value })}
                onFocus={(e) => handleFieldFocus(e.currentTarget, 'requestHeaders')}
                onBlur={(e)  => handleFieldBlur(e.currentTarget,  'requestHeaders')}
                className={textareaClass}
                placeholder={'{"Authorization": "Bearer token", "Content-Type": "application/json"}'}
              />
            </FormField>
            {(data.method === 'POST' || data.method === 'PUT' || data.method === 'PATCH') && (
              <FormField label="Request Body" htmlFor="cfg-http-body">
                <textarea
                  id="cfg-http-body"
                  rows={4}
                  value={typeof data.requestBody === 'string' ? data.requestBody : ''}
                  onChange={(e) => updateNodeData(nodeId, { requestBody: e.target.value })}
                  onFocus={(e) => handleFieldFocus(e.currentTarget, 'requestBody')}
                  onBlur={(e)  => handleFieldBlur(e.currentTarget,  'requestBody')}
                  className={textareaClass}
                  placeholder={'{"key": "{{nodeId.output}}"}'}
                />
                <p className="text-[10px] text-[var(--color-muted)] mt-1">
                  Template tokens are supported in the body.
                </p>
              </FormField>
            )}
          </>
        )}

        {/* emailSend */}
        {nodeType === 'emailSend' && (
          <>
            <AvailableInputs upstreamNodes={upstreamNodes} onInsert={insertToken} />
            <FormField label="To" htmlFor="cfg-email-to">
              <input
                id="cfg-email-to"
                type="text"
                value={typeof data.emailTo === 'string' ? data.emailTo : ''}
                onChange={(e) => updateNodeData(nodeId, { emailTo: e.target.value })}
                onFocus={(e) => handleFieldFocus(e.currentTarget, 'emailTo')}
                onBlur={(e)  => handleFieldBlur(e.currentTarget,  'emailTo')}
                className={inputClass}
                placeholder="recipient@example.com"
              />
            </FormField>
            <FormField label="Subject" htmlFor="cfg-email-subject">
              <input
                id="cfg-email-subject"
                type="text"
                value={typeof data.emailSubject === 'string' ? data.emailSubject : ''}
                onChange={(e) => updateNodeData(nodeId, { emailSubject: e.target.value })}
                onFocus={(e) => handleFieldFocus(e.currentTarget, 'emailSubject')}
                onBlur={(e)  => handleFieldBlur(e.currentTarget,  'emailSubject')}
                className={inputClass}
                placeholder="Email subject…"
              />
            </FormField>
            <FormField label="Body" htmlFor="cfg-email-body">
              <textarea
                id="cfg-email-body"
                rows={5}
                value={typeof data.emailBody === 'string' ? data.emailBody : ''}
                onChange={(e) => updateNodeData(nodeId, { emailBody: e.target.value })}
                onFocus={(e) => handleFieldFocus(e.currentTarget, 'emailBody')}
                onBlur={(e)  => handleFieldBlur(e.currentTarget,  'emailBody')}
                className={textareaClass}
                placeholder="Email body… template tokens supported."
              />
            </FormField>
            <div className="mt-1 px-2.5 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-canvas)]">
              <p className="text-[10px] text-[var(--color-muted)] leading-relaxed">
                Requires <code className="text-amber-400">SENDGRID_API_KEY</code> env var on server.{' '}
                In dev mode, emails are logged to the console.
              </p>
            </div>
          </>
        )}

        {/* humanApproval */}
        {nodeType === 'humanApproval' && (
          <>
            <FormField label="Approval Message" htmlFor="cfg-approval-msg">
              <textarea
                id="cfg-approval-msg"
                rows={4}
                value={typeof data.approvalMessage === 'string' ? data.approvalMessage : ''}
                onChange={(e) => updateNodeData(nodeId, { approvalMessage: e.target.value })}
                onFocus={(e) => handleFieldFocus(e.currentTarget, 'approvalMessage')}
                onBlur={(e)  => handleFieldBlur(e.currentTarget,  'approvalMessage')}
                className={textareaClass}
                placeholder="Please review and approve or reject this step."
              />
              <p className="text-[10px] text-[var(--color-muted)] mt-1 leading-relaxed">
                This message is shown to the reviewer. Downstream nodes receive{' '}
                <code className="text-emerald-400">approved</code> or{' '}
                <code className="text-red-400">rejected</code>.
              </p>
            </FormField>
            <FormField label="Notification Email" htmlFor="cfg-approval-email">
              <input
                id="cfg-approval-email"
                type="email"
                value={typeof data.approvalEmail === 'string' ? data.approvalEmail : ''}
                onChange={(e) => updateNodeData(nodeId, { approvalEmail: e.target.value })}
                onFocus={(e) => handleFieldFocus(e.currentTarget, 'approvalEmail')}
                onBlur={(e)  => handleFieldBlur(e.currentTarget,  'approvalEmail')}
                className={inputClass}
                placeholder="you@email.com"
              />
              <p className="text-[10px] text-[var(--color-muted)] mt-1 leading-relaxed">
                When approval is needed, an email is sent with the content to review and a direct link to approve or reject.
              </p>
            </FormField>
            <FormField label="Timeout" htmlFor="cfg-approval-timeout">
              <Select
                id="cfg-approval-timeout"
                value={String(typeof data.approvalTimeout === 'number' ? data.approvalTimeout : 0)}
                onChange={(v) => updateNodeData(nodeId, { approvalTimeout: Number(v) })}
                options={APPROVAL_TIMEOUTS}
              />
            </FormField>
          </>
        )}

        {/* webhookTrigger */}
        {nodeType === 'webhookTrigger' && (
          <div className="flex flex-col gap-3">
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-canvas)] p-3">
              <p className="text-[10px] text-[var(--color-muted)] uppercase tracking-wider mb-2">Webhook URL</p>
              {webhookLoading ? (
                <p className="text-[11px] text-[var(--color-muted)]">Loading…</p>
              ) : webhookUrl ? (
                <>
                  <p className="text-[10px] font-mono text-emerald-400 break-all leading-relaxed">
                    POST {webhookUrl}
                  </p>
                  <button
                    onClick={() => void navigator.clipboard.writeText(webhookUrl)}
                    className="mt-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] px-2.5 py-1 text-[10px] text-[var(--color-text)] transition-colors hover:border-[var(--color-border2)]"
                  >
                    Copy URL
                  </button>
                </>
              ) : (
                <p className="text-[11px] text-[var(--color-muted)]">
                  {dbId ? 'Failed to load webhook URL.' : 'Save the workflow first to generate a webhook URL.'}
                </p>
              )}
            </div>
            <button
              onClick={() => void handleRegenerateWebhook()}
              disabled={webhookLoading || !dbId}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] px-3 py-1.5 text-[11px] text-[var(--color-text)] transition-colors hover:border-[var(--color-border2)] disabled:opacity-40"
            >
              {webhookLoading ? 'Regenerating…' : 'Regenerate webhook token'}
            </button>
          </div>
        )}

        {/* Notion */}
        {nodeType === 'notion' && (
          <div className="flex flex-col gap-3">
            {/* Operation */}
            <FormField label="Operation" htmlFor="cfg-notion-op">
              <Select
                id="cfg-notion-op"
                value={typeof data.integrationOp === 'string' ? data.integrationOp : 'create_page'}
                onChange={(val) => updateNodeData(nodeId, { integrationOp: val })}
                options={[
                  { value: 'create_page', label: 'Create Page' },
                  { value: 'query_database', label: 'Query Database' },
                  { value: 'append_blocks', label: 'Append Blocks to Page' },
                ]}
              />
            </FormField>

            {/* API Token */}
            <FormField label="Notion API Token" htmlFor="cfg-notion-token">
              <input
                id="cfg-notion-token"
                type="password"
                value={typeof data.integrationToken === 'string' ? data.integrationToken : ''}
                onChange={(e) => updateNodeData(nodeId, { integrationToken: e.target.value })}
                className={inputClass}
                placeholder="secret_..."
              />
            </FormField>
            <p className="text-[10px] text-[var(--color-muted)] -mt-2">
              Get from notion.so → Settings → Integrations → New integration
            </p>

            {/* create_page fields */}
            {(data.integrationOp === 'create_page' || !data.integrationOp) && (
              <>
                <FormField label="Database ID" htmlFor="cfg-notion-db">
                  <input
                    id="cfg-notion-db"
                    type="text"
                    value={typeof data.notionDatabaseId === 'string' ? data.notionDatabaseId : ''}
                    onChange={(e) => updateNodeData(nodeId, { notionDatabaseId: e.target.value })}
                    className={inputClass}
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  />
                </FormField>
                <FormField label="Title" htmlFor="cfg-notion-title">
                  <input
                    id="cfg-notion-title"
                    type="text"
                    value={typeof data.notionTitle === 'string' ? data.notionTitle : ''}
                    onChange={(e) => updateNodeData(nodeId, { notionTitle: e.target.value })}
                    className={inputClass}
                    placeholder="{{llm-1.output}}"
                  />
                </FormField>
                <FormField label="Content" htmlFor="cfg-notion-content">
                  <textarea
                    id="cfg-notion-content"
                    rows={3}
                    value={typeof data.notionContent === 'string' ? data.notionContent : ''}
                    onChange={(e) => updateNodeData(nodeId, { notionContent: e.target.value })}
                    className={textareaClass}
                    placeholder="{{llm-1.output}}"
                  />
                </FormField>
              </>
            )}

            {/* query_database fields */}
            {data.integrationOp === 'query_database' && (
              <>
                <FormField label="Database ID" htmlFor="cfg-notion-db-q">
                  <input
                    id="cfg-notion-db-q"
                    type="text"
                    value={typeof data.notionDatabaseId === 'string' ? data.notionDatabaseId : ''}
                    onChange={(e) => updateNodeData(nodeId, { notionDatabaseId: e.target.value })}
                    className={inputClass}
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  />
                </FormField>
                <FormField label="Filter (JSON, optional)" htmlFor="cfg-notion-filter">
                  <textarea
                    id="cfg-notion-filter"
                    rows={3}
                    value={typeof data.notionFilter === 'string' ? data.notionFilter : ''}
                    onChange={(e) => updateNodeData(nodeId, { notionFilter: e.target.value })}
                    className={textareaClass}
                    placeholder='{"property":"Status","select":{"equals":"Done"}}'
                  />
                </FormField>
              </>
            )}

            {/* append_blocks fields */}
            {data.integrationOp === 'append_blocks' && (
              <>
                <FormField label="Page ID" htmlFor="cfg-notion-page">
                  <input
                    id="cfg-notion-page"
                    type="text"
                    value={typeof data.notionPageId === 'string' ? data.notionPageId : ''}
                    onChange={(e) => updateNodeData(nodeId, { notionPageId: e.target.value })}
                    className={inputClass}
                    placeholder="{{prev-node.output}} or page ID"
                  />
                </FormField>
                <FormField label="Content" htmlFor="cfg-notion-content-ap">
                  <textarea
                    id="cfg-notion-content-ap"
                    rows={3}
                    value={typeof data.notionContent === 'string' ? data.notionContent : ''}
                    onChange={(e) => updateNodeData(nodeId, { notionContent: e.target.value })}
                    className={textareaClass}
                    placeholder="{{llm-1.output}}"
                  />
                </FormField>
              </>
            )}
          </div>
        )}

        {/* Linear */}
        {nodeType === 'linear' && (
          <div className="flex flex-col gap-3">
            {/* Operation */}
            <FormField label="Operation" htmlFor="cfg-linear-op">
              <Select
                id="cfg-linear-op"
                value={typeof data.integrationOp === 'string' ? data.integrationOp : 'create_issue'}
                onChange={(val) => updateNodeData(nodeId, { integrationOp: val })}
                options={[
                  { value: 'create_issue', label: 'Create Issue' },
                  { value: 'get_issues', label: 'Get Issues' },
                  { value: 'create_comment', label: 'Create Comment' },
                ]}
              />
            </FormField>

            {/* API Token */}
            <FormField label="Linear API Key" htmlFor="cfg-linear-token">
              <input
                id="cfg-linear-token"
                type="password"
                value={typeof data.integrationToken === 'string' ? data.integrationToken : ''}
                onChange={(e) => updateNodeData(nodeId, { integrationToken: e.target.value })}
                className={inputClass}
                placeholder="lin_api_..."
              />
            </FormField>
            <p className="text-[10px] text-[var(--color-muted)] -mt-2">
              Get from linear.app → Settings → API → Personal API keys
            </p>

            {/* create_issue fields */}
            {(data.integrationOp === 'create_issue' || !data.integrationOp) && (
              <>
                <FormField label="Team ID" htmlFor="cfg-linear-team">
                  <input
                    id="cfg-linear-team"
                    type="text"
                    value={typeof data.linearTeamId === 'string' ? data.linearTeamId : ''}
                    onChange={(e) => updateNodeData(nodeId, { linearTeamId: e.target.value })}
                    className={inputClass}
                    placeholder="Team ID from Linear"
                  />
                </FormField>
                <FormField label="Title" htmlFor="cfg-linear-title">
                  <input
                    id="cfg-linear-title"
                    type="text"
                    value={typeof data.linearTitle === 'string' ? data.linearTitle : ''}
                    onChange={(e) => updateNodeData(nodeId, { linearTitle: e.target.value })}
                    className={inputClass}
                    placeholder="{{llm-1.output}}"
                  />
                </FormField>
                <FormField label="Description" htmlFor="cfg-linear-desc">
                  <textarea
                    id="cfg-linear-desc"
                    rows={3}
                    value={typeof data.linearDescription === 'string' ? data.linearDescription : ''}
                    onChange={(e) => updateNodeData(nodeId, { linearDescription: e.target.value })}
                    className={textareaClass}
                    placeholder="{{llm-1.output}}"
                  />
                </FormField>
                <FormField label="Priority" htmlFor="cfg-linear-priority">
                  <Select
                    id="cfg-linear-priority"
                    value={typeof data.linearPriority === 'string' ? data.linearPriority : '3'}
                    onChange={(val) => updateNodeData(nodeId, { linearPriority: val })}
                    options={[
                      { value: '0', label: 'No Priority' },
                      { value: '1', label: 'Urgent' },
                      { value: '2', label: 'High' },
                      { value: '3', label: 'Medium' },
                      { value: '4', label: 'Low' },
                    ]}
                  />
                </FormField>
              </>
            )}

            {/* get_issues fields */}
            {data.integrationOp === 'get_issues' && (
              <>
                <FormField label="Team ID (optional)" htmlFor="cfg-linear-team-g">
                  <input
                    id="cfg-linear-team-g"
                    type="text"
                    value={typeof data.linearTeamId === 'string' ? data.linearTeamId : ''}
                    onChange={(e) => updateNodeData(nodeId, { linearTeamId: e.target.value })}
                    className={inputClass}
                    placeholder="Leave blank for all teams"
                  />
                </FormField>
                <FormField label="Limit" htmlFor="cfg-linear-limit">
                  <input
                    id="cfg-linear-limit"
                    type="number"
                    value={typeof data.linearLimit === 'string' ? data.linearLimit : '25'}
                    onChange={(e) => updateNodeData(nodeId, { linearLimit: e.target.value })}
                    className={inputClass}
                    placeholder="25"
                  />
                </FormField>
              </>
            )}

            {/* create_comment fields */}
            {data.integrationOp === 'create_comment' && (
              <>
                <FormField label="Issue ID" htmlFor="cfg-linear-issue">
                  <input
                    id="cfg-linear-issue"
                    type="text"
                    value={typeof data.linearIssueId === 'string' ? data.linearIssueId : ''}
                    onChange={(e) => updateNodeData(nodeId, { linearIssueId: e.target.value })}
                    className={inputClass}
                    placeholder="{{prev-node.output}} or issue ID"
                  />
                </FormField>
                <FormField label="Comment" htmlFor="cfg-linear-comment">
                  <textarea
                    id="cfg-linear-comment"
                    rows={3}
                    value={typeof data.linearCommentBody === 'string' ? data.linearCommentBody : ''}
                    onChange={(e) => updateNodeData(nodeId, { linearCommentBody: e.target.value })}
                    className={textareaClass}
                    placeholder="{{llm-1.output}}"
                  />
                </FormField>
              </>
            )}
          </div>
        )}

        {/* scheduledTrigger */}
        {nodeType === 'scheduledTrigger' && (
          <div className="flex flex-col gap-3">
            {/* Frequency */}
            <FormField label="Frequency" htmlFor="cfg-sched-freq">
              <Select
                id="cfg-sched-freq"
                value={schedFrequency}
                onChange={(v) => { setSchedFrequency(v); void saveSchedule({ frequency: v }) }}
                options={FREQUENCY_OPTIONS}
              />
            </FormField>

            {/* Time (not shown for hourly) */}
            {schedFrequency !== 'hourly' && (
              <FormField label={`Time (${userTz})`} htmlFor="cfg-sched-time">
                <input
                  id="cfg-sched-time"
                  type="time"
                  value={schedTime}
                  onChange={(e) => setSchedTime(e.target.value)}
                  onBlur={(e) => void saveSchedule({ run_time: e.target.value })}
                  className={inputClass}
                />
              </FormField>
            )}

            {/* Day of week (weekly only) */}
            {schedFrequency === 'weekly' && (
              <FormField label="Day of week" htmlFor="cfg-sched-dow">
                <Select
                  id="cfg-sched-dow"
                  value={String(schedDayOfWeek)}
                  onChange={(v) => { setSchedDayOfWeek(Number(v)); void saveSchedule({ day_of_week: Number(v) }) }}
                  options={WEEKDAY_OPTIONS}
                />
              </FormField>
            )}

            {/* Day of month (monthly only) */}
            {schedFrequency === 'monthly' && (
              <FormField label="Day of month" htmlFor="cfg-sched-dom">
                <input
                  id="cfg-sched-dom"
                  type="number"
                  min={1}
                  max={28}
                  value={schedDayOfMonth}
                  onChange={(e) => setSchedDayOfMonth(Number(e.target.value))}
                  onBlur={() => void saveSchedule({ day_of_month: schedDayOfMonth })}
                  className={inputClass}
                />
              </FormField>
            )}

            {/* Repeat toggle */}
            <div className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-canvas)] px-3 py-2.5">
              <span className="text-[11px] text-[var(--color-text)]">Repeat</span>
              <button
                onClick={() => { setSchedRepeat((r) => { const next = !r; void saveSchedule({ repeat: next }); return next }) }}
                className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors ${schedRepeat ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-border2)]'}`}
              >
                <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${schedRepeat ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
            </div>

            {/* Next run info */}
            {schedNextRun && (
              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-canvas)] px-3 py-2.5">
                <p className="text-[10px] text-[var(--color-muted)]">Next run</p>
                <p className="text-[11px] text-[var(--color-text)] mt-0.5">
                  {new Date(schedNextRun).toLocaleString()}
                </p>
              </div>
            )}

            {schedSaving && <p className="text-[10px] text-[var(--color-muted)]">Saving…</p>}

            {/* Remove schedule */}
            <button
              onClick={async () => {
                if (!dbId) return
                await fetch(`${API}/api/workflows/${dbId}/schedule`, { method: 'DELETE' })
                setSchedNextRun(null)
              }}
              className="text-[10px] text-red-400/60 hover:text-red-400 transition-colors text-left"
            >
              Remove schedule
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
