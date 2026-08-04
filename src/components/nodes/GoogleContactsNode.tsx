import { Handle, Position, type NodeProps } from '@xyflow/react'
import { NodeBase2 } from '@/components/ui/NodeBase2'
import { NODE_ACCENT_HEX } from '@/lib/nodeColors'
import { NODE_ICONS } from '@/lib/nodeIcons'
import type { FlowNode } from '@/types/workflow'

const OP_LABELS: Record<string, string> = { get_my_profile: 'Get My Profile', list_contacts: 'List Contacts', get_contact: 'Get Contact', search_contacts: 'Search Contacts', list_other_contacts: 'List Other Contacts', search_other_contacts: 'Search Other Contacts', create_contact: 'Create Contact', update_contact: 'Update Contact', delete_contact: 'Delete Contact', batch_delete_contacts: 'Batch Delete Contacts', copy_other_contact: 'Copy Other Contact', list_contact_groups: 'List Contact Groups', get_contact_group: 'Get Contact Group', create_contact_group: 'Create Contact Group', update_contact_group: 'Update Contact Group', delete_contact_group: 'Delete Contact Group', modify_group_members: 'Modify Group Members' }

export function GoogleContactsNode({ data, selected }: NodeProps<FlowNode>) {
  const op = typeof data.integrationOp === 'string' ? data.integrationOp : 'list_contacts'

  return (
    <NodeBase2
      accentHex={NODE_ACCENT_HEX.googlecontacts}
      icon={NODE_ICONS.googlecontacts}
      label={data.label}
      isSelected={selected ?? false}
      executionStatus={data.executionStatus}
    >
      <div className="flex flex-col gap-1 min-w-[160px]">
        <span className="text-[11px] font-medium text-[var(--color-text)]">{OP_LABELS[op] ?? op}</span>
        <span className="text-[10px] text-[var(--color-muted)]">Connect googlecontacts in the sidebar</span>
      </div>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </NodeBase2>
  )
}
