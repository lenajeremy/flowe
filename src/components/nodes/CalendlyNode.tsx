import { Handle, Position, type NodeProps } from '@xyflow/react'
import { NodeBase2 } from '@/components/ui/NodeBase2'
import { NODE_ACCENT_HEX } from '@/lib/nodeColors'
import { NODE_ICONS } from '@/lib/nodeIcons'
import type { FlowNode } from '@/types/workflow'

const OP_LABELS: Record<string, string> = { list_scheduled_events: 'Scheduled Events', get_scheduled_event: 'Get Event', cancel_event: 'Cancel Event', list_event_types: 'Event Types', get_event_type: 'Get Event Type', list_available_times: 'Available Times', create_booking: 'Book a Meeting', create_scheduling_link: 'Single-Use Link', list_invitees: 'List Invitees', get_invitee: 'Get Invitee', mark_no_show: 'Mark No-Show', undo_no_show: 'Undo No-Show', list_availability_schedules: 'Availability', list_busy_times: 'Busy Times', list_memberships: 'List Members', invite_to_organization: 'Invite Member', list_invitations: 'List Invitations', remove_member: 'Remove Member', list_routing_forms: 'Routing Forms', list_routing_form_submissions: 'Form Submissions', list_webhooks: 'List Webhooks', create_webhook: 'Create Webhook', delete_webhook: 'Delete Webhook', delete_invitee_data: 'Delete Invitee Data', get_current_user: 'Current User', get_user: 'Get User' }

export function CalendlyNode({ data, selected }: NodeProps<FlowNode>) {
  const op = typeof data.integrationOp === 'string' ? data.integrationOp : 'list_scheduled_events'

  return (
    <NodeBase2
      accentHex={NODE_ACCENT_HEX.calendly}
      icon={NODE_ICONS.calendly}
      label={data.label}
      isSelected={selected ?? false}
      executionStatus={data.executionStatus}
    >
      <div className="flex flex-col gap-1 min-w-[160px]">
        <span className="text-[11px] font-medium text-[var(--color-text)]">{OP_LABELS[op] ?? op}</span>
        <span className="text-[10px] text-[var(--color-muted)]">Connect calendly in the sidebar</span>
      </div>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </NodeBase2>
  )
}
