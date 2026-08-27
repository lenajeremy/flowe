import type { ExecutionEvent } from '@/types/workflow'

export interface CodingAgentCommandActivity {
  phase: 'started' | 'completed'
  command: string
  result?: string
  status?: string
  exitCode?: number
}

export interface CodingAgentToolActivity {
  type: string
  toolCallId?: string
  nodeLabel?: string
  operation?: string
  effect?: string
  reason?: string
  arguments?: unknown
  effectiveConfig?: unknown
  result?: string
  error?: string
  status?: string
}

export function getCodingAgentCommandActivity(event: ExecutionEvent): CodingAgentCommandActivity | null {
  if (event.type !== 'node_progress' || event.payload?.kind !== 'command') return null
  const phase = event.payload.phase
  if (phase !== 'started' && phase !== 'completed') return null
  const rawExitCode = event.payload.exitCode
  const exitCode = typeof rawExitCode === 'number'
    ? rawExitCode
    : typeof rawExitCode === 'string' && rawExitCode.trim() !== ''
      ? Number(rawExitCode)
      : undefined
  return {
    phase,
    command: typeof event.payload.command === 'string' ? event.payload.command : '(command unavailable)',
    result: typeof event.payload.result === 'string' ? event.payload.result : undefined,
    status: typeof event.payload.status === 'string' ? event.payload.status : undefined,
    exitCode: Number.isFinite(exitCode) ? exitCode : undefined,
  }
}

export function getCodingAgentToolActivity(event: ExecutionEvent): CodingAgentToolActivity | null {
  if (event.type !== 'node_progress') return null
  const activityType = typeof event.payload?.activityType === 'string' ? event.payload.activityType : ''
  if (!activityType.startsWith('tool_')) return null
  return {
    type: activityType,
    toolCallId: typeof event.payload?.toolCallId === 'string' ? event.payload.toolCallId : undefined,
    nodeLabel: typeof event.payload?.nodeLabel === 'string' ? event.payload.nodeLabel : undefined,
    operation: typeof event.payload?.operation === 'string' ? event.payload.operation : undefined,
    effect: typeof event.payload?.effect === 'string' ? event.payload.effect : undefined,
    reason: typeof event.payload?.reason === 'string' ? event.payload.reason : undefined,
    arguments: event.payload?.arguments,
    effectiveConfig: event.payload?.effectiveConfig,
    result: typeof event.payload?.result === 'string' ? event.payload.result : undefined,
    error: typeof event.payload?.error === 'string' ? event.payload.error : undefined,
    status: typeof event.payload?.status === 'string' ? event.payload.status : undefined,
  }
}
