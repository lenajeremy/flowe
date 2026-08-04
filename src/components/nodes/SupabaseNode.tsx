import { Handle, Position, type NodeProps } from '@xyflow/react'
import { NodeBase2 } from '@/components/ui/NodeBase2'
import { NODE_ACCENT_HEX } from '@/lib/nodeColors'
import { NODE_ICONS } from '@/lib/nodeIcons'
import type { FlowNode } from '@/types/workflow'

const OP_LABELS: Record<string, string> = { list_projects: 'List Projects', get_project: 'Get Project', get_project_health: 'Get Project Health', list_regions: 'List Regions', create_project: 'Create Project', delete_project: 'Delete Project', pause_project: 'Pause Project', restore_project: 'Restore Project', restart_project: 'Restart Project', list_api_keys: 'List API Keys', create_api_key: 'Create API Key', delete_api_key: 'Delete API Key', list_organizations: 'List Organizations', get_organization: 'Get Organization', list_organization_projects: 'List Organization Projects', list_organization_members: 'List Organization Members', run_sql_read_only: 'Run SQL Read Only', run_sql: 'Run SQL', get_database_metadata: 'Get Database Metadata', list_migrations: 'List Migrations', apply_migration: 'Apply Migration', rollback_migrations: 'Rollback Migrations', list_backups: 'List Backups', restore_pitr: 'Restore PITR', list_functions: 'List Functions', get_function: 'Get Function', get_function_body: 'Get Function Body', create_function: 'Create Function', update_function: 'Update Function', deploy_function: 'Deploy Function', delete_function: 'Delete Function', list_secrets: 'List Secrets', create_secrets: 'Create Secrets', delete_secrets: 'Delete Secrets', get_auth_config: 'Get Auth Config', update_auth_config: 'Update Auth Config', list_storage_buckets: 'List Storage Buckets', list_branches: 'List Branches', get_branch: 'Get Branch', create_branch: 'Create Branch', delete_branch: 'Delete Branch', merge_branch: 'Merge Branch', reset_branch: 'Reset Branch', get_custom_hostname: 'Get Custom Hostname', set_custom_hostname: 'Set Custom Hostname', verify_custom_hostname: 'Verify Custom Hostname', activate_custom_hostname: 'Activate Custom Hostname', delete_custom_hostname: 'Delete Custom Hostname', get_network_restrictions: 'Get Network Restrictions', apply_network_restrictions: 'Apply Network Restrictions', list_network_bans: 'List Network Bans', delete_network_bans: 'Delete Network Bans', get_postgrest_config: 'Get PostgREST Config', update_postgrest_config: 'Update PostgREST Config', generate_types: 'Generate Types', list_snippets: 'List Snippets', get_snippet: 'Get Snippet' }

export function SupabaseNode({ data, selected }: NodeProps<FlowNode>) {
  const op = typeof data.integrationOp === 'string' ? data.integrationOp : 'list_projects'

  return (
    <NodeBase2
      accentHex={NODE_ACCENT_HEX.supabase}
      icon={NODE_ICONS.supabase}
      label={data.label}
      isSelected={selected ?? false}
      executionStatus={data.executionStatus}
    >
      <div className="flex flex-col gap-1 min-w-[160px]">
        <span className="text-[11px] font-medium text-[var(--color-text)]">{OP_LABELS[op] ?? op}</span>
        <span className="text-[10px] text-[var(--color-muted)]">Connect supabase in the sidebar</span>
      </div>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </NodeBase2>
  )
}
