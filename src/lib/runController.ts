import { useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useWorkflowStore } from '@/store/workflowStore'
import { consumeRunStream } from '@/lib/runStream'
import { serializeToAST } from '@/lib/executor'
import { API } from '@/lib/config'
import type { ExecutionEvent } from '@/types/workflow'
import { apiFetch } from '@/lib/http'
import posthog from '@/lib/posthog'
import { latestOutputs, upstreamOf } from '@/lib/nodeInputs'
import { toast } from 'sonner'
import type { FlowNode } from '@/types/workflow'

// Run orchestration extracted from the old BottomToolDock so the canvas
// (node Run buttons, zoom controls) can trigger runs without the dock UI.

let runAbort: AbortController | null = null
let pendingRunNodeId: string | undefined

/** Return the weakly connected component containing startNodeId. Following
 * edges in both directions includes every upstream prerequisite and every
 * downstream consumer without touching a separate graph on the same canvas. */
function connectedNodeIds(startNodeId: string, edges: Array<{ source: string; target: string }>): Set<string> {
  const ids = new Set<string>([startNodeId])
  const queue = [startNodeId]
  while (queue.length > 0) {
    const current = queue.shift()!
    for (const edge of edges) {
      const next = edge.source === current
        ? edge.target
        : edge.target === current ? edge.source : undefined
      if (next && !ids.has(next)) {
        ids.add(next)
        queue.push(next)
      }
    }
  }
  return ids
}

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
        posthog.capture('workflow_run_completed', { run_id: event.runId ?? fallback })
        s.setExecutionState('completed')
        break
      case 'workflow_error':
        posthog.capture('workflow_run_failed', { run_id: event.runId ?? fallback })
        s.setExecutionState('error')
        break
    }
  }
}

function prepareRunState(runId: string | null, nodeIds?: string[]) {
  const s = useWorkflowStore.getState()
  s.resetNodeExecutionStatuses(nodeIds)
  s.clearExecutionLog()
  s.setExecutionState('running')
  s.setLogPanelOpen(true)
  s.setPendingApproval(null)
  s.setCurrentRunId(runId)
}

/** Entry point for Run buttons. Flows that start from a webhook trigger get
 *  the payload-simulation modal first (it calls startRun with the payload);
 *  everything else runs immediately. */
export function requestRun(nodeId?: string) {
  const s = useWorkflowStore.getState()
  if (s.executionState === 'running') return
  pendingRunNodeId = nodeId
  const scopedIds = nodeId ? connectedNodeIds(nodeId, s.edges) : null
  const hasWebhook = s.nodes.some((n) =>
    (!scopedIds || scopedIds.has(n.id)) &&
    (n.data.nodeType === 'webhookTrigger' || n.data.nodeType === 'integrationTrigger'),
  )
  if (hasWebhook) s.setWebhookRunPromptOpen(true)
  else startRun({ nodeId })
}

function requiredOutputIds(node: FlowNode, edges: Array<{ source: string; target: string }>): string[] {
  const required = new Set<string>()
  const incomingNodeId = edges.find((edge) => edge.target === node.id)?.source
  const config = { ...node.data }
  delete config.executionOutput
  delete config.executionStatus
  for (const match of JSON.stringify(config).matchAll(/\{\{([\w-]+)\.output(?:\.[\w-]+)*\}\}/g)) {
    const referencedNodeId = match[1] === 'previousNode' ? incomingNodeId ?? match[1] : match[1]
    if (referencedNodeId !== node.id) required.add(referencedNodeId)
  }
  if (node.data.nodeType === 'branch' || node.data.nodeType === 'loop' || node.data.nodeType === 'textOutput') {
    if (incomingNodeId) required.add(incomingNodeId)
  }
  return [...required]
}

/** Execute one node using the most recent outputs of its upstream ancestors.
 * Missing required values block locally before any credits or side effects. */
