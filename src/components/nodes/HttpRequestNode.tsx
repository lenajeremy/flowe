import { Handle, Position, type NodeProps } from '@xyflow/react'
import { NodeBase } from '@/components/ui/NodeBase'
import { NODE_ACCENT_HEX, NODE_ICON_PATHS } from '@/lib/nodeColors'
import type { FlowNode } from '@/types/workflow'

const METHOD_STYLES: Record<string, { bg: string; text: string }> = {
  GET:    { bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
  POST:   { bg: 'bg-blue-500/20',    text: 'text-blue-400'    },
  PUT:    { bg: 'bg-amber-500/20',   text: 'text-amber-400'   },
  DELETE: { bg: 'bg-red-500/20',     text: 'text-red-400'     },
  PATCH:  { bg: 'bg-purple-500/20',  text: 'text-purple-400'  },
}

export function HttpRequestNode({ data, selected }: NodeProps<FlowNode>) {
  const method = typeof data.method === 'string' ? data.method : 'GET'
  const url = typeof data.url === 'string' ? data.url : ''
  const output = typeof data.executionOutput === 'string' ? data.executionOutput : ''
  const style = METHOD_STYLES[method] ?? METHOD_STYLES.GET

  return (
    <NodeBase
      accentHex={NODE_ACCENT_HEX.httpRequest}
      iconPath={NODE_ICON_PATHS.httpRequest}
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
          <p className="text-[11px] text-emerald-400 line-clamp-2 leading-relaxed mt-0.5">
            {output.slice(0, 80)}{output.length > 80 ? '…' : ''}
          </p>
        )}
      </div>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </NodeBase>
  )
}
