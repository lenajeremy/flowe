import { useRef, useState, useEffect, useCallback } from 'react'
import { useWorkflowStore } from '@/store/workflowStore'
import { useShallow } from 'zustand/react/shallow'
import { FormField, inputClass, textareaClass } from '@/components/ui/FormField'
import { SliderField } from '@/components/ui/SliderField'
import { Select } from '@/components/ui/Select'
import { NODE_LABELS, NODE_ACCENT_HEX } from '@/lib/nodeColors'
import { NodeStatusTab, NodeLogsTab } from '@/components/panels/NodeRunTabs'
import { IntegrationConnect } from '@/components/ui/IntegrationConnect'
import { ResourcePicker } from '@/components/ui/ResourcePicker'
import type { LLMModel, FlowNode, FlowEdge, FlowNodeData } from '@/types/workflow'
import { API } from '@/lib/config'
import { apiFetch } from '@/lib/http'

// ── Reusable integration-config field helpers ─────────────────
// The five new integration providers share the same form shapes; these small
// components keep each provider block declarative instead of 100+ lines of
// repeated JSX.

type UpdateFn = (nodeId: string, partial: Partial<FlowNodeData>) => void

interface FieldProps {
  label: string
  field: string
  data: FlowNodeData
  nodeId: string
  updateNodeData: UpdateFn
  placeholder?: string
}

function TextField({ label, field, data, nodeId, updateNodeData, placeholder }: FieldProps) {
  return (
    <FormField label={label} htmlFor={`cfg-${nodeId}-${field}`}>
      <input id={`cfg-${nodeId}-${field}`} type="text" className={inputClass} placeholder={placeholder}
        value={typeof data[field] === 'string' ? (data[field] as string) : ''}
        onChange={(e) => updateNodeData(nodeId, { [field]: e.target.value })} />
    </FormField>
  )
}

function AreaField({ label, field, data, nodeId, updateNodeData, placeholder }: FieldProps) {
  return (
    <FormField label={label} htmlFor={`cfg-${nodeId}-${field}`}>
      <textarea id={`cfg-${nodeId}-${field}`} rows={3} className={textareaClass} placeholder={placeholder}
        value={typeof data[field] === 'string' ? (data[field] as string) : ''}
        onChange={(e) => updateNodeData(nodeId, { [field]: e.target.value })} />
    </FormField>
  )
}

function NumField({ label, field, data, nodeId, updateNodeData, fallback }: FieldProps & { fallback: number }) {
  return (
    <FormField label={label} htmlFor={`cfg-${nodeId}-${field}`}>
      <input id={`cfg-${nodeId}-${field}`} type="number" className={inputClass}
        value={String(typeof data[field] === 'number' ? (data[field] as number) : fallback)}
        onChange={(e) => updateNodeData(nodeId, { [field]: Number(e.target.value) })} />
    </FormField>
  )
}

function SelectField({ label, field, data, nodeId, updateNodeData, fallback, options }: FieldProps & { fallback: string; options: { value: string; label: string }[] }) {
  return (
    <FormField label={label} htmlFor={`cfg-${nodeId}-${field}`}>
      <Select id={`cfg-${nodeId}-${field}`}
        value={typeof data[field] === 'string' ? (data[field] as string) : fallback}
        onChange={(val) => updateNodeData(nodeId, { [field]: val })}
        options={options} />
    </FormField>
  )
}

type ResourceProvider = 'notion' | 'linear' | 'github' | 'gitlab' | 'stripe' | 'googlecalendar' | 'googledrive' | 'outlook' | 'slack'
type ResourceKind = 'database' | 'page' | 'team' | 'project' | 'repo' | 'price' | 'calendar' | 'folder' | 'channel'

function ResourceField({ label, provider, kind, field, data, nodeId, updateNodeData, placeholder }: FieldProps & { provider: ResourceProvider; kind: ResourceKind }) {
  return (
    <FormField label={label} htmlFor={`cfg-${nodeId}-${field}`}>
      <ResourcePicker provider={provider} kind={kind} id={`cfg-${nodeId}-${field}`} placeholder={placeholder}
        value={typeof data[field] === 'string' ? (data[field] as string) : ''}
        onChange={(val) => updateNodeData(nodeId, { [field]: val })} />
    </FormField>
  )
}

