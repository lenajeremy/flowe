import { Handle, Position, type NodeProps } from '@xyflow/react'
import { NodeBase2 } from '@/components/ui/NodeBase2'
import { NODE_ACCENT_HEX } from '@/lib/nodeColors'
import { NODE_ICONS } from '@/lib/nodeIcons'
import type { FlowNode } from '@/types/workflow'

const OP_LABELS: Record<string, string> = { list_folder: 'List Folder', list_folder_continue: 'Next Page', search: 'Search', get_metadata: 'Get Metadata', download: 'Read File', upload: 'Write File', get_temporary_link: 'Temporary Link', create_folder: 'Create Folder', move: 'Move', copy: 'Copy', delete: 'Delete', list_revisions: 'List Revisions', restore: 'Restore Revision', create_shared_link: 'Create Shared Link', list_shared_links: 'List Shared Links', revoke_shared_link: 'Revoke Link', add_file_member: 'Share File', list_file_members: 'File Members', share_folder: 'Share Folder', list_file_requests: 'File Requests', create_file_request: 'Create File Request', get_current_account: 'Account Info', get_space_usage: 'Space Usage' }

export function DropboxNode({ data, selected }: NodeProps<FlowNode>) {
  const op = typeof data.integrationOp === 'string' ? data.integrationOp : 'list_folder'

  return (
    <NodeBase2
      accentHex={NODE_ACCENT_HEX.dropbox}
      icon={NODE_ICONS.dropbox}
      label={data.label}
      isSelected={selected ?? false}
      executionStatus={data.executionStatus}
    >
      <div className="flex flex-col gap-1 min-w-[160px]">
        <span className="text-[11px] font-medium text-[var(--color-text)]">{OP_LABELS[op] ?? op}</span>
        <span className="text-[10px] text-[var(--color-muted)]">Connect dropbox in the sidebar</span>
      </div>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </NodeBase2>
  )
}
