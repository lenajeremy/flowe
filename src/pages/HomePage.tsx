import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listWorkflows, deleteWorkflow, type SavedWorkflow } from '@/lib/workflowApi'

// Workflow list lives at /workflows; editor at /workflow/:id

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function HomePage() {
  const navigate = useNavigate()
  const [workflows, setWorkflows] = useState<SavedWorkflow[]>([])
  const [loading, setLoading]     = useState(true)
  const [creating, setCreating]   = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    listWorkflows()
      .then(setWorkflows)
      .finally(() => setLoading(false))
  }, [])

  async function handleCreate() {
    setCreating(true)
    try {
      const res = await fetch('/api/workflows', {
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
    <div
      className="min-h-screen bg-[var(--color-canvas)] text-[var(--color-text)]"
      style={{ fontFamily: 'var(--font-sans)' }}
    >
      <div className="mx-auto max-w-3xl px-6 py-16">

        {/* Header */}
        <div className="mb-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[var(--color-accent)] transition-opacity hover:opacity-80"
              title="Home"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M6 2.5h6v4H6zM2.5 6h4v6h-4zM11.5 6h4v6h-4zM6 11.5h6v4H6z"
                  stroke="white" strokeWidth="1.35" />
              </svg>
            </button>
            <h1 className="text-xl font-semibold text-[var(--color-text)]">Workflows</h1>
          </div>

          <button
            onClick={handleCreate}
            disabled={creating}
            className="flex items-center gap-2 rounded-full bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {creating ? (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="animate-spin">
                <circle cx="6" cy="6" r="4.5" stroke="white" strokeWidth="1.5" strokeOpacity="0.3"/>
                <path d="M10.5 6A4.5 4.5 0 0 0 6 1.5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 1v10M1 6h10" stroke="white" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
            )}
            New workflow
          </button>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-[var(--color-muted)]">
            <svg width="16" height="16" viewBox="0 0 12 12" fill="none" className="animate-spin mr-2">
              <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.3"/>
              <path d="M10.5 6A4.5 4.5 0 0 0 6 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            Loading…
          </div>
        ) : workflows.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--color-border)] py-20 text-center">
            <p className="text-sm text-[var(--color-muted)]">No workflows yet</p>
            <button
              onClick={handleCreate}
              className="mt-3 text-sm text-[var(--color-accent)] hover:underline"
            >
              Create your first workflow →
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {workflows.map((wf) => (
              <div
                key={wf.id}
                onClick={() => navigate(`/workflow/${wf.id}`)}
                className="group flex cursor-pointer items-center gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3.5 transition-colors hover:border-[var(--color-border2)] hover:bg-[var(--color-elevated)]"
              >
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[8px] bg-[var(--color-surface2)]">
                  <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
                    <path d="M6 2.5h6v4H6zM2.5 6h4v6h-4zM11.5 6h4v6h-4zM6 11.5h6v4H6z"
                      stroke="var(--color-muted)" strokeWidth="1.35" />
                  </svg>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-[var(--color-text)]">{wf.name}</p>
                  <p className="text-[11px] text-[var(--color-muted)]">
                    Updated {formatDate(wf.updated_at)}
                  </p>
                </div>

                <div className="flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={(e) => handleDelete(e, wf.id)}
                    disabled={deletingId === wf.id}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-muted)] transition-colors hover:bg-red-500/10 hover:text-red-500 disabled:opacity-40"
                    title="Delete workflow"
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M1.5 3h9M4.5 3V2h3v1M5 5.5v3M7 5.5v3M2.5 3l.5 7h6l.5-7"
                        stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>

                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-[var(--color-muted)]">
                    <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
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
