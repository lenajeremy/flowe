import { Handle, Position, type NodeProps } from '@xyflow/react'
import { NodeBase2 } from '@/components/ui/NodeBase2'
import { NODE_ACCENT_HEX } from '@/lib/nodeColors'
import { NODE_ICONS } from '@/lib/nodeIcons'
import type { FlowNode } from '@/types/workflow'

const OP_LABELS: Record<string, string> = { list_deployments: 'List Deployments', get_deployment: 'Get Deployment', get_deployment_events: 'Get Build Logs', get_runtime_logs: 'Get Runtime Logs', redeploy: 'Redeploy', cancel_deployment: 'Cancel Deployment', delete_deployment: 'Delete Deployment', list_deployment_aliases: 'List Deployment Aliases', assign_alias: 'Assign Alias', list_projects: 'List Projects', get_project: 'Get Project', update_project: 'Update Project', promote_deployment: 'Promote to Production', rollback_deployment: 'Roll Back Production', list_env_vars: 'List Env Vars', get_env_var_value: 'Get Env Var Value', create_env_var: 'Create Env Var', update_env_var: 'Update Env Var', delete_env_var: 'Delete Env Var', list_domains: 'List Domains', get_domain: 'Get Domain', list_project_domains: 'List Project Domains', add_project_domain: 'Add Project Domain', verify_project_domain: 'Verify Project Domain', remove_project_domain: 'Remove Project Domain', list_teams: 'List Teams', get_current_user: 'Get Current User' }

export function VercelNode({ data, selected }: NodeProps<FlowNode>) {
  const op = typeof data.integrationOp === 'string' ? data.integrationOp : 'list_deployments'
  // The project is what a reader is actually looking for on a canvas of these,
  // and it is the field most often templated from an earlier node.
  const scope = typeof data.vercelProjectId === 'string' ? data.vercelProjectId : ''

  return (
    <NodeBase2
      accentHex={NODE_ACCENT_HEX.vercel}
      icon={NODE_ICONS.vercel}
      label={data.label}
      isSelected={selected ?? false}
      executionStatus={data.executionStatus}
    >
      <div className="flex flex-col gap-1 min-w-[160px]">
        <span className="text-[11px] font-medium text-[var(--color-text)]">{OP_LABELS[op] ?? op}</span>
        <span className="truncate text-[10px] text-[var(--color-muted)]">
          {scope || 'Connect vercel in the sidebar'}
        </span>
      </div>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </NodeBase2>
  )
}
