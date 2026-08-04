import { Handle, Position, type NodeProps } from '@xyflow/react'
import { NodeBase2 } from '@/components/ui/NodeBase2'
import { NODE_ACCENT_HEX } from '@/lib/nodeColors'
import { NODE_ICONS } from '@/lib/nodeIcons'
import type { FlowNode } from '@/types/workflow'

const OP_LABELS: Record<string, string> = { list_spaces: 'List Spaces', get_space: 'Get Space', list_pages: 'List Pages', get_page: 'Get Page', find_page_by_title: 'Find Page by Title', list_child_pages: 'List Child Pages', create_page: 'Create Page', update_page: 'Update Page', delete_page: 'Delete Page', search_pages: 'Search (CQL)', list_blog_posts: 'List Blog Posts', create_blog_post: 'Create Blog Post', add_comment: 'Add Comment', list_comments: 'List Comments', list_labels: 'List Labels', add_label: 'Add Label', list_attachments: 'List Attachments', upload_attachment: 'Upload Attachment', get_current_user: 'Current User' }

export function ConfluenceNode({ data, selected }: NodeProps<FlowNode>) {
  const op = typeof data.integrationOp === 'string' ? data.integrationOp : 'list_pages'

  return (
    <NodeBase2
      accentHex={NODE_ACCENT_HEX.confluence}
      icon={NODE_ICONS.confluence}
      label={data.label}
      isSelected={selected ?? false}
      executionStatus={data.executionStatus}
    >
      <div className="flex flex-col gap-1 min-w-[160px]">
        <span className="text-[11px] font-medium text-[var(--color-text)]">{OP_LABELS[op] ?? op}</span>
        <span className="text-[10px] text-[var(--color-muted)]">Connect confluence in the sidebar</span>
      </div>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </NodeBase2>
  )
}
