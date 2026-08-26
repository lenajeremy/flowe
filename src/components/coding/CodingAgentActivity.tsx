import { Terminal } from 'lucide-react'
import type { ExecutionEvent } from '@/types/workflow'
import { getCodingAgentCommandActivity } from '@/lib/codingAgentActivity'

export function CodingAgentActivity({ event, className = '' }: { event: ExecutionEvent; className?: string }) {
  const activity = getCodingAgentCommandActivity(event)
  if (!activity) return null
  const failed = activity.exitCode !== undefined && activity.exitCode !== 0
  const finished = activity.phase === 'completed'

  return (
    <div className={`overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-canvas)] ${className}`}>
      <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-3 py-2">
        <Terminal size={12} className="text-[var(--color-muted)]" />
        <span className="text-[10px] font-medium text-[var(--color-muted)]">Command</span>
        <span className={`ml-auto rounded-full px-2 py-0.5 text-[9px] font-medium ${
          !finished
            ? 'bg-[var(--color-accent)]/15 text-[var(--color-accent)]'
            : failed
              ? 'bg-[var(--color-fail)]/15 text-[var(--color-fail)]'
              : 'bg-[var(--color-ok)]/15 text-[var(--color-ok)]'
        }`}>
          {!finished ? 'running' : failed ? `exit ${activity.exitCode}` : 'completed'}
        </span>
      </div>
      <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words px-3 py-2 font-mono text-[11px] leading-5 text-[var(--color-text)]">{activity.command}</pre>
      {finished && (
        <div className="border-t border-[var(--color-border)] px-3 py-2">
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="text-[10px] font-medium text-[var(--color-muted)]">Result</span>
            {activity.status && <span className="text-[9px] text-[var(--color-subtle)]">{activity.status}</span>}
          </div>
          <pre className={`max-h-64 overflow-auto whitespace-pre-wrap break-words font-mono text-[10px] leading-4 ${failed ? 'text-[var(--color-fail)]' : 'text-[var(--color-muted)]'}`}>
            {activity.result?.trim() || 'Command produced no output.'}
          </pre>
        </div>
      )}
    </div>
  )
}
