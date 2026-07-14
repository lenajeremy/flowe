import { Handle, Position, type NodeProps } from '@xyflow/react'
import { NodeBase2 } from '@/components/ui/NodeBase2'
import { NODE_ACCENT_HEX } from '@/lib/nodeColors'
import { NODE_ICONS } from '@/lib/nodeIcons'
import type { FlowNode } from '@/types/workflow'

const OP_LABELS: Record<string, string> = { list_files: 'List Files', search: 'Search', get_file: 'Get File Info', read_file: 'Read File', upload_file: 'Upload File', create_folder: 'Create Folder', copy_file: 'Copy File', move_file: 'Move File', rename_file: 'Rename File', share_file: 'Share File', list_permissions: 'List Permissions', trash_file: 'Move to Trash', delete_file: 'Delete Permanently' }

export function GoogleDriveNode({ data, selected }: NodeProps<FlowNode>) {
  const op = typeof data.integrationOp === 'string' ? data.integrationOp : 'list_files'

  return (
    <NodeBase2
      accentHex={NODE_ACCENT_HEX.googledrive}
      icon={NODE_ICONS.googledrive}
      label={data.label}
      isSelected={selected ?? false}
      executionStatus={data.executionStatus}
    >
      <div className="flex flex-col gap-1 min-w-[160px]">
        <span className="text-[11px] font-medium text-[var(--color-text)]">{OP_LABELS[op] ?? op}</span>
        <span className="text-[10px] text-[var(--color-muted)]">Connect Google Drive in the sidebar</span>
      </div>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </NodeBase2>
  )
}