// IntegrationSection renders the operation selector + Connect card shared by
// the github/gitlab/gmail/stripe/shopify config blocks, then its children
// (the per-op fields).
function IntegrationSection({
  provider, label, data, nodeId, updateNodeData, defaultOp, ops, tokenPlaceholder, hideManual, children,
}: {
  provider: 'github' | 'gitlab' | 'gmail' | 'stripe' | 'shopify' | 'googlecalendar' | 'outlook' | 'slack' | 'googledrive' | 'googledocs' | 'googlesheets'
  label: string
  data: FlowNodeData
  nodeId: string
  updateNodeData: UpdateFn
  defaultOp: string
  ops: { value: string; label: string }[]
  tokenPlaceholder: string
  hideManual?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-3">
      <FormField label="Operation" htmlFor={`cfg-${nodeId}-op`}>
        <Select id={`cfg-${nodeId}-op`}
          value={typeof data.integrationOp === 'string' ? data.integrationOp : defaultOp}
          onChange={(val) => updateNodeData(nodeId, { integrationOp: val })}
          options={ops} />
      </FormField>

      <IntegrationConnect
        provider={provider}
        label={label}
        hasManualToken={!hideManual && typeof data.integrationToken === 'string' && data.integrationToken !== ''}
        manualField={hideManual ? null : (
          <FormField label={`${label} Token`} htmlFor={`cfg-${nodeId}-token`}>
            <input id={`cfg-${nodeId}-token`} type="password" className={inputClass} placeholder={tokenPlaceholder}
              value={typeof data.integrationToken === 'string' ? data.integrationToken : ''}
              onChange={(e) => updateNodeData(nodeId, { integrationToken: e.target.value })} />
          </FormField>
        )}
      />

      {children}
    </div>
  )
}

type InspectorTab = 'configure' | 'status' | 'logs'

const INSPECTOR_TABS: Array<{ id: InspectorTab; label: string }> = [
  { id: 'configure', label: 'Configure' },
  { id: 'status',    label: 'Status'    },
  { id: 'logs',      label: 'Logs'      },
]

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

