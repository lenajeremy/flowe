import { useRef, useState } from 'react'
import { useWorkflowStore } from '@/store/workflowStore'
import { useShallow } from 'zustand/react/shallow'
import { FormField, inputClass, textareaClass } from '@/components/ui/FormField'
import { SliderField } from '@/components/ui/SliderField'
import { Select } from '@/components/ui/Select'
import { NODE_LABELS, NODE_ACCENT_COLORS, NODE_ACCENT_HEX } from '@/lib/nodeColors'
import type { LLMModel, FlowNode, FlowEdge } from '@/types/workflow'

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
  const { nodes, edges, selectedNodeId, updateNodeData } = useWorkflowStore(
    useShallow((s) => ({
      nodes: s.nodes,
      edges: s.edges,
      selectedNodeId: s.selectedNodeId,
      updateNodeData: s.updateNodeData,
    })),
  )

  // Refs to textareas so we can insert at cursor position
  const systemRef = useRef<HTMLTextAreaElement>(null)
  const userRef   = useRef<HTMLTextAreaElement>(null)

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) ?? null

  if (!selectedNode) {
    return (
      <aside className="w-full h-full flex flex-col items-center justify-center bg-[var(--color-surface)] border-l border-[var(--color-border)]">
        <div className="text-center px-6">
          <div className="w-10 h-10 rounded-full border-2 border-dashed border-[var(--color-border2)] flex items-center justify-center mx-auto mb-3">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="5.5" stroke="var(--color-muted)" strokeWidth="1.2"/>
              <path d="M8 5v3l2 2" stroke="var(--color-muted)" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
          </div>
          <p className="text-xs text-[var(--color-muted)]">Select a node to configure it</p>
        </div>
      </aside>
    )
  }

  const { data, id: nodeId } = selectedNode
  const nodeType = data.nodeType
  const upstreamNodes = getUpstreamNodes(nodeId, nodes, edges)

  /** Insert token at the cursor position of whichever textarea is currently focused,
   *  falling back to user prompt if neither is focused. */
  function insertToken(token: string) {
    // Prefer whichever textarea is active
    const activeEl = document.activeElement
    const targetRef =
      activeEl === systemRef.current ? systemRef :
      activeEl === userRef.current   ? userRef   :
      userRef  // default to user prompt

    const el = targetRef.current
    if (!el) return

    const start = el.selectionStart ?? el.value.length
    const end   = el.selectionEnd   ?? el.value.length
    const newValue = el.value.slice(0, start) + token + el.value.slice(end)

    const field = el === systemRef.current ? 'systemPrompt' : 'userPrompt'
    updateNodeData(nodeId, { [field]: newValue })

    // Restore cursor after React re-render
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(start + token.length, start + token.length)
    })
  }

  const hasOutput = typeof data.executionOutput === 'string' && data.executionOutput.length > 0
  const isCompleted = data.executionStatus === 'completed'

  return (
    <aside className="w-full h-full flex flex-col bg-[var(--color-surface)] border-l border-[var(--color-border)] overflow-y-auto">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center gap-2 flex-shrink-0">
        <div
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: NODE_ACCENT_COLORS[nodeType] }}
        />
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-[var(--color-muted)] uppercase tracking-wider leading-none mb-0.5">
            {NODE_LABELS[nodeType]}
          </p>
          <p className="text-xs font-medium text-[var(--color-text)]">Node Config</p>
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
      </div>
    </aside>
  )
}
