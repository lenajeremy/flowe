import { useRef, useState } from 'react'
import { useWorkflowStore } from '@/store/workflowStore'
import { useShallow } from 'zustand/react/shallow'
import { FormField, inputClass, textareaClass } from '@/components/ui/FormField'
import { SliderField } from '@/components/ui/SliderField'
import { Select } from '@/components/ui/Select'
import { NODE_LABELS, NODE_ACCENT_COLORS, NODE_ACCENT_HEX } from '@/lib/nodeColors'
import type { LLMModel, FlowNode, FlowEdge, FlowNodeData } from '@/types/workflow'

const HTTP_METHODS: Array<{ value: string; label: string }> = [
  { value: 'GET',    label: 'GET'    },
  { value: 'POST',   label: 'POST'   },
  { value: 'PUT',    label: 'PUT'    },
  { value: 'DELETE', label: 'DELETE' },
  { value: 'PATCH',  label: 'PATCH'  },
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

// ── Main panel ───────────────────────────────────────────────
export function ConfigPanel() {
  const { nodes, edges, selectedNodeId, updateNodeData, executionState, executionLog } = useWorkflowStore(
    useShallow((s) => ({
      nodes: s.nodes,
      edges: s.edges,
      selectedNodeId: s.selectedNodeId,
      updateNodeData: s.updateNodeData,
      executionState: s.executionState,
      executionLog: s.executionLog,
    })),
  )

  // Refs to textareas so we can insert at cursor position
  const systemRef = useRef<HTMLTextAreaElement>(null)
  const userRef   = useRef<HTMLTextAreaElement>(null)

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) ?? null

  if (!selectedNode) {
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

  /** Insert token at the cursor position of whichever textarea/input is currently focused,
   *  falling back to user prompt (LLM) if neither is focused. */
  function insertToken(token: string) {
    const activeEl = document.activeElement

    // If a generic textarea/input is focused (httpRequest, emailSend, etc.), insert there
    if (
      activeEl instanceof HTMLTextAreaElement ||
      activeEl instanceof HTMLInputElement
    ) {
      // Avoid inserting into the label field
      if (activeEl.id !== 'cfg-label') {
        const start = activeEl.selectionStart ?? activeEl.value.length
        const end   = activeEl.selectionEnd   ?? activeEl.value.length
        const newValue = activeEl.value.slice(0, start) + token + activeEl.value.slice(end)
        activeEl.value = newValue
        // Derive field name from the element's id mapping
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
          updateNodeData(nodeId, { [field]: newValue })
          requestAnimationFrame(() => {
            activeEl.focus()
            activeEl.setSelectionRange(start + token.length, start + token.length)
          })
          return
        }
      }
    }

    // Default: LLM user prompt
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
          <FormField label="Image URL" htmlFor="cfg-imageurl">
            <input
              id="cfg-imageurl"
              type="url"
              value={typeof data.imageUrl === 'string' ? data.imageUrl : ''}
              onChange={(e) => updateNodeData(nodeId, { imageUrl: e.target.value })}
              className={inputClass}
              placeholder="https://…"
            />
          </FormField>
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
                className={textareaClass}
                placeholder="Please review and approve or reject this step."
              />
              <p className="text-[10px] text-[var(--color-muted)] mt-1 leading-relaxed">
                This message is shown to the reviewer. Downstream nodes receive{' '}
                <code className="text-emerald-400">approved</code> or{' '}
                <code className="text-red-400">rejected</code>.
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
      </div>
    </aside>
  )
}
