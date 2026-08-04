import { Handle, Position, type NodeProps } from '@xyflow/react'
import { NodeBase2 } from '@/components/ui/NodeBase2'
import { NODE_ACCENT_HEX } from '@/lib/nodeColors'
import { NODE_ICONS } from '@/lib/nodeIcons'
import type { FlowNode } from '@/types/workflow'

const OP_LABELS: Record<string, string> = { list_sites: 'List Sites', get_site: 'Get Site', add_site: 'Add Site', delete_site: 'Delete Site', list_sitemaps: 'List Sitemaps', get_sitemap: 'Get Sitemap', submit_sitemap: 'Submit Sitemap', delete_sitemap: 'Delete Sitemap', query_search_analytics: 'Query Search Analytics', inspect_url: 'Inspect URL' }

export function GoogleSearchConsoleNode({ data, selected }: NodeProps<FlowNode>) {
  const op = typeof data.integrationOp === 'string' ? data.integrationOp : 'query_search_analytics'

  return (
    <NodeBase2
      accentHex={NODE_ACCENT_HEX.googlesearchconsole}
      icon={NODE_ICONS.googlesearchconsole}
      label={data.label}
      isSelected={selected ?? false}
      executionStatus={data.executionStatus}
    >
      <div className="flex flex-col gap-1 min-w-[160px]">
        <span className="text-[11px] font-medium text-[var(--color-text)]">{OP_LABELS[op] ?? op}</span>
        <span className="text-[10px] text-[var(--color-muted)]">Connect googlesearchconsole in the sidebar</span>
      </div>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </NodeBase2>
  )
}