const LLM_MODELS: Array<{ value: string; label: string; group: string }> = [
  { value: 'gpt-4o',                 label: 'GPT-4o',              group: 'OpenAI' },
  { value: 'gpt-4o-mini',            label: 'GPT-4o Mini',         group: 'OpenAI' },
  { value: 'o4-mini',                label: 'o4-mini',             group: 'OpenAI' },
  { value: 'claude-opus-4-5',        label: 'Claude Opus 4.5',     group: 'Anthropic' },
  { value: 'claude-sonnet-4-5',      label: 'Claude Sonnet 4.5',   group: 'Anthropic' },
  { value: 'claude-haiku-4-5',       label: 'Claude Haiku 4.5',    group: 'Anthropic' },
  { value: 'gemini-2.5-pro',         label: 'Gemini 2.5 Pro',        group: 'Google' },
  { value: 'gemini-3-flash',         label: 'Gemini 3 Flash',        group: 'Google' },
  { value: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro',        group: 'Google' },
  { value: 'gemini-3.1-flash',       label: 'Gemini 3.1 Flash',      group: 'Google' },
  { value: 'gemini-3.1-flash-lite',  label: 'Gemini 3.1 Flash Lite', group: 'Google' },
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
      <p className="micro text-[var(--color-subtle)] mb-2">
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
              className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded border border-[var(--color-border)] bg-[var(--color-surface2)] hover:border-[var(--color-accent)] hover:bg-[var(--color-surface)] transition-colors group"
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
              <code className="text-[10px] text-[var(--color-accent)] font-[var(--font-mono)] truncate max-w-[110px] opacity-60 group-hover:opacity-100 transition-opacity">
                {token}
              </code>
              {/* Action hint */}
              <span className={`text-[9px] flex-shrink-0 transition-colors ${isCopied ? 'text-[var(--color-ok)]' : 'text-[var(--color-muted)] group-hover:text-[var(--color-accent)]'}`}>
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
      <p className="micro text-[var(--color-subtle)] mb-1.5">
        Condition context
      </p>
      <p className="text-[11px] text-[var(--color-text)] leading-relaxed">
        <code className="text-[var(--color-hold)]">output</code>
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
  const { nodes, edges, selectedNodeId, selectedNodeIds, updateNodeData, dbId } = useWorkflowStore(
    useShallow((s) => ({
      nodes: s.nodes,
      edges: s.edges,
      selectedNodeId: s.selectedNodeId,
      selectedNodeIds: s.selectedNodeIds,
      updateNodeData: s.updateNodeData,
      dbId: s.dbId,
    })),
  )

  // Configure / Status / Logs — Figma frames 162-166
  const [activeTab, setActiveTab] = useState<InspectorTab>('configure')

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
      const r = await apiFetch(`${API}/api/workflows/${dbId}/webhook`)
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
    apiFetch(`${API}/api/workflows/${dbId}/schedule`)
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
      const r = await apiFetch(`${API}/api/workflows/${dbId}/schedule`, {
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
      await apiFetch(`${API}/api/workflows/${dbId}/webhook`, { method: 'DELETE' })
      await fetchWebhook()
    } catch {
      // best-effort
    }
  }

  // ── Empty state — Figma frame 161: "No node Selected" ──────
  if (!selectedNode || selectedNodeIds.length > 1) {
    return (
      <aside className="flex h-full w-full flex-col items-center justify-center gap-3 px-12 text-center">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-[var(--color-text)]">
          <path d="M13 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-6-6z"
            stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M13 2v6h6M9.5 12.5l5 5M14.5 12.5l-5 5"
            stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div className="flex flex-col gap-1">
          <p className="text-[14px] font-medium text-[var(--color-text)]">No node Selected</p>
          <p className="text-[10px] leading-relaxed text-[var(--color-dim)]">
            Select a node to make edits, view status or logs
          </p>
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
    <aside className="flex h-full w-full flex-col overflow-hidden">
      {/* Header — Figma frames 162/163: node title, close X lives in the page overlay */}
      <div className="flex-shrink-0 px-4 pb-0 pr-12 pt-5">
        <h2 className="truncate text-[16px] font-medium text-[var(--color-text)]">
          {data.label || NODE_LABELS[nodeType]}
        </h2>
      </div>

      {/* Configure / Status / Logs tabs */}
      <div className="flex-shrink-0">
        <div className="flex items-center gap-3 px-4 pt-3">
          {INSPECTOR_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`pb-2 text-[12px] font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-[var(--color-text)]'
                  : 'text-[var(--color-dim)] hover:text-[var(--color-text)]'
              }`}
              style={activeTab === tab.id ? { boxShadow: 'inset 0 -2px 0 0 var(--color-accent)' } : undefined}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="h-px w-full bg-[var(--color-hover)]" />
      </div>

      {activeTab === 'status' && <NodeStatusTab />}
      {activeTab === 'logs' && <NodeLogsTab />}

      {activeTab === 'configure' && (
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      {/* ── Output block — shown FIRST when node has completed output ── */}
      {isCompleted && hasOutput && (
        <div className="mx-4 mt-4 rounded-lg border border-[var(--color-ok)]/30 bg-[var(--color-ok)]/5 overflow-hidden flex-shrink-0">
          <div className="flex items-center gap-1.5 px-3 py-2 border-b border-[var(--color-ok)]/20">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="var(--color-ok)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="micro text-[var(--color-ok)]">Output</span>
          </div>
          <pre className="px-3 py-2.5 text-[11px] text-[var(--color-ok)] leading-relaxed whitespace-pre-wrap break-words max-h-52 overflow-y-auto font-[var(--font-mono)]">
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

            {/* Web search toggle */}
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <div className="relative mt-0.5 shrink-0">
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={data.enableWebSearch === true}
                  onChange={(e) => updateNodeData(nodeId, { enableWebSearch: e.target.checked })}
                />
                <div className={`w-8 h-4.5 rounded-full transition-colors ${data.enableWebSearch ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-border)]'}`} />
                <div className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-transform ${data.enableWebSearch ? 'translate-x-3.5' : ''}`} />
              </div>
              <div>
                <p className="text-[13px] font-medium leading-none mb-1">Web search</p>
                <p className="text-[10px] text-[var(--color-muted)] leading-relaxed">
                  Gives this model <code className="text-[var(--color-accent)]">web_search</code> and <code className="text-[var(--color-accent)]">read_url</code> tools. Requires <code>BRAVE_API_KEY</code> for search; URL reading works without a key.
                </p>
              </div>
            </label>
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
                <code className="text-[var(--color-ok)]">true</code> or{' '}
                <code className="text-[var(--color-fail)]">false</code>
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
                className="w-full bg-[var(--color-surface2)] border border-[var(--color-border)] rounded px-2.5 py-2 text-[11px] text-[var(--color-ok)] leading-relaxed whitespace-pre-wrap break-words max-h-48 overflow-y-auto font-[var(--font-mono)]"
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
                Template tokens like <code className="text-[var(--color-accent)]">{'{{nodeId.output}}'}</code> are supported.
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
                Requires <code className="text-[var(--color-hold)]">SENDGRID_API_KEY</code> env var on server.{' '}
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
                <code className="text-[var(--color-ok)]">approved</code> or{' '}
                <code className="text-[var(--color-fail)]">rejected</code>.
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
              <p className="micro text-[var(--color-subtle)] mb-2">Webhook URL</p>
              {webhookLoading ? (
                <p className="text-[11px] text-[var(--color-muted)]">Loading…</p>
              ) : webhookUrl ? (
                <>
                  <p className="text-[10px] font-mono text-[var(--color-ok)] break-all leading-relaxed">
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
                  { value: 'update_page', label: 'Update Page' },
                  { value: 'get_page_content', label: 'Get Page Content' },
                  { value: 'search', label: 'Search' },
                  { value: 'add_comment', label: 'Add Comment' },
                ]}
              />
            </FormField>

            {/* Connection — OAuth via server, manual token as override */}
            <IntegrationConnect
              provider="notion"
              label="Notion"
              hasManualToken={typeof data.integrationToken === 'string' && data.integrationToken !== ''}
              manualField={
                <>
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
                </>
              }
            />

            {/* create_page fields */}
            {(data.integrationOp === 'create_page' || !data.integrationOp) && (
              <>
                <FormField label="Database" htmlFor="cfg-notion-db">
                  <ResourcePicker
                    provider="notion"
                    kind="database"
                    id="cfg-notion-db"
                    value={typeof data.notionDatabaseId === 'string' ? data.notionDatabaseId : ''}
                    onChange={(val) => updateNodeData(nodeId, { notionDatabaseId: val })}
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
                <FormField label="Database" htmlFor="cfg-notion-db-q">
                  <ResourcePicker
                    provider="notion"
                    kind="database"
                    id="cfg-notion-db-q"
                    value={typeof data.notionDatabaseId === 'string' ? data.notionDatabaseId : ''}
                    onChange={(val) => updateNodeData(nodeId, { notionDatabaseId: val })}
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
                <FormField label="Page" htmlFor="cfg-notion-page">
                  <ResourcePicker
                    provider="notion"
                    kind="page"
                    id="cfg-notion-page"
                    value={typeof data.notionPageId === 'string' ? data.notionPageId : ''}
                    onChange={(val) => updateNodeData(nodeId, { notionPageId: val })}
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

            {/* get_page_content / add_comment need a page */}
            {(data.integrationOp === 'get_page_content' || data.integrationOp === 'add_comment') && (
              <FormField label="Page" htmlFor="cfg-notion-page-r">
                <ResourcePicker
                  provider="notion" kind="page" id="cfg-notion-page-r"
                  value={typeof data.notionPageId === 'string' ? data.notionPageId : ''}
                  onChange={(val) => updateNodeData(nodeId, { notionPageId: val })}
                  placeholder="{{prev-node.output}} or page ID"
                />
              </FormField>
            )}
            {data.integrationOp === 'add_comment' && (
              <FormField label="Comment" htmlFor="cfg-notion-comment">
                <textarea id="cfg-notion-comment" rows={3}
                  value={typeof data.notionContent === 'string' ? data.notionContent : ''}
                  onChange={(e) => updateNodeData(nodeId, { notionContent: e.target.value })}
                  className={textareaClass} placeholder="{{llm-1.output}}" />
              </FormField>
            )}
            {data.integrationOp === 'update_page' && (
              <>
                <FormField label="Page" htmlFor="cfg-notion-page-u">
                  <ResourcePicker
                    provider="notion" kind="page" id="cfg-notion-page-u"
                    value={typeof data.notionPageId === 'string' ? data.notionPageId : ''}
                    onChange={(val) => updateNodeData(nodeId, { notionPageId: val })}
                    placeholder="Page ID"
                  />
                </FormField>
                <FormField label="Properties (JSON)" htmlFor="cfg-notion-props">
                  <textarea id="cfg-notion-props" rows={4}
                    value={typeof data.notionProperties === 'string' ? data.notionProperties : ''}
                    onChange={(e) => updateNodeData(nodeId, { notionProperties: e.target.value })}
                    className={textareaClass}
                    placeholder='{"Status":{"select":{"name":"Done"}}}' />
                </FormField>
              </>
            )}
            {data.integrationOp === 'search' && (
              <FormField label="Search query" htmlFor="cfg-notion-query">
                <input id="cfg-notion-query" type="text"
                  value={typeof data.notionQuery === 'string' ? data.notionQuery : ''}
                  onChange={(e) => updateNodeData(nodeId, { notionQuery: e.target.value })}
                  className={inputClass} placeholder="meeting notes" />
              </FormField>
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
                  { value: 'update_issue', label: 'Update Issue' },
                  { value: 'search_issues', label: 'Search Issues' },
                  { value: 'list_projects', label: 'List Projects' },
                  { value: 'get_issue', label: 'Get Issue' },
                ]}
              />
            </FormField>

            {/* Connection — OAuth via server, manual token as override */}
            <IntegrationConnect
              provider="linear"
              label="Linear"
              hasManualToken={typeof data.integrationToken === 'string' && data.integrationToken !== ''}
              manualField={
                <>
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
                </>
              }
            />

            {/* create_issue fields */}
            {(data.integrationOp === 'create_issue' || !data.integrationOp) && (
              <>
                <FormField label="Team" htmlFor="cfg-linear-team">
                  <ResourcePicker
                    provider="linear"
                    kind="team"
                    id="cfg-linear-team"
                    value={typeof data.linearTeamId === 'string' ? data.linearTeamId : ''}
                    onChange={(val) => updateNodeData(nodeId, { linearTeamId: val })}
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
                    value={String(typeof data.linearPriority === 'number' || typeof data.linearPriority === 'string' ? data.linearPriority : 3)}
                    onChange={(val) => updateNodeData(nodeId, { linearPriority: Number(val) })}
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
                <FormField label="Team (optional)" htmlFor="cfg-linear-team-g">
                  <ResourcePicker
                    provider="linear"
                    kind="team"
                    id="cfg-linear-team-g"
                    value={typeof data.linearTeamId === 'string' ? data.linearTeamId : ''}
                    onChange={(val) => updateNodeData(nodeId, { linearTeamId: val })}
                    placeholder="Leave blank for all teams"
                  />
                </FormField>
                <FormField label="Limit" htmlFor="cfg-linear-limit">
                  <input
                    id="cfg-linear-limit"
                    type="number"
                    value={String(typeof data.linearLimit === 'number' || typeof data.linearLimit === 'string' ? data.linearLimit : 25)}
                    onChange={(e) => updateNodeData(nodeId, { linearLimit: Number(e.target.value) })}
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

            {/* get_issue fields */}
            {data.integrationOp === 'get_issue' && (
              <FormField label="Issue ID" htmlFor="cfg-linear-issue-g">
                <input id="cfg-linear-issue-g" type="text"
                  value={typeof data.linearIssueId === 'string' ? data.linearIssueId : ''}
                  onChange={(e) => updateNodeData(nodeId, { linearIssueId: e.target.value })}
                  className={inputClass} placeholder="{{prev-node.output}} or issue ID" />
              </FormField>
            )}

            {/* search_issues fields */}
            {data.integrationOp === 'search_issues' && (
              <>
                <FormField label="Search text" htmlFor="cfg-linear-query">
                  <input id="cfg-linear-query" type="text"
                    value={typeof data.linearQuery === 'string' ? data.linearQuery : ''}
                    onChange={(e) => updateNodeData(nodeId, { linearQuery: e.target.value })}
                    className={inputClass} placeholder="login bug" />
                </FormField>
                <FormField label="Limit" htmlFor="cfg-linear-limit-s">
                  <input id="cfg-linear-limit-s" type="number"
                    value={String(typeof data.linearLimit === 'number' ? data.linearLimit : 10)}
                    onChange={(e) => updateNodeData(nodeId, { linearLimit: Number(e.target.value) })}
                    className={inputClass} placeholder="10" />
                </FormField>
              </>
            )}

            {/* update_issue fields */}
            {data.integrationOp === 'update_issue' && (
              <>
                <FormField label="Issue ID" htmlFor="cfg-linear-issue-u">
                  <input id="cfg-linear-issue-u" type="text"
                    value={typeof data.linearIssueId === 'string' ? data.linearIssueId : ''}
                    onChange={(e) => updateNodeData(nodeId, { linearIssueId: e.target.value })}
                    className={inputClass} placeholder="{{prev-node.output}} or issue ID" />
                </FormField>
                <FormField label="Title (optional)" htmlFor="cfg-linear-title-u">
                  <input id="cfg-linear-title-u" type="text"
                    value={typeof data.linearTitle === 'string' ? data.linearTitle : ''}
                    onChange={(e) => updateNodeData(nodeId, { linearTitle: e.target.value })}
                    className={inputClass} placeholder="Leave blank to keep" />
                </FormField>
                <FormField label="Description (optional)" htmlFor="cfg-linear-desc-u">
                  <textarea id="cfg-linear-desc-u" rows={3}
                    value={typeof data.linearDescription === 'string' ? data.linearDescription : ''}
                    onChange={(e) => updateNodeData(nodeId, { linearDescription: e.target.value })}
                    className={textareaClass} placeholder="{{llm-1.output}}" />
                </FormField>
                <FormField label="Move to project (optional)" htmlFor="cfg-linear-project-u">
                  <ResourcePicker
                    provider="linear" kind="project" id="cfg-linear-project-u"
                    value={typeof data.linearProjectId === 'string' ? data.linearProjectId : ''}
                    onChange={(val) => updateNodeData(nodeId, { linearProjectId: val })}
                    placeholder="Leave blank to keep" />
                </FormField>
              </>
            )}
          </div>
        )}

        {/* GitHub */}
        {nodeType === 'github' && (
          <IntegrationSection
            provider="github" label="GitHub" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            defaultOp="create_issue"
            ops={[
              { value: 'create_issue', label: 'Create Issue' },
              { value: 'list_issues', label: 'List Issues' },
              { value: 'create_comment', label: 'Comment on Issue' },
              { value: 'list_pull_requests', label: 'List Pull Requests' },
              { value: 'get_pull_request', label: 'Get Pull Request' },
            ]}
            tokenPlaceholder="ghp_..."
          >
            <ResourceField label="Repository" provider="github" kind="repo" field="githubRepo" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="owner/name" />
            {data.integrationOp === 'create_issue' && (<>
              <TextField label="Title" field="githubTitle" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{llm-1.output}}" />
              <AreaField label="Body" field="githubBody" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{llm-1.output}}" />
              <TextField label="Labels (comma-separated)" field="githubLabels" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="bug, urgent" />
            </>)}
            {data.integrationOp === 'create_comment' && (<>
              <TextField label="Issue number" field="githubIssueNumber" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="42" />
              <AreaField label="Comment" field="githubBody" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{llm-1.output}}" />
            </>)}
            {(data.integrationOp === 'list_issues' || data.integrationOp === 'list_pull_requests') && (<>
              <SelectField label="State" field="githubState" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback="open"
                options={[{ value: 'open', label: 'Open' }, { value: 'closed', label: 'Closed' }, { value: 'all', label: 'All' }]} />
              <NumField label="Limit" field="githubLimit" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback={10} />
            </>)}
            {data.integrationOp === 'get_pull_request' && (
              <TextField label="PR number" field="githubPrNumber" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="7" />
            )}
          </IntegrationSection>
        )}

        {/* GitLab */}
        {nodeType === 'gitlab' && (
          <IntegrationSection
            provider="gitlab" label="GitLab" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            defaultOp="create_issue"
            ops={[
              { value: 'create_issue', label: 'Create Issue' },
              { value: 'list_issues', label: 'List Issues' },
              { value: 'create_comment', label: 'Comment on Issue' },
              { value: 'list_merge_requests', label: 'List Merge Requests' },
              { value: 'get_merge_request', label: 'Get Merge Request' },
            ]}
            tokenPlaceholder="glpat-..."
          >
            <ResourceField label="Project" provider="gitlab" kind="project" field="gitlabProjectId" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="Project ID" />
            {data.integrationOp === 'create_issue' && (<>
              <TextField label="Title" field="gitlabTitle" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{llm-1.output}}" />
              <AreaField label="Description" field="gitlabDescription" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{llm-1.output}}" />
              <TextField label="Labels (comma-separated)" field="gitlabLabels" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="bug, backend" />
            </>)}
            {data.integrationOp === 'create_comment' && (<>
              <TextField label="Issue IID" field="gitlabIssueIid" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="12" />
              <AreaField label="Comment" field="gitlabDescription" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{llm-1.output}}" />
            </>)}
            {(data.integrationOp === 'list_issues' || data.integrationOp === 'list_merge_requests') && (<>
              <SelectField label="State" field="gitlabState" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback="opened"
                options={[{ value: 'opened', label: 'Opened' }, { value: 'closed', label: 'Closed' }, { value: 'all', label: 'All' }]} />
              <NumField label="Limit" field="gitlabLimit" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback={10} />
            </>)}
            {data.integrationOp === 'get_merge_request' && (
              <TextField label="MR IID" field="gitlabMrIid" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="3" />
            )}
          </IntegrationSection>
        )}

        {/* Gmail */}
        {nodeType === 'gmail' && (
          <IntegrationSection
            provider="gmail" label="Gmail" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            defaultOp="send_email"
            ops={[
              { value: 'send_email', label: 'Send Email' },
              { value: 'create_draft', label: 'Create Draft' },
              { value: 'list_messages', label: 'List Messages' },
              { value: 'get_message', label: 'Get Message' },
            ]}
            tokenPlaceholder=""
            hideManual
          >
            {(data.integrationOp === 'send_email' || data.integrationOp === 'create_draft') && (<>
              <TextField label="To" field="gmailTo" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="team@example.com" />
              <TextField label="Cc (optional)" field="gmailCc" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="" />
              <TextField label="Subject" field="gmailSubject" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{llm-1.output}}" />
              <AreaField label="Body" field="gmailBody" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{llm-1.output}}" />
            </>)}
            {data.integrationOp === 'list_messages' && (<>
              <TextField label="Search query" field="gmailQuery" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="is:unread newer_than:1d" />
              <NumField label="Limit" field="gmailLimit" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback={10} />
            </>)}
            {data.integrationOp === 'get_message' && (
              <TextField label="Message ID" field="gmailMessageId" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{prev-node.output}}" />
            )}
          </IntegrationSection>
        )}

        {/* Stripe */}
        {nodeType === 'stripe' && (
          <IntegrationSection
            provider="stripe" label="Stripe" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            defaultOp="list_customers"
            ops={[
              { value: 'list_customers', label: 'List Customers' },
              { value: 'list_payments', label: 'List Payments' },
              { value: 'list_invoices', label: 'List Invoices' },
              { value: 'get_balance', label: 'Get Balance' },
              { value: 'create_payment_link', label: 'Create Payment Link' },
            ]}
            tokenPlaceholder="sk_..."
          >
            {data.integrationOp === 'list_customers' && (
              <TextField label="Filter by email (optional)" field="stripeCustomerEmail" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="jane@example.com" />
            )}
            {(data.integrationOp === 'list_customers' || data.integrationOp === 'list_payments' || data.integrationOp === 'list_invoices') && (
              <NumField label="Limit" field="stripeLimit" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback={10} />
            )}
            {data.integrationOp === 'create_payment_link' && (<>
              <ResourceField label="Price" provider="stripe" kind="price" field="stripePriceId" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="price_..." />
              <NumField label="Quantity" field="stripeQuantity" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback={1} />
            </>)}
          </IntegrationSection>
        )}

        {/* Shopify */}
        {nodeType === 'shopify' && (
          <IntegrationSection
            provider="shopify" label="Shopify" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            defaultOp="list_orders"
            ops={[
              { value: 'list_orders', label: 'List Orders' },
              { value: 'get_order', label: 'Get Order' },
              { value: 'list_products', label: 'List Products' },
              { value: 'create_product', label: 'Create Product' },
              { value: 'list_customers', label: 'List Customers' },
            ]}
            tokenPlaceholder="shpat_..."
            hideManual
          >
            {data.integrationOp === 'list_orders' && (<>
              <SelectField label="Status" field="shopifyStatus" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback="any"
                options={[{ value: 'any', label: 'Any' }, { value: 'open', label: 'Open' }, { value: 'closed', label: 'Closed' }]} />
              <NumField label="Limit" field="shopifyLimit" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback={10} />
            </>)}
            {(data.integrationOp === 'list_products' || data.integrationOp === 'list_customers') && (
              <NumField label="Limit" field="shopifyLimit" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback={10} />
            )}
            {data.integrationOp === 'get_order' && (
              <TextField label="Order ID" field="shopifyOrderId" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{prev-node.output}}" />
            )}
            {data.integrationOp === 'create_product' && (<>
              <TextField label="Title" field="shopifyTitle" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{llm-1.output}}" />
              <AreaField label="Description" field="shopifyDescription" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{llm-1.output}}" />
              <TextField label="Price" field="shopifyPrice" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="19.99" />
            </>)}
          </IntegrationSection>
        )}

        {/* Google Calendar */}
        {nodeType === 'googlecalendar' && (
          <IntegrationSection
            provider="googlecalendar" label="Google Calendar" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            defaultOp="list_events"
            ops={[
              { value: 'list_events', label: 'List Events' },
              { value: 'create_event', label: 'Create Event' },
              { value: 'delete_event', label: 'Delete Event' },
            ]}
            tokenPlaceholder=""
            hideManual
          >
            <ResourceField label="Calendar" provider="googlecalendar" kind="calendar" field="gcalCalendarId" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="primary" />
            {data.integrationOp === 'list_events' && (
              <NumField label="Limit" field="gcalLimit" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback={10} />
            )}
            {data.integrationOp === 'create_event' && (<>
              <TextField label="Title" field="gcalSummary" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{llm-1.output}}" />
              <AreaField label="Description" field="gcalDescription" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{llm-1.output}}" />
              <TextField label="Start (RFC3339)" field="gcalStart" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="2026-07-20T15:00:00Z" />
              <TextField label="End (RFC3339)" field="gcalEnd" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="2026-07-20T16:00:00Z" />
              <TextField label="Attendees (comma-separated)" field="gcalAttendees" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="a@x.com, b@y.com" />
            </>)}
            {data.integrationOp === 'delete_event' && (
              <TextField label="Event ID" field="gcalEventId" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{prev-node.output}}" />
            )}
          </IntegrationSection>
        )}

        {/* Outlook */}
        {nodeType === 'outlook' && (
          <IntegrationSection
            provider="outlook" label="Outlook" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            defaultOp="send_email"
            ops={[
              { value: 'send_email', label: 'Send Email' },
              { value: 'list_messages', label: 'List Messages' },
              { value: 'get_message', label: 'Get Message' },
              { value: 'create_event', label: 'Create Event' },
            ]}
            tokenPlaceholder=""
            hideManual
          >
            {data.integrationOp === 'send_email' && (<>
              <TextField label="To" field="outlookTo" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="team@example.com" />
              <TextField label="Cc (optional)" field="outlookCc" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="" />
              <TextField label="Subject" field="outlookSubject" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{llm-1.output}}" />
              <AreaField label="Body (HTML)" field="outlookBody" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{llm-1.output}}" />
            </>)}
            {data.integrationOp === 'list_messages' && (<>
              <TextField label="Search query (optional)" field="outlookQuery" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="from:jane subject:invoice" />
              <NumField label="Limit" field="outlookLimit" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback={10} />
            </>)}
            {data.integrationOp === 'get_message' && (
              <TextField label="Message ID" field="outlookMessageId" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{prev-node.output}}" />
            )}
            {data.integrationOp === 'create_event' && (<>
              <TextField label="Title" field="outlookSubject" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{llm-1.output}}" />
              <AreaField label="Body (HTML)" field="outlookBody" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{llm-1.output}}" />
              <TextField label="Start (RFC3339)" field="outlookStart" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="2026-07-20T15:00:00" />
              <TextField label="End (RFC3339)" field="outlookEnd" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="2026-07-20T16:00:00" />
            </>)}
          </IntegrationSection>
        )}

        {/* Slack */}
        {nodeType === 'slack' && (
          <IntegrationSection
            provider="slack" label="Slack" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            defaultOp="send_message"
            ops={[
              { value: 'send_message', label: 'Send Message' },
              { value: 'list_channels', label: 'List Channels' },
              { value: 'get_channel_history', label: 'Channel History' },
            ]}
            tokenPlaceholder=""
            hideManual
          >
            {(data.integrationOp === 'send_message' || data.integrationOp === 'get_channel_history') && (
              <ResourceField label="Channel" provider="slack" kind="channel" field="slackChannel" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="#general or C0123..." />
            )}
            {data.integrationOp === 'send_message' && (
              <AreaField label="Message" field="slackText" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{llm-1.output}}" />
            )}
            {(data.integrationOp === 'list_channels' || data.integrationOp === 'get_channel_history') && (
              <NumField label="Limit" field="slackLimit" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback={data.integrationOp === 'list_channels' ? 100 : 20} />
            )}
          </IntegrationSection>
        )}

        {/* Google Drive */}
        {nodeType === 'googledrive' && (
          <IntegrationSection
            provider="googledrive" label="Google Drive" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            defaultOp="list_files"
            ops={[
              { value: 'list_files', label: 'List Files' },
              { value: 'search', label: 'Search' },
              { value: 'get_file', label: 'Get File' },
              { value: 'create_folder', label: 'Create Folder' },
              { value: 'delete_file', label: 'Delete File' },
            ]}
            tokenPlaceholder=""
            hideManual
          >
            {(data.integrationOp === 'list_files' || data.integrationOp === 'search') && (<>
              <TextField label="Query (optional)" field="gdriveQuery" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="name contains 'report'" />
              <NumField label="Limit" field="gdriveLimit" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback={20} />
            </>)}
            {(data.integrationOp === 'get_file' || data.integrationOp === 'delete_file') && (
              <TextField label="File ID" field="gdriveFileId" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{prev-node.output}}" />
            )}
            {data.integrationOp === 'create_folder' && (<>
              <TextField label="Folder name" field="gdriveName" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{llm-1.output}}" />
              <ResourceField label="Parent folder (optional)" provider="googledrive" kind="folder" field="gdriveParentId" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="root" />
            </>)}
          </IntegrationSection>
        )}

        {/* Google Docs */}
        {nodeType === 'googledocs' && (
          <IntegrationSection
            provider="googledocs" label="Google Docs" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            defaultOp="create_document"
            ops={[
              { value: 'create_document', label: 'Create Document' },
              { value: 'get_document', label: 'Get Document' },
              { value: 'append_text', label: 'Append Text' },
            ]}
            tokenPlaceholder=""
            hideManual
          >
            {data.integrationOp === 'create_document' && (
              <TextField label="Title" field="gdocsTitle" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{llm-1.output}}" />
            )}
            {(data.integrationOp === 'get_document' || data.integrationOp === 'append_text') && (
              <TextField label="Document ID" field="gdocsDocumentId" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{prev-node.output}}" />
            )}
            {data.integrationOp === 'append_text' && (
              <AreaField label="Text to append" field="gdocsText" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{llm-1.output}}" />
            )}
          </IntegrationSection>
        )}

        {/* Google Sheets */}
        {nodeType === 'googlesheets' && (
          <IntegrationSection
            provider="googlesheets" label="Google Sheets" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            defaultOp="read_range"
            ops={[
              { value: 'read_range', label: 'Read Range' },
              { value: 'append_row', label: 'Append Row' },
              { value: 'update_range', label: 'Update Range' },
              { value: 'create_spreadsheet', label: 'Create Spreadsheet' },
            ]}
            tokenPlaceholder=""
            hideManual
          >
            {data.integrationOp !== 'create_spreadsheet' && (
              <TextField label="Spreadsheet ID" field="gsheetsSpreadsheetId" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{prev-node.output}}" />
            )}
            {(data.integrationOp === 'read_range' || data.integrationOp === 'append_row' || data.integrationOp === 'update_range') && (
              <TextField label="Range (A1)" field="gsheetsRange" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="Sheet1!A1:C10" />
            )}
            {(data.integrationOp === 'append_row' || data.integrationOp === 'update_range') && (
              <TextField label="Values (comma-separated)" field="gsheetsValues" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="Jane, jane@x.com, {{llm-1.output}}" />
            )}
            {data.integrationOp === 'create_spreadsheet' && (
              <TextField label="Title" field="gsheetsTitle" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{llm-1.output}}" />
            )}
          </IntegrationSection>
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
                await apiFetch(`${API}/api/workflows/${dbId}/schedule`, { method: 'DELETE' })
                setSchedNextRun(null)
              }}
              className="text-[10px] text-[var(--color-fail)]/60 hover:text-[var(--color-fail)] transition-colors text-left"
            >
              Remove schedule
            </button>
          </div>
        )}
      </div>
      </div>
      )}
    </aside>
  )
}
