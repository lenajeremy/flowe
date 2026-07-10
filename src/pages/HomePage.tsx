import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listWorkflows, deleteWorkflow, type SavedWorkflow } from '@/lib/workflowApi'
import { API } from '@/lib/config'
import { FloweIcon } from '@/components/FloweIcon'

// Workflow list lives at /workflows; editor at /workflow/:id

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function Spinner() {
  return (
    <svg width="14" height="14" viewBox="0 0 12 12" fill="none" className="animate-spin">
      <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.3" />
      <path d="M10.5 6A4.5 4.5 0 0 0 6 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function HomePage() {
  const navigate = useNavigate()
  const [workflows, setWorkflows] = useState<SavedWorkflow[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    listWorkflows()
      .then(setWorkflows)
      .finally(() => setLoading(false))
  }, [])

  async function handleCreate() {
    setCreating(true)
    try {
      const res = await fetch(`${API}/api/workflows`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New Workflow', nodes: [], edges: [] }),
      })
      const wf = await res.json() as SavedWorkflow
      navigate(`/workflow/${wf.id}`)
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    setDeletingId(id)
    try {
      await deleteWorkflow(id)
      setWorkflows((ws) => ws.filter((w) => w.id !== id))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-canvas)] font-[var(--font-sans)] text-[var(--color-text)]">
      <div className="mx-auto max-w-2xl px-6 py-16">

        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="pressable flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:border-[var(--color-border2)]"
              title="Home"
            >
              <FloweIcon size={18} />
            </button>
            <div>
              <h1 className="text-lg font-semibold leading-tight tracking-[-0.01em]">Workflows</h1>
              {!loading && (
                <p className="micro mt-0.5 text-[var(--color-subtle)]">
                  {workflows.length} saved
                </p>
              )}
            </div>
          </div>

          <button
            onClick={handleCreate}
            disabled={creating}
            className="pressable flex items-center gap-2 rounded-full bg-[var(--color-text)] px-4 py-2 text-[13px] font-semibold text-[var(--color-canvas)] hover:opacity-90 disabled:opacity-50"
          >
            {creating ? (
              <Spinner />
            ) : (
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                <path d="M5.5 1v9M1 5.5h9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            )}
            New workflow
          </button>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-20 text-[13px] text-[var(--color-muted)]">
            <Spinner />
            Loading…
          </div>
        ) : workflows.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--color-border2)] py-20 text-center">
            <p className="text-sm text-[var(--color-muted)]">Nothing here yet</p>
            <p className="mt-1 text-[12px] text-[var(--color-subtle)]">
              Create a workflow and describe it to the AI builder — it wires the nodes for you.
            </p>
            <button
              onClick={handleCreate}
              className="pressable mt-5 rounded-full bg-[var(--color-text)] px-4 py-2 text-[13px] font-semibold text-[var(--color-canvas)] hover:opacity-90"
            >
              Create your first workflow
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {workflows.map((wf, i) => (
              <div
                key={wf.id}
                onClick={() => navigate(`/workflow/${wf.id}`)}
                className="rise-in group flex cursor-pointer items-center gap-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3.5 transition-colors duration-150 hover:border-[var(--color-border2)] hover:bg-[var(--color-surface2)]"
                style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
              >
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-[var(--color-border2)] bg-[var(--color-elevated)]">
                  <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
                    <path d="M6 2.5h6v4H6zM2.5 6h4v6h-4zM11.5 6h4v6h-4zM6 11.5h6v4H6z"
                      stroke="var(--color-muted)" strokeWidth="1.4" />
                  </svg>
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[var(--color-text)]">{wf.name}</p>
                  <p className="micro mt-0.5 text-[var(--color-subtle)]">
                    Updated {formatDate(wf.updated_at)}
                  </p>
                </div>

                <div className="flex items-center gap-2 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                  <button
                    onClick={(e) => handleDelete(e, wf.id)}
                    disabled={deletingId === wf.id}
                    className="pressable flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-muted)] hover:bg-[var(--color-fail)]/10 hover:text-[var(--color-fail)] disabled:opacity-40"
                    title="Delete workflow"
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M1.5 3h9M4.5 3V2h3v1M5 5.5v3M7 5.5v3M2.5 3l.5 7h6l.5-7"
                        stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>

                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-[var(--color-subtle)]">
                    <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
