import type { ExecutionEvent } from '@/types/workflow'

export interface CodingAgentCommandActivity {
  phase: 'started' | 'completed'
  command: string
  result?: string
  status?: string
  exitCode?: number
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
