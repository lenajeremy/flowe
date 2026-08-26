import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Download, LoaderCircle, RotateCcw, Square } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  cancelCodingAgentJob,
  loadCodingAgentEnvironments,
  loadCodingAgentJob,
  loadCodingAgentJobs,
  resetCodingAgentEnvironment,
  type CodingAgentJob,
  type CodingAgentJobDetails,
  type CodingAgentJobStatus,
} from '@/lib/codingAgents'

const terminal = new Set<CodingAgentJobStatus>(['succeeded', 'failed', 'cancelled', 'timed_out'])

const statusClass: Record<CodingAgentJobStatus, string> = {
  pending: 'text-amber-600 dark:text-amber-300',
  claimed: 'text-sky-600 dark:text-sky-300',
  running: 'text-sky-600 dark:text-sky-300',
  succeeded: 'text-emerald-600 dark:text-emerald-300',
  failed: 'text-red-600 dark:text-red-300',
  cancelled: 'text-[var(--color-muted)]',
  timed_out: 'text-red-600 dark:text-red-300',
}

function downloadArtifact(path: string, content: string, mediaType = 'text/plain') {
  const url = URL.createObjectURL(new Blob([content], { type: mediaType }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = path || 'coding-agent-artifact.txt'
	anchor.style.display = 'none'
	document.body.appendChild(anchor)
  anchor.click()
	anchor.remove()
	window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

export function CodingAgentRuns({ workflowId, nodeId }: { workflowId?: string; nodeId: string }) {
  const [jobs, setJobs] = useState<CodingAgentJob[]>([])
  const [details, setDetails] = useState<Record<string, CodingAgentJobDetails>>({})
  const [expanded, setExpanded] = useState<string | null>(null)
  const [loading, setLoading] = useState(Boolean(workflowId))
  const [working, setWorking] = useState<string | null>(null)

  const refresh = useCallback(async (quiet = false) => {
    if (!workflowId) return
    if (!quiet) setLoading(true)
    try {
      setJobs(await loadCodingAgentJobs({ workflowId, nodeId, limit: 8 }))
    } catch (error) {
      if (!quiet) toast.error('Could not load coding-agent runs', { description: error instanceof Error ? error.message : undefined })
    } finally {
      if (!quiet) setLoading(false)
    }
  }, [workflowId, nodeId])

  useEffect(() => { void refresh() }, [refresh])
  const hasActive = useMemo(() => jobs.some((job) => !terminal.has(job.status)), [jobs])
  useEffect(() => {
    if (!hasActive) return
    const timer = window.setInterval(() => void refresh(true), 2500)
    return () => window.clearInterval(timer)
  }, [hasActive, refresh])

	useEffect(() => {
		if (!expanded) return
		const job = jobs.find((item) => item.id === expanded)
		if (!job || !terminal.has(job.status) || details[job.id]?.job.status === job.status) return
		let cancelled = false
		void loadCodingAgentJob(job.id).then((value) => {
			if (!cancelled) setDetails((current) => ({ ...current, [job.id]: value }))
		}).catch((error) => {
			if (!cancelled) toast.error('Could not refresh run details', { description: error instanceof Error ? error.message : undefined })
		})
		return () => { cancelled = true }
	}, [details, expanded, jobs])

  async function toggle(job: CodingAgentJob) {
    if (expanded === job.id) {
      setExpanded(null)
      return
    }
    setExpanded(job.id)
    if (!details[job.id]) {
      try {
        const value = await loadCodingAgentJob(job.id)
        setDetails((current) => ({ ...current, [job.id]: value }))
      } catch (error) {
        toast.error('Could not load run details', { description: error instanceof Error ? error.message : undefined })
      }
    }
  }

  async function cancel(job: CodingAgentJob) {
    setWorking(job.id)
    try {
      await cancelCodingAgentJob(job.id)
      await refresh(true)
    } catch (error) {
      toast.error('Could not cancel the run', { description: error instanceof Error ? error.message : undefined })
    } finally {
      setWorking(null)
    }
  }

  async function reset(job: CodingAgentJob) {
    if (!workflowId || !window.confirm('Delete this node’s reusable Daytona workspace and Codex thread? The next run will start clean.')) return
    setWorking(job.id)
    try {
      const environments = await loadCodingAgentEnvironments({ workflowId, nodeId })
      const environment = environments.find((item) => item.id === job.environment_id)
        ?? environments.find((item) => item.status !== 'archived')
      if (!environment) throw new Error('No reusable workspace exists for this node')
      await resetCodingAgentEnvironment(environment.id)
      toast.success('Coding-agent workspace reset')
      await refresh(true)
    } catch (error) {
      toast.error('Could not reset the workspace', { description: error instanceof Error ? error.message : undefined })
    } finally {
      setWorking(null)
    }
  }

  if (!workflowId) {
    return <p className="mt-3 text-[10px] leading-relaxed text-[var(--color-muted)]">Save this workflow to retain coding-agent jobs and workspace history.</p>
  }

  return (
    <section className="mt-5 border-t border-[var(--color-border)] pt-4">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <p className="text-[11px] font-medium">Recent runs</p>
          <p className="text-[10px] text-[var(--color-muted)]">Durable even if this page closes</p>
        </div>
        <button type="button" onClick={() => void refresh()} className="rounded-md p-1.5 text-[var(--color-muted)] hover:bg-[var(--color-hover)]" title="Refresh runs">
          <RotateCcw size={12} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>
      {loading ? (
        <p className="flex items-center gap-2 py-3 text-[10px] text-[var(--color-muted)]"><LoaderCircle size={12} className="animate-spin" /> Loading runs…</p>
      ) : jobs.length === 0 ? (
        <p className="rounded-lg border border-dashed border-[var(--color-border)] p-3 text-[10px] text-[var(--color-muted)]">Run this node or its graph to start the first coding-agent job.</p>
      ) : (
        <div className="space-y-1.5">
          {jobs.map((job) => {
            const detail = details[job.id]
            const isExpanded = expanded === job.id
            return (
              <div key={job.id} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)]">
                <button type="button" onClick={() => void toggle(job)} className="flex w-full items-center gap-2 px-2.5 py-2 text-left">
                  {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  <span className={`text-[10px] font-medium capitalize ${statusClass[job.status]}`}>{job.status.replace('_', ' ')}</span>
                  <span className="ml-auto text-[9.5px] text-[var(--color-subtle)]">{new Date(job.created_at).toLocaleString()}</span>
                </button>
                {isExpanded && (
                  <div className="border-t border-[var(--color-border)] px-3 py-2.5">
                    <p className="line-clamp-4 whitespace-pre-wrap text-[10px] leading-relaxed text-[var(--color-muted)]">{job.summary || job.last_error || job.task}</p>
                    {!terminal.has(job.status) && (
                      <Button size="xs" variant="outline" className="mt-2" disabled={working === job.id} onClick={() => void cancel(job)}><Square size={10} /> Cancel</Button>
                    )}
                    {terminal.has(job.status) && job.environment_id && (
                      <Button size="xs" variant="outline" className="mt-2" disabled={working === job.id} onClick={() => void reset(job)}><RotateCcw size={10} /> Reset workspace</Button>
                    )}
                    {detail?.artifacts.map((artifact) => (
                      <div key={artifact.id} className="mt-2 rounded-md bg-[var(--color-canvas)] p-2">
                        <div className="flex items-center gap-2">
                          <span className="min-w-0 flex-1 truncate font-mono text-[9.5px]">{artifact.path || artifact.kind}</span>
                          {artifact.inline_content !== undefined && (
                            <button type="button" title="Download artifact" onClick={() => downloadArtifact(artifact.path || artifact.kind, artifact.inline_content || '', artifact.media_type)} className="text-[var(--color-muted)] hover:text-[var(--color-text)]"><Download size={11} /></button>
                          )}
                        </div>
                        {artifact.inline_content && <pre className="mt-1.5 max-h-40 overflow-auto whitespace-pre-wrap break-words text-[9px] leading-relaxed text-[var(--color-muted)]">{artifact.inline_content}</pre>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
