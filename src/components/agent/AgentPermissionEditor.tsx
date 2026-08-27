import { Check, LockKeyhole } from 'lucide-react'
import { IntegrationLogo } from '@/components/IntegrationLogo'
import { cloneAgentCapabilityPolicy, type AgentCapabilityPolicy, type AgentIntegrationCapability, type AgentIntegrationGrant } from '@/lib/agentDeployments'
import { cn } from '@/lib/utils'
import type { NodeType } from '@/types/workflow'

interface Props {
  capabilities: AgentIntegrationCapability[]
  policy: AgentCapabilityPolicy
  onChange: (policy: AgentCapabilityPolicy) => void
  readOnly?: boolean
  className?: string
}

export function AgentPermissionEditor({ capabilities, policy, onChange, readOnly = false, className }: Props) {
  const replaceGrant = (grant: AgentIntegrationGrant | null, nodeType: string) => {
    const next = cloneAgentCapabilityPolicy(policy)
    next.integrations = next.integrations.filter((item) => item.nodeType !== nodeType)
    if (grant && grant.allowedOperations.length > 0 && grant.nodeIds.length > 0) next.integrations.push(grant)
    next.integrations.sort((left, right) => left.nodeType.localeCompare(right.nodeType))
    onChange(next)
  }
  if (capabilities.length === 0) return <p className="rounded-xl border border-dashed border-[var(--color-border)] px-4 py-8 text-center text-[11px] text-[var(--color-muted)]">No callable integrations are available in this workflow.</p>
  return (
    <div className={cn('space-y-3', className)}>
      {capabilities.map((capability) => {
        const grant = policy.integrations.find((item) => item.nodeType === capability.nodeType)
        const enabled = Boolean(grant?.allowedOperations.length && grant.nodeIds.length)
        return (
          <section key={capability.nodeType} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-canvas)] p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-1.5"><IntegrationLogo type={capability.nodeType as NodeType} size={20} /></span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <div><p className="text-[12.5px] font-semibold">{capability.label}</p><p className="mt-0.5 text-[10px] text-[var(--color-subtle)]">{capability.resources.length} configured {capability.resources.length === 1 ? 'resource' : 'resources'}</p></div>
                  <span className={cn('rounded-full px-2 py-0.5 text-[9.5px] font-medium', enabled ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]' : 'bg-[var(--color-hover)] text-[var(--color-subtle)]')}>{enabled ? 'Allowed' : 'Not allowed'}</span>
                </div>
                <div className="mt-3">
                  <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--color-subtle)]">Abilities</p>
                  <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                    {capability.operations.map((operation) => {
                      const checked = grant?.allowedOperations.includes(operation.id) ?? false
                      const write = operation.effect !== 'read'
                      return <button key={operation.id} type="button" disabled={readOnly} onClick={() => {
                        const current = grant ?? { nodeType: capability.nodeType, nodeIds: capability.resources.map((resource) => resource.nodeId), allowedOperations: [], allowedOverrideFields: [] }
                        replaceGrant({ ...current, allowedOperations: checked ? current.allowedOperations.filter((id) => id !== operation.id) : [...current.allowedOperations, operation.id] }, capability.nodeType)
                      }} className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-left hover:bg-[var(--color-hover)] disabled:cursor-default">
                        <PermissionCheck checked={checked} /><span className="min-w-0 flex-1 truncate text-[11.5px]">{operation.label}</span>
                        <span className={cn('rounded px-1.5 py-0.5 text-[8.5px] font-medium uppercase tracking-wide', write ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300' : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300')}>{write ? 'Approval' : 'Read'}</span>
                      </button>
                    })}
                  </div>
                </div>
                {capability.resources.length > 1 && grant && <div className="mt-4 border-t border-[var(--color-border)] pt-3">
                  <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--color-subtle)]">Allowed resources</p>
                  <p className="mt-1 text-[10px] leading-4 text-[var(--color-muted)]">Choose which configured {capability.label} resources can back these abilities.</p>
                  <div className="mt-2 space-y-1.5">{capability.resources.map((resource) => {
                    const checked = grant.nodeIds.includes(resource.nodeId)
                    return <button key={resource.nodeId} type="button" disabled={readOnly} onClick={() => replaceGrant({ ...grant, nodeIds: checked ? grant.nodeIds.filter((id) => id !== resource.nodeId) : [...grant.nodeIds, resource.nodeId] }, capability.nodeType)} className="flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left hover:bg-[var(--color-hover)] disabled:cursor-default">
                      <PermissionCheck checked={checked} /><span className="min-w-0 flex-1"><span className="block truncate text-[11px] font-medium">{resource.label}</span>{resource.pinnedSettings && <span className="mt-0.5 block truncate font-mono text-[9px] text-[var(--color-subtle)]">{resource.pinnedSettings}</span>}</span>
                    </button>
                  })}</div>
                </div>}
                <div className="mt-4 border-t border-[var(--color-border)] pt-3">
                  <div className="flex items-center gap-1.5"><LockKeyhole size={11} className="text-[var(--color-subtle)]" /><p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--color-subtle)]">Fields the agent may set</p></div>
                  {capability.overridableFields.length === 0 ? <p className="mt-2 text-[10.5px] text-[var(--color-muted)]">All resource settings stay pinned to the workflow.</p> : <div className="mt-2 flex flex-wrap gap-1.5">
                    {capability.overridableFields.filter((field) => field !== capability.operationField).map((field) => {
                      const checked = grant?.allowedOverrideFields.includes(field) ?? false
                      return <button key={field} type="button" disabled={readOnly || !enabled || !grant} onClick={() => grant && replaceGrant({ ...grant, allowedOverrideFields: checked ? grant.allowedOverrideFields.filter((id) => id !== field) : [...grant.allowedOverrideFields, field] }, capability.nodeType)} className={cn('rounded-lg border px-2 py-1.5 text-[10.5px] transition-colors disabled:cursor-not-allowed disabled:opacity-45', checked ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]' : 'border-[var(--color-border)] text-[var(--color-muted)] hover:bg-[var(--color-hover)]')}>{humanizeField(field)}</button>
                    })}
                  </div>}
                </div>
              </div>
            </div>
          </section>
        )
      })}
    </div>
  )
}

function PermissionCheck({ checked }: { checked: boolean }) {
  return <span className={cn('mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border', checked ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--primary-foreground)]' : 'border-[var(--color-border)]')}>{checked && <Check size={11} strokeWidth={3} />}</span>
}

function humanizeField(field: string) {
  return field.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').replace(/^./, (letter) => letter.toUpperCase())
}
