import { Handle, Position, type NodeProps } from '@xyflow/react'
import { NodeBase2 } from '@/components/ui/NodeBase2'
import { NODE_ACCENT_HEX } from '@/lib/nodeColors'
import { NODE_ICONS } from '@/lib/nodeIcons'
import type { FlowNode } from '@/types/workflow'

export function LLMNode({ data, selected }: NodeProps<FlowNode>) {
  const model = typeof data.model === 'string' ? data.model : 'gpt-4o'
  const temperature = typeof data.temperature === 'number' ? data.temperature : 0.7
  const maxTokens = typeof data.maxTokens === 'number' ? data.maxTokens : 1024
  const userPrompt = typeof data.userPrompt === 'string' ? data.userPrompt : ''
  const output = typeof data.executionOutput === 'string' ? data.executionOutput : ''

  return (
    <NodeBase2
      accentHex={NODE_ACCENT_HEX.llm}
      icon={NODE_ICONS.llm}
      label={data.label}
      isSelected={selected ?? false}
      executionStatus={data.executionStatus}
    >
      <div className="flex flex-col gap-1.5">
        <span className="inline-flex items-center gap-1.5 flex-wrap">
          <span className="micro rounded-md border border-[var(--color-border2)] bg-[var(--color-surface2)] px-1.5 py-0.5 text-[var(--color-muted)]">
            {model}
          </span>
          <span className="text-[10px] text-[var(--color-muted)]">
            T:{temperature} · {maxTokens}tk
          </span>
        </span>
        {userPrompt && (
          <p className="text-[11px] text-[var(--color-muted)] line-clamp-2 leading-relaxed font-[var(--font-mono)]">
            {userPrompt.slice(0, 80)}{userPrompt.length > 80 ? '…' : ''}
          </p>
        )}
        {output && (
          <p className="mt-0.5 line-clamp-2 font-[var(--font-mono)] text-[11px] leading-relaxed text-[var(--color-ok)]">
            {output.slice(0, 100)}…
          </p>
        )}
      </div>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </NodeBase2>
  )
}
