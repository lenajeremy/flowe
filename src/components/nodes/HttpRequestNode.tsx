import { Handle, Position, type NodeProps } from '@xyflow/react'
import { NodeBase2 } from '@/components/ui/NodeBase2'
import { NODE_ACCENT_HEX } from '@/lib/nodeColors'
import { NODE_ICONS } from '@/lib/nodeIcons'
import type { FlowNode } from '@/types/workflow'

const METHOD_STYLES: Record<string, { bg: string; text: string }> = {
  GET:    { bg: 'bg-[var(--color-ok)]/15',    text: 'text-[var(--color-ok)]'   },
  POST:   { bg: 'bg-[#51b4fb]/15',            text: 'text-[#51b4fb]'           },
  PUT:    { bg: 'bg-[var(--color-hold)]/15',  text: 'text-[var(--color-hold)]' },
  DELETE: { bg: 'bg-[var(--color-fail)]/15',  text: 'text-[var(--color-fail)]' },
  PATCH:  { bg: 'bg-[#e45fff]/15',            text: 'text-[#e45fff]'           },
}

export function HttpRequestNode({ data, selected }: NodeProps<FlowNode>) {
  const method = typeof data.method === 'string' ? data.method : 'GET'
  const url = typeof data.url === 'string' ? data.url : ''
  const output = typeof data.executionOutput === 'string' ? data.executionOutput : ''
  const style = METHOD_STYLES[method] ?? METHOD_STYLES.GET

  return (
    <NodeBase2
      accentHex={NODE_ACCENT_HEX.httpRequest}
      icon={NODE_ICONS.httpRequest}
      label={data.label}
      isSelected={selected ?? false}
      executionStatus={data.executionStatus}
    >
      <div className="flex flex-col gap-1.5">
        <span className="inline-flex items-center gap-1.5 flex-wrap">
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold border border-transparent ${style.bg} ${style.text}`}>
            {method}
          </span>
          {url && (
            <span className="text-[10px] text-[var(--color-muted)] font-[var(--font-mono)] truncate max-w-[150px]">
              {url.replace(/^https?:\/\//, '')}
            </span>
          )}
          {!url && (
            <span className="text-[10px] text-[var(--color-muted)] italic">No URL set</span>
          )}
        </span>
        {output && (
          <p className="mt-0.5 line-clamp-2 font-[var(--font-mono)] text-[11px] leading-relaxed text-[var(--color-ok)]">
            {output.slice(0, 80)}{output.length > 80 ? '…' : ''}
          </p>
        )}
      </div>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </NodeBase2>
  )
}
