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
      className="min-h-screen bg-black text-white"
      style={{ fontFamily: 'var(--font-sans)' }}
    >
      <div className="mx-auto max-w-3xl px-6 py-16">

        {/* Header */}
        <div className="mb-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white transition-opacity hover:opacity-80"
              title="Home"
            >
              <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
                <path d="M6 2.5h6v4H6zM2.5 6h4v6h-4zM11.5 6h4v6h-4zM6 11.5h6v4H6z"
                  stroke="black" strokeWidth="1.5" />
              </svg>
            </button>
            <h1 className="text-xl font-bold text-white">Workflows</h1>
          </div>

          <button
            onClick={handleCreate}
            disabled={creating}
            className="flex items-center gap-2 rounded-full bg-white px-5 py-2 text-sm font-semibold text-black transition-all hover:opacity-90 disabled:opacity-50"
            style={{ boxShadow: '0 0 20px rgba(255,255,255,0.15)' }}
          >
            {creating ? (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="animate-spin">
                <circle cx="6" cy="6" r="4.5" stroke="black" strokeWidth="1.5" strokeOpacity="0.3"/>
                <path d="M10.5 6A4.5 4.5 0 0 0 6 1.5" stroke="black" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            ) : (
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                <path d="M5.5 1v9M1 5.5h9" stroke="black" strokeWidth="1.6" strokeLinecap="round"/>
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
          <div
            className="flex flex-col items-center justify-center rounded-2xl py-20 text-center"
            style={{ border: '1px dashed rgba(255,255,255,0.1)' }}
          >
            <p className="text-sm text-white/40">No workflows yet</p>
            <button
              onClick={handleCreate}
              className="mt-4 rounded-full bg-white px-5 py-2 text-sm font-semibold text-black transition-all hover:opacity-90"
              style={{ boxShadow: '0 0 20px rgba(255,255,255,0.15)' }}
            >
              Create your first workflow
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {workflows.map((wf) => (
              <div
                key={wf.id}
                onClick={() => navigate(`/workflow/${wf.id}`)}
                className="group flex cursor-pointer items-center gap-4 rounded-xl px-4 py-3.5 transition-all duration-150"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLDivElement
                  el.style.background = 'rgba(255,255,255,0.07)'
                  el.style.border = '1px solid rgba(255,255,255,0.14)'
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLDivElement
                  el.style.background = 'rgba(255,255,255,0.04)'
                  el.style.border = '1px solid rgba(255,255,255,0.08)'
                }}
              >
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
                    <path d="M6 2.5h6v4H6zM2.5 6h4v6h-4zM11.5 6h4v6h-4zM6 11.5h6v4H6z"
                      stroke="var(--color-muted)" strokeWidth="1.4" />
                  </svg>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{wf.name}</p>
                  <p className="text-[11px] text-[var(--color-muted)]">
                    Updated {formatDate(wf.updated_at)}
                  </p>
                </div>

                <div className="flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={(e) => handleDelete(e, wf.id)}
                    disabled={deletingId === wf.id}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-muted)] transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-40"
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
