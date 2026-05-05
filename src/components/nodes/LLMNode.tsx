import { Handle, Position, type NodeProps } from '@xyflow/react'
import { NodeBase } from '@/components/ui/NodeBase'
import { NODE_ACCENT_HEX, NODE_ICON_PATHS } from '@/lib/nodeColors'
import type { FlowNode } from '@/types/workflow'

export function LLMNode({ data, selected }: NodeProps<FlowNode>) {
  const model = typeof data.model === 'string' ? data.model : 'gpt-4o'
  const temperature = typeof data.temperature === 'number' ? data.temperature : 0.7
  const maxTokens = typeof data.maxTokens === 'number' ? data.maxTokens : 1024
  const userPrompt = typeof data.userPrompt === 'string' ? data.userPrompt : ''
  const output = typeof data.executionOutput === 'string' ? data.executionOutput : ''

  return (
    <NodeBase
      accentHex={NODE_ACCENT_HEX.llm}
      iconPath={NODE_ICON_PATHS.llm}
      label={data.label}
      isSelected={selected ?? false}
      executionStatus={data.executionStatus}
    >
      <div className="flex flex-col gap-1.5">
        <span className="inline-flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/20 font-medium">
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
          <p className="text-[11px] text-emerald-400 line-clamp-2 leading-relaxed mt-0.5">
            {output.slice(0, 100)}…
          </p>
        )}
      </div>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </NodeBase>
  )
}
