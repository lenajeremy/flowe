import type { FlowNode, FlowEdge, ExecutionEvent, NodeType } from '@/types/workflow'
import { NODE_ACCENT_HEX } from '@/lib/nodeColors'

// Single source of truth for "available inputs" — the upstream-node output
// tokens surfaced by both the Input panel (Figma frame 170) and the {{ }}
// autocomplete in template fields. Keeping token generation here guarantees a
// chip dragged from the panel and a token picked from the dropdown are byte-
// identical, so the executor resolves both the same way.

export interface InputField {
  key: string
  preview: string
  token: string // {{nodeId.output}} or {{nodeId.output.field}} — stored/executed form
  display: string // {{NodeLabel.output.field}} — what the UI shows instead of the id
}

export interface InputGroup {
  node: FlowNode
  fields: InputField[]
}

export interface TokenOption {
  token: string
  display: string
  label: string // field key
  nodeLabel: string
  nodeType: NodeType
  accent: string
  preview: string
}

// latestOutputs collapses the execution log to each node's most recent output.
export function latestOutputs(log: ExecutionEvent[]): Map<string, string> {
  const m = new Map<string, string>()
  for (const ev of log) {
    if (ev.type === 'node_output' && ev.nodeId) m.set(ev.nodeId, ev.output ?? '')
  }
  return m
}

// outputFor prefers the live execution log, falling back to the output
// persisted on the node by the most recent successful run (so tokens and
// hover previews survive a page reload).
export function outputFor(node: FlowNode, outputs: Map<string, string>): string | undefined {
  const live = outputs.get(node.id)
  if (live !== undefined) return live
  const saved = node.data.executionOutput
  return typeof saved === 'string' && saved !== '' ? saved : undefined
}

// upstreamOf returns every ancestor of targetId, breadth-first so direct
// predecessors come before earlier ones — a node can template any output
// produced before it, not just the immediately previous node's.
export function upstreamOf(targetId: string | null, nodes: FlowNode[], edges: FlowEdge[]): FlowNode[] {
  if (!targetId) return []
  const order: string[] = []
  const seen = new Set<string>([targetId])
  let frontier = [targetId]
  while (frontier.length > 0) {
    const next: string[] = []
    for (const id of frontier) {
      for (const e of edges) {
        if (e.target === id && !seen.has(e.source)) {
          seen.add(e.source)
          order.push(e.source)
          next.push(e.source)
        }
      }
    }
    frontier = next
  }
  const byId = new Map(nodes.map((n) => [n.id, n]))
  return order.map((id) => byId.get(id)).filter((n): n is FlowNode => n !== undefined)
}

function preview(v: unknown): string {
  const s = typeof v === 'string' ? v : JSON.stringify(v)
  if (!s) return '—'
  return s.length > 16 ? s.slice(0, 14) + '..' : s
}

// fieldsFor turns a node's latest output into chips: JSON objects expand to
// their top-level keys; anything else is a single "output" field.
export function fieldsFor(node: FlowNode, output: string | undefined): InputField[] {
  const label = node.data.label || node.id
  if (output) {
    try {
      const parsed: unknown = JSON.parse(output)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const entries = Object.entries(parsed as Record<string, unknown>)
        if (entries.length > 0) {
          return entries.map(([k, v]) => ({
            key: k,
            preview: preview(v),
            token: `{{${node.id}.output.${k}}}`,
            display: `{{${label}.output.${k}}}`,
          }))
        }
      }
    } catch {
      /* not JSON — fall through to a single output field */
    }
  }
  return [{
    key: 'output',
    preview: output ? preview(output) : '—',
    token: `{{${node.id}.output}}`,
    display: `{{${label}.output}}`,
  }]
}

// inputGroups returns per-upstream-node field lists (used by the Input panel).
export function inputGroups(
  targetId: string | null,
  nodes: FlowNode[],
  edges: FlowEdge[],
  log: ExecutionEvent[],
): InputGroup[] {
  const outputs = latestOutputs(log)
  return upstreamOf(targetId, nodes, edges).map((node) => ({
    node,
    fields: fieldsFor(node, outputFor(node, outputs)),
  }))
}

// availableTokens flattens the groups into a pickable list (used by the {{ }}
// autocomplete dropdown).
export function availableTokens(
  targetId: string | null,
  nodes: FlowNode[],
  edges: FlowEdge[],
  log: ExecutionEvent[],
): TokenOption[] {
  return inputGroups(targetId, nodes, edges, log).flatMap((g) =>
    g.fields.map((f) => ({
      token: f.token,
      display: f.display,
      label: f.key,
      nodeLabel: g.node.data.label,
      nodeType: g.node.data.nodeType,
      accent: NODE_ACCENT_HEX[g.node.data.nodeType],
      preview: f.preview,
    })),
  )
}
