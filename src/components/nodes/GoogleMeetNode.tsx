import { Handle, Position, type NodeProps } from '@xyflow/react'
import { NodeBase2 } from '@/components/ui/NodeBase2'
import { NODE_ACCENT_HEX } from '@/lib/nodeColors'
import { NODE_ICONS } from '@/lib/nodeIcons'
import type { FlowNode } from '@/types/workflow'

const OP_LABELS: Record<string, string> = { create_space: 'Create Meeting', get_space: 'Get Meeting', update_space: 'Update Meeting', end_active_conference: 'End Conference', list_conference_records: 'List Conferences', get_conference_record: 'Get Conference', list_participants: 'List Participants', list_recordings: 'List Recordings', list_transcripts: 'List Transcripts', get_transcript_text: 'Get Transcript Text', list_transcript_entries: 'Transcript Entries' }

export function GoogleMeetNode({ data, selected }: NodeProps<FlowNode>) {
  const op = typeof data.integrationOp === 'string' ? data.integrationOp : 'create_space'

  return (
    <NodeBase2
      accentHex={NODE_ACCENT_HEX.googlemeet}
      icon={NODE_ICONS.googlemeet}
      label={data.label}
      isSelected={selected ?? false}
      executionStatus={data.executionStatus}
    >
      <div className="flex flex-col gap-1 min-w-[160px]">
        <span className="text-[11px] font-medium text-[var(--color-text)]">{OP_LABELS[op] ?? op}</span>
        <span className="text-[10px] text-[var(--color-muted)]">Connect googlemeet in the sidebar</span>
      </div>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </NodeBase2>
  )
}
