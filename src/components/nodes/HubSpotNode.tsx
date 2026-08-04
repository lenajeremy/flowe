import { Handle, Position, type NodeProps } from '@xyflow/react'
import { NodeBase2 } from '@/components/ui/NodeBase2'
import { NODE_ACCENT_HEX } from '@/lib/nodeColors'
import { NODE_ICONS } from '@/lib/nodeIcons'
import type { FlowNode } from '@/types/workflow'

const OP_LABELS: Record<string, string> = { list_objects: 'List Objects', get_object: 'Get Object', search_objects: 'Search Objects', create_object: 'Create Object', update_object: 'Update Object', delete_object: 'Delete Object', batch_create_objects: 'Batch Create Objects', list_associations: 'List Associations', associate_objects: 'Associate Objects', disassociate_objects: 'Disassociate Objects', list_properties: 'List Properties', get_property: 'Get Property', create_property: 'Create Property', list_pipelines: 'List Pipelines', list_owners: 'List Owners', search_lists: 'Search Lists', get_list: 'Get List', list_memberships: 'List Memberships', add_to_list: 'Add To List', batch_update_objects: 'Batch Update Objects', batch_read_objects: 'Batch Read Objects', batch_archive_objects: 'Batch Archive Objects', remove_from_list: 'Remove From List' }

export function HubSpotNode({ data, selected }: NodeProps<FlowNode>) {
  const op = typeof data.integrationOp === 'string' ? data.integrationOp : 'search_objects'

  return (
    <NodeBase2
      accentHex={NODE_ACCENT_HEX.hubspot}
      icon={NODE_ICONS.hubspot}
      label={data.label}
      isSelected={selected ?? false}
      executionStatus={data.executionStatus}
    >
      <div className="flex flex-col gap-1 min-w-[160px]">
        <span className="text-[11px] font-medium text-[var(--color-text)]">{OP_LABELS[op] ?? op}</span>
        <span className="text-[10px] text-[var(--color-muted)]">Connect hubspot in the sidebar</span>
      </div>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </NodeBase2>
  )
}
