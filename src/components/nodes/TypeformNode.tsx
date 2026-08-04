import { Handle, Position, type NodeProps } from '@xyflow/react'
import { NodeBase2 } from '@/components/ui/NodeBase2'
import { NODE_ACCENT_HEX } from '@/lib/nodeColors'
import { NODE_ICONS } from '@/lib/nodeIcons'
import type { FlowNode } from '@/types/workflow'

const OP_LABELS: Record<string, string> = { list_responses: 'List Responses', get_response_text: 'Read as Q&A', delete_responses: 'Delete Responses', get_insights: 'Insights', list_forms: 'List Forms', get_form: 'Get Form', create_form: 'Create Form', update_form: 'Replace Form', delete_form: 'Delete Form', get_form_messages: 'Form Messages', list_workspaces: 'List Workspaces', get_workspace: 'Get Workspace', create_workspace: 'Create Workspace', delete_workspace: 'Delete Workspace', list_themes: 'List Themes', get_theme: 'Get Theme', delete_theme: 'Delete Theme', list_images: 'List Images', list_webhooks: 'List Webhooks', create_webhook: 'Create Webhook', delete_webhook: 'Delete Webhook', get_current_user: 'Current User' }

export function TypeformNode({ data, selected }: NodeProps<FlowNode>) {
  const op = typeof data.integrationOp === 'string' ? data.integrationOp : 'list_responses'

  return (
    <NodeBase2
      accentHex={NODE_ACCENT_HEX.typeform}
      icon={NODE_ICONS.typeform}
      label={data.label}
      isSelected={selected ?? false}
      executionStatus={data.executionStatus}
    >
      <div className="flex flex-col gap-1 min-w-[160px]">
        <span className="text-[11px] font-medium text-[var(--color-text)]">{OP_LABELS[op] ?? op}</span>
        <span className="text-[10px] text-[var(--color-muted)]">Connect typeform in the sidebar</span>
      </div>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </NodeBase2>
  )
}