export function testNode(nodeId: string) {
  const s = useWorkflowStore.getState()
  if (s.executionState === 'running') return
  const target = s.nodes.find((node) => node.id === nodeId)
  if (!target) return

  const liveOutputs = latestOutputs(s.executionLog)
  const initialOutputs: Record<string, string> = {}
  const upstream = upstreamOf(nodeId, s.nodes, s.edges)
  for (const node of upstream) {
    if (liveOutputs.has(node.id)) {
      initialOutputs[node.id] = liveOutputs.get(node.id)!
    } else if (typeof node.data.executionOutput === 'string') {
      initialOutputs[node.id] = node.data.executionOutput
    }
  }

  const missing = requiredOutputIds(target, s.edges).filter((id) => !(id in initialOutputs))
  if (missing.length > 0) {
    const labels = missing.map((id) => s.nodes.find((node) => node.id === id)?.data.label || id)
    toast.error('Run this graph first', {
      description: `${labels.join(', ')} ${labels.length === 1 ? 'has' : 'have'} no previous output for this test.`,
    })
    return
  }

  startRun({ onlyNodeId: nodeId, initialOutputs })
}

export function startRun(opts?: {
  webhookPayload?: string
  nodeId?: string
  onlyNodeId?: string
  initialOutputs?: Record<string, string>
}) {
  const s = useWorkflowStore.getState()
  if (s.executionState === 'running') return
  const nodeId = opts?.nodeId ?? pendingRunNodeId
  pendingRunNodeId = undefined
  const resetNodeIds = opts?.onlyNodeId
    ? [opts.onlyNodeId]
    : nodeId ? [...connectedNodeIds(nodeId, s.edges)] : undefined
  prepareRunState(null, resetNodeIds)
  posthog.capture('workflow_run_started', {
    workflow_id: s.dbId ?? null,
    trigger: opts?.webhookPayload === undefined ? 'manual' : 'webhook_simulation',
    scope: opts?.onlyNodeId ? 'single_node' : nodeId ? 'connected_graph' : 'workflow',
    source_node_id: opts?.onlyNodeId ?? nodeId ?? null,
  })

  const controller = new AbortController()
  runAbort = controller

  void (async () => {
    const { nodes, edges, workflowName, dbId } = useWorkflowStore.getState()
    const ast = serializeToAST(nodes, edges, workflowName)
    if (nodeId) {
      const scopedIds = connectedNodeIds(nodeId, ast.edges)
      ast.nodes = ast.nodes.filter((node) => scopedIds.has(node.id))
      ast.edges = ast.edges.filter((edge) => scopedIds.has(edge.source) && scopedIds.has(edge.target))
    }
    // Simulated webhook payload rides in the trigger node's defaultValue —
    // the same slot the real ReceiveWebhook handler injects into.
    if (opts?.webhookPayload !== undefined) {
      ast.nodes = ast.nodes.map((n) =>
        n.data.nodeType === 'webhookTrigger' || n.data.nodeType === 'integrationTrigger'
          ? { ...n, data: { ...n.data, defaultValue: opts.webhookPayload } }
          : n,
      )
    }
    const startTime = Date.now()
    try {
      const endpoint = opts?.onlyNodeId ? `${API}/api/run/node` : `${API}/api/run`
      const response = await apiFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflow: ast,
          workflowId: dbId ?? '',
          onlyNodeId: opts?.onlyNodeId,
          initialOutputs: opts?.onlyNodeId ? opts.initialOutputs : undefined,
        }),
        signal: controller.signal,
      })
      if (!response.ok) {
        const detail = await response.json().catch(() => null) as { error?: string } | null
        throw new Error(detail?.error || `Server error ${response.status}`)
      }
      if (!response.body) throw new Error('Server returned no run stream')
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
      posthog.capture('workflow_run_failed', { workflow_id: dbId ?? null, failure_stage: 'connection' })
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
