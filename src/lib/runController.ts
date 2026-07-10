import { useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useWorkflowStore } from '@/store/workflowStore'
import { consumeRunStream } from '@/lib/runStream'
import { serializeToAST } from '@/lib/executor'
import { API } from '@/lib/config'
import type { ExecutionEvent } from '@/types/workflow'
import { apiFetch } from '@/lib/http'

// Run orchestration extracted from the old BottomToolDock so the canvas
// (node Run buttons, zoom controls) can trigger runs without the dock UI.

let runAbort: AbortController | null = null

/** Shared event handler — all stream consumers (manual run, external URL run,
 *  scheduled/webhook push) go through this single code path. */
function makeEventHandler(initialFallback: string): (event: ExecutionEvent) => void {
  const nodeOutputs = new Map<string, string>()
  let fallback = initialFallback
  return (event: ExecutionEvent) => {
    const s = useWorkflowStore.getState()
    s.appendExecutionEvent(event)
    const nid = event.nodeId
    switch (event.type) {
      case 'workflow_started':
        if (event.runId) { fallback = event.runId; s.setCurrentRunId(event.runId) }
        break
      case 'node_started':
        if (nid) s.setNodeExecutionStatus(nid, 'running')
        break
      case 'node_output':
        if (nid && event.output !== undefined) nodeOutputs.set(nid, event.output)
        break
      case 'node_completed':
        if (nid) s.setNodeExecutionStatus(nid, 'completed', nodeOutputs.get(nid))
        break
      case 'node_error':
        if (nid) s.setNodeExecutionStatus(nid, 'error', event.message)
        break
      case 'node_waiting':
        if (nid) {
          s.setNodeExecutionStatus(nid, 'waiting')
          s.setPendingApproval({
            runId: event.runId ?? fallback,
            nodeId: nid,
            message: event.message ?? 'Please review and approve or reject this step.',
          })
        }
        break
      case 'workflow_completed':
        s.setExecutionState('completed')
        break
      case 'workflow_error':
        s.setExecutionState('error')
        break
    }
  }
}

function prepareRunState(runId: string | null) {
  const s = useWorkflowStore.getState()
  s.resetNodeExecutionStatuses()
  s.clearExecutionLog()
  s.setExecutionState('running')
  s.setLogPanelOpen(true)
  s.setPendingApproval(null)
  s.setCurrentRunId(runId)
}

export function startRun() {
  const s = useWorkflowStore.getState()
  if (s.executionState === 'running') return
  prepareRunState(null)

  const controller = new AbortController()
  runAbort = controller

  void (async () => {
    const { nodes, edges, workflowName, dbId } = useWorkflowStore.getState()
    const ast = serializeToAST(nodes, edges, workflowName)
    const startTime = Date.now()
    try {
      const response = await apiFetch(`${API}/api/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflow: ast, workflowId: dbId ?? '' }),
        signal: controller.signal,
      })
      if (!response.ok || !response.body) throw new Error(`Server error ${response.status}`)
      await consumeRunStream(response.body.getReader(), makeEventHandler(''))
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      const message = err instanceof Error ? err.message : String(err)
      const st = useWorkflowStore.getState()
      st.appendExecutionEvent({
        id: crypto.randomUUID(),
        type: 'workflow_error',
        message: `Connection error: ${message}`,
        timestamp: Date.now() - startTime,
      })
      st.setExecutionState('error')
    } finally {
      runAbort = null
    }
  })()
}

export function stopRun() {
  runAbort?.abort()
  runAbort = null
  const s = useWorkflowStore.getState()
  s.setExecutionState('idle')
  s.resetNodeExecutionStatuses()
}

/** Mount once per editor page: connects ?runId= URL streams and subscribes to
 *  workflow-level run-start events (scheduled / webhook runs). */
export function useRunStreamBridge() {
  const [searchParams] = useSearchParams()
  const connectedRunRef = useRef<string | null>(null)
  const dbId = useWorkflowStore((s) => s.dbId)
  const isRunning = useWorkflowStore((s) => s.executionState === 'running')

  // Auto-connect to a run stream when ?runId= is present (webhook trigger page).
  useEffect(() => {
    const externalRunId = searchParams.get('runId')
    if (!externalRunId || !dbId || connectedRunRef.current === externalRunId) return
    connectedRunRef.current = externalRunId
    prepareRunState(externalRunId)

    void (async () => {
      try {
        const response = await apiFetch(`${API}/api/runs/${externalRunId}/stream`)
        if (!response.ok || !response.body) throw new Error(`Server error ${response.status}`)
        await consumeRunStream(response.body.getReader(), makeEventHandler(externalRunId))
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        const st = useWorkflowStore.getState()
        st.appendExecutionEvent({
          id: crypto.randomUUID(),
          type: 'workflow_error',
          message: `Stream error: ${message}`,
          timestamp: 0,
        })
        st.setExecutionState('error')
      }
    })()
  }, [searchParams, dbId])

  // Subscribe to run-start pushes so the canvas updates when a scheduled or
  // webhook run fires — no polling, no race condition.
  useEffect(() => {
    if (!dbId || isRunning) return

    const controller = new AbortController()

    void (async () => {
      try {
        const response = await apiFetch(`${API}/api/workflows/${dbId}/events`, { signal: controller.signal })
        if (!response.ok || !response.body) return

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const run_id = line.slice(6).trim()
            if (!run_id || connectedRunRef.current === run_id) continue

            connectedRunRef.current = run_id
            prepareRunState(run_id)

            const streamRes = await apiFetch(`${API}/api/runs/${run_id}/stream`)
            if (!streamRes.ok || !streamRes.body) continue
            await consumeRunStream(streamRes.body.getReader(), makeEventHandler(run_id))
          }
        }
      } catch {
        // connection closed or aborted — fine
      }
    })()

    return () => controller.abort()
  }, [dbId, isRunning])
}
