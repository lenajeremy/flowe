import { useState, useEffect, useCallback } from 'react'
import { useWorkflowStore } from '@/store/workflowStore'
import { useShallow } from 'zustand/react/shallow'
import type { FlowNode, FlowEdge } from '@/types/workflow'
import { API } from '@/lib/config'
import { apiFetch } from '@/lib/http'

interface WorkflowVersion {
  id: string
  workflow_id: string
  version: number
  name: string
  nodes: FlowNode[]
  edges: FlowEdge[]
  created_at: string
}

export function VersionsPanel({ workflowId }: { workflowId: string }) {
  const [versions, setVersions] = useState<WorkflowVersion[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [restoring, setRestoring] = useState<string | null>(null)

  const { importWorkflowVersion } = useWorkflowStore(
    useShallow((s) => ({ importWorkflowVersion: s.importWorkflowVersion })),
  )

  const load = useCallback(() => {
    apiFetch(`${API}/api/workflows/${workflowId}/versions`)
      .then((r) => r.json())
      .then(setVersions)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [workflowId])

  useEffect(() => {
    load()
  }, [load])

  async function saveVersion() {
    setSaving(true)
    await apiFetch(`${API}/api/workflows/${workflowId}/versions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    await load()
    setSaving(false)
  }

  async function restoreVersion(versionId: string) {
    setRestoring(versionId)
    const res = await apiFetch(
      `${API}/api/workflows/${workflowId}/versions/${versionId}/restore`,
      { method: 'POST' },
    )
    if (res.ok) {
      const workflow = (await res.json()) as { nodes: FlowNode[]; edges: FlowEdge[] }
      importWorkflowVersion(workflow.nodes, workflow.edges)
    }
    setRestoring(null)
  }

  return (
    <div className="flex flex-col gap-3 p-3">
      <div className="flex items-center justify-between">
        <h3 className="micro text-[var(--color-subtle)]">
          Version History
        </h3>
        <button
          onClick={() => void saveVersion()}
          disabled={saving}
          className="pressable rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] px-2.5 py-1 text-[10px] text-[var(--color-text)] hover:border-[var(--color-border2)] disabled:opacity-40"
        >
          {saving ? 'Saving…' : 'Save version'}
        </button>
      </div>

      {loading && (
        <p className="text-[11px] text-[var(--color-muted)]">Loading…</p>
      )}
      {!loading && versions.length === 0 && (
        <p className="text-[11px] text-[var(--color-muted)]">
          No versions saved yet. Click "Save version" to create a snapshot.
        </p>
      )}

      <div className="flex flex-col gap-2">
        {versions.map((v) => (
          <div
            key={v.id}
            className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5"
          >
            <div className="flex flex-col">
              <span className="text-[11px] font-medium text-[var(--color-text)]">
                v{v.version} — {v.name}
              </span>
              <span className="text-[10px] text-[var(--color-muted)]">
                {new Date(v.created_at).toLocaleString()}
              </span>
            </div>
            <button
              onClick={() => void restoreVersion(v.id)}
              disabled={restoring === v.id}
              className="rounded-lg border border-[var(--color-border)] px-2 py-1 text-[10px] text-[var(--color-muted)] transition-colors hover:border-white/20 hover:text-[var(--color-text)] disabled:opacity-40"
            >
              {restoring === v.id ? 'Restoring…' : 'Restore'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
