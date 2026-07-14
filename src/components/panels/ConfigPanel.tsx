import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useWorkflowStore } from '@/store/workflowStore'
import { useShallow } from 'zustand/react/shallow'
import { FormField, inputClass, textareaClass } from '@/components/ui/FormField'
import { TemplateField } from '@/components/ui/TemplateField'
import { JsonView } from '@/components/ui/JsonView'
import { JsonEditor } from '@/components/ui/JsonEditor'
import { SliderField } from '@/components/ui/SliderField'
import { Select } from '@/components/ui/Select'
import { NODE_LABELS } from '@/lib/nodeColors'
import { NodeStatusTab, NodeLogsTab } from '@/components/panels/NodeRunTabs'
import {
  NotionConfig, LinearConfig, GithubConfig, GitlabConfig, GmailConfig,
  StripeConfig, ShopifyConfig, GoogleCalendarConfig, OutlookConfig, SlackConfig,
  GoogleDriveConfig, GoogleDocsConfig, GoogleSheetsConfig,
} from '@/components/panels/integrationConfigs'
import type { LLMModel, FlowNode, FlowEdge, FlowNodeData } from '@/types/workflow'
import { API } from '@/lib/config'
import { apiFetch } from '@/lib/http'


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
              className={`relative pb-2 text-[12px] font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-[var(--color-text)]'
                  : 'text-[var(--color-dim)] hover:text-[var(--color-text)]'
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <motion.span
                  layoutId="cfg-tab-underline"
                  className="absolute inset-x-0 bottom-0 h-[2px] rounded-full bg-[var(--color-accent)]"
                  transition={{ type: 'spring', stiffness: 600, damping: 45 }}
                />
              )}
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
          <JsonView
            className="max-h-52 overflow-y-auto px-3 py-2.5 text-[11px] leading-relaxed text-[var(--color-text)]"
            raw={data.executionOutput as string}
          />
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

            <FormField label="System Prompt" htmlFor="cfg-system">
              <TemplateField
                id="cfg-system"
                multiline
                rows={4}
                value={typeof data.systemPrompt === 'string' ? data.systemPrompt : ''}
                onChange={(v) => updateNodeData(nodeId, { systemPrompt: v })}
                placeholder="You are a helpful assistant…"
              />
            </FormField>
            <FormField label="User Prompt" htmlFor="cfg-user">
              <TemplateField
                id="cfg-user"
                multiline
                rows={4}
                value={typeof data.userPrompt === 'string' ? data.userPrompt : ''}
                onChange={(v) => updateNodeData(nodeId, { userPrompt: v })}
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
              <JsonEditor
                value={typeof data.outputSchema === 'string' ? data.outputSchema : ''}
                onChange={(v) => updateNodeData(nodeId, { outputSchema: v })}
                height="110px"
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
              <JsonView
                className="max-h-48 w-full overflow-y-auto rounded border border-[var(--color-border)] bg-[var(--color-surface2)] px-2.5 py-2 text-[11px] leading-relaxed text-[var(--color-text)]"
                raw={data.executionOutput}
              />
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
            <FormField label="Method" htmlFor="cfg-http-method">
              <Select
                id="cfg-http-method"
                value={typeof data.method === 'string' ? data.method : 'GET'}
                onChange={(v) => updateNodeData(nodeId, { method: v as FlowNodeData['method'] })}
                options={HTTP_METHODS}
              />
            </FormField>
            <FormField label="URL" htmlFor="cfg-http-url">
              <TemplateField
                id="cfg-http-url"
                value={typeof data.url === 'string' ? data.url : ''}
                onChange={(v) => updateNodeData(nodeId, { url: v })}
                placeholder="https://api.example.com/endpoint"
              />
              <p className="text-[10px] text-[var(--color-muted)] mt-1">
                Template tokens like <code className="text-[var(--color-accent)]">{'{{nodeId.output}}'}</code> are supported.
              </p>
            </FormField>
            <FormField label="Request Headers (JSON)" htmlFor="cfg-http-headers">
              <TemplateField
                id="cfg-http-headers"
                multiline
                rows={3}
                value={typeof data.requestHeaders === 'string' ? data.requestHeaders : '{}'}
                onChange={(v) => updateNodeData(nodeId, { requestHeaders: v })}
                placeholder={'{"Authorization": "Bearer token", "Content-Type": "application/json"}'}
              />
            </FormField>
            {(data.method === 'POST' || data.method === 'PUT' || data.method === 'PATCH') && (
              <FormField label="Request Body" htmlFor="cfg-http-body">
                <TemplateField
                  id="cfg-http-body"
                  multiline
                  rows={4}
                  value={typeof data.requestBody === 'string' ? data.requestBody : ''}
                  onChange={(v) => updateNodeData(nodeId, { requestBody: v })}
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
            <FormField label="To" htmlFor="cfg-email-to" hint="Separate multiple addresses with commas — each recipient gets their own copy and never sees the others">
              <TemplateField
                id="cfg-email-to"
                value={typeof data.emailTo === 'string' ? data.emailTo : ''}
                onChange={(v) => updateNodeData(nodeId, { emailTo: v })}
                placeholder="recipient@example.com, other@example.com"
              />
            </FormField>
            <FormField label="Subject" htmlFor="cfg-email-subject">
              <TemplateField
                id="cfg-email-subject"
                value={typeof data.emailSubject === 'string' ? data.emailSubject : ''}
                onChange={(v) => updateNodeData(nodeId, { emailSubject: v })}
                placeholder="Email subject…"
              />
            </FormField>
            <FormField label="Body" htmlFor="cfg-email-body">
              <TemplateField
                id="cfg-email-body"
                multiline
                rows={5}
                value={typeof data.emailBody === 'string' ? data.emailBody : ''}
                onChange={(v) => updateNodeData(nodeId, { emailBody: v })}
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
              <TemplateField
                id="cfg-approval-msg"
                multiline
                rows={4}
                value={typeof data.approvalMessage === 'string' ? data.approvalMessage : ''}
                onChange={(v) => updateNodeData(nodeId, { approvalMessage: v })}
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

        {nodeType === 'notion' && <NotionConfig data={data} nodeId={nodeId} updateNodeData={updateNodeData} />}

        {nodeType === 'linear' && <LinearConfig data={data} nodeId={nodeId} updateNodeData={updateNodeData} />}

        {nodeType === 'github' && <GithubConfig data={data} nodeId={nodeId} updateNodeData={updateNodeData} />}

        {nodeType === 'gitlab' && <GitlabConfig data={data} nodeId={nodeId} updateNodeData={updateNodeData} />}

        {nodeType === 'gmail' && <GmailConfig data={data} nodeId={nodeId} updateNodeData={updateNodeData} />}

        {nodeType === 'stripe' && <StripeConfig data={data} nodeId={nodeId} updateNodeData={updateNodeData} />}

        {nodeType === 'shopify' && <ShopifyConfig data={data} nodeId={nodeId} updateNodeData={updateNodeData} />}

        {nodeType === 'googlecalendar' && <GoogleCalendarConfig data={data} nodeId={nodeId} updateNodeData={updateNodeData} />}

        {nodeType === 'outlook' && <OutlookConfig data={data} nodeId={nodeId} updateNodeData={updateNodeData} />}

        {nodeType === 'slack' && <SlackConfig data={data} nodeId={nodeId} updateNodeData={updateNodeData} />}

        {nodeType === 'googledrive' && <GoogleDriveConfig data={data} nodeId={nodeId} updateNodeData={updateNodeData} />}

        {nodeType === 'googledocs' && <GoogleDocsConfig data={data} nodeId={nodeId} updateNodeData={updateNodeData} />}

        {nodeType === 'googlesheets' && <GoogleSheetsConfig data={data} nodeId={nodeId} updateNodeData={updateNodeData} />}

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
