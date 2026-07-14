import { Handle, Position, type NodeProps } from '@xyflow/react'
import { NodeBase2 } from '@/components/ui/NodeBase2'
import { NODE_ACCENT_HEX } from '@/lib/nodeColors'
import { NODE_ICONS } from '@/lib/nodeIcons'
import type { FlowNode } from '@/types/workflow'

const OP_LABELS: Record<string, string> = { list_events: 'List Events', get_event: 'Get Event', create_event: 'Create Event', update_event: 'Update Event', delete_event: 'Delete Event', quick_add: 'Quick Add', respond_to_event: 'Respond to Invitation', find_free_time: 'Find Free Time', list_calendars: 'List Calendars' }

export function GoogleCalendarNode({ data, selected }: NodeProps<FlowNode>) {
  const op = typeof data.integrationOp === 'string' ? data.integrationOp : 'list_events'

  return (
    <NodeBase2
      accentHex={NODE_ACCENT_HEX.googlecalendar}
      icon={NODE_ICONS.googlecalendar}
      label={data.label}
      isSelected={selected ?? false}
      executionStatus={data.executionStatus}
    >
      <div className="flex flex-col gap-1 min-w-[160px]">
        <span className="text-[11px] font-medium text-[var(--color-text)]">{OP_LABELS[op] ?? op}</span>
        <span className="text-[10px] text-[var(--color-muted)]">Connect Google Calendar in the sidebar</span>
      </div>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </NodeBase2>
  )
}
