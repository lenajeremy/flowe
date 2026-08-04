import { Handle, Position, type NodeProps } from '@xyflow/react'
import { NodeBase2 } from '@/components/ui/NodeBase2'
import { NODE_ACCENT_HEX } from '@/lib/nodeColors'
import { NODE_ICONS } from '@/lib/nodeIcons'
import type { FlowNode } from '@/types/workflow'

const OP_LABELS: Record<string, string> = { list_sites: 'List Sites', list_account_sites: 'List Account Sites', get_site: 'Get Site', create_site: 'Create Site', update_site: 'Update Site', delete_site: 'Delete Site', enable_site: 'Enable Site', disable_site: 'Disable Site', list_deploys: 'List Deploys', get_deploy: 'Get Deploy', create_deploy: 'Create Deploy', cancel_deploy: 'Cancel Deploy', restore_deploy: 'Restore Deploy', rollback_site: 'Rollback Site', lock_deploy: 'Lock Deploy', unlock_deploy: 'Unlock Deploy', delete_deploy: 'Delete Deploy', list_builds: 'List Builds', get_build: 'Get Build', start_build: 'Start Build', get_account_build_status: 'Get Account Build Status', list_env_vars: 'List Env Vars', list_site_env_vars: 'List Site Env Vars', get_env_var: 'Get Env Var', create_env_vars: 'Create Env Vars', update_env_var: 'Update Env Var', set_env_var_value: 'Set Env Var Value', delete_env_var: 'Delete Env Var', delete_env_var_value: 'Delete Env Var Value', list_forms: 'List Forms', delete_form: 'Delete Form', list_site_submissions: 'List Site Submissions', list_form_submissions: 'List Form Submissions', get_submission: 'Get Submission', delete_submission: 'Delete Submission', list_dns_zones: 'List DNS Zones', get_dns_zone: 'Get DNS Zone', create_dns_zone: 'Create DNS Zone', delete_dns_zone: 'Delete DNS Zone', list_dns_records: 'List DNS Records', get_dns_record: 'Get DNS Record', create_dns_record: 'Create DNS Record', delete_dns_record: 'Delete DNS Record', get_site_dns: 'Get Site DNS', configure_site_dns: 'Configure Site DNS', list_build_hooks: 'List Build Hooks', get_build_hook: 'Get Build Hook', create_build_hook: 'Create Build Hook', update_build_hook: 'Update Build Hook', delete_build_hook: 'Delete Build Hook', list_hooks: 'List Hooks', get_hook: 'Get Hook', create_hook: 'Create Hook', update_hook: 'Update Hook', delete_hook: 'Delete Hook', enable_hook: 'Enable Hook', list_hook_types: 'List Hook Types', list_deploy_keys: 'List Deploy Keys', get_deploy_key: 'Get Deploy Key', create_deploy_key: 'Create Deploy Key', delete_deploy_key: 'Delete Deploy Key', get_current_user: 'Get Current User', list_accounts: 'List Accounts', get_account: 'Get Account', list_account_members: 'List Account Members', list_audit_events: 'List Audit Events' }

export function NetlifyNode({ data, selected }: NodeProps<FlowNode>) {
  const op = typeof data.integrationOp === 'string' ? data.integrationOp : 'list_sites'

  return (
    <NodeBase2
      accentHex={NODE_ACCENT_HEX.netlify}
      icon={NODE_ICONS.netlify}
      label={data.label}
      isSelected={selected ?? false}
      executionStatus={data.executionStatus}
    >
      <div className="flex flex-col gap-1 min-w-[160px]">
        <span className="text-[11px] font-medium text-[var(--color-text)]">{OP_LABELS[op] ?? op}</span>
        <span className="text-[10px] text-[var(--color-muted)]">Connect netlify in the sidebar</span>
      </div>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </NodeBase2>
  )
}
