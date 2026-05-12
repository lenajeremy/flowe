import { create } from 'zustand'
import {
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  type NodeChange,
  type EdgeChange,
  type Connection,
} from '@xyflow/react'
import type {
  FlowNode,
  FlowEdge,
  FlowNodeData,
  ExecutionState,
  ExecutionEvent,
  WorkflowAST,
} from '@/types/workflow'
import type { WorkflowRun } from '@/lib/workflowApi'
import { buildDemoWorkflow } from '@/lib/demoWorkflow'

export type PatchOp =
  | { op: 'add_node'; node: Record<string, unknown> }
  | { op: 'remove_node'; node_id: string }
  | { op: 'add_edge'; edge: Record<string, unknown> }
  | { op: 'remove_edge'; edge_id: string }
  | { op: 'update_node'; node_id: string; data: Partial<FlowNodeData> }

// ── Tab types ────────────────────────────────────────────────

export interface TabMeta {
  id: string
  workflowName: string
  dbId?: string  // UUID of the saved workflow in the DB, if persisted
}

type HistoryEntry = { nodes: FlowNode[]; edges: FlowEdge[] }

export interface TabSnapshot {
  workflowName: string
  dbId?: string
  nodes: FlowNode[]
  edges: FlowEdge[]
  selectedNodeId: string | null
  executionState: ExecutionState
  executionLog: ExecutionEvent[]
  isLogPanelOpen: boolean
  isConfigPanelOpen: boolean
  history: HistoryEntry[]
  future: HistoryEntry[]
}

// ── Store interface ──────────────────────────────────────────

interface WorkflowStore {
  // ── Tab management ──
  tabs: TabMeta[]
  activeTabId: string
  snapshots: Record<string, TabSnapshot>
  addTab: (snapshot?: TabSnapshot) => void
  closeTab: (id: string) => void
  switchTab: (id: string) => void
  importWorkflowAsNewTab: (ast: WorkflowAST, dbId?: string) => void

  // ── Active tab state (flat; all existing consumers unchanged) ──
  nodes: FlowNode[]
  edges: FlowEdge[]
  onNodesChange: (changes: NodeChange<FlowNode>[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  onConnect: (connection: Connection) => void
  addNode: (node: FlowNode) => void
  deleteNodesById: (ids: string[]) => void
  deleteEdgesById: (ids: string[]) => void

  history: HistoryEntry[]
  future: HistoryEntry[]
  undo: () => void
  redo: () => void

  selectedNodeId: string | null
  setSelectedNodeId: (id: string | null) => void
  selectedEdgeId: string | null
  setSelectedEdgeId: (id: string | null) => void
  selectedNodeIds: string[]
  setSelectedNodeIds: (ids: string[]) => void

  updateNodeData: (nodeId: string, partial: Partial<FlowNodeData>) => void

  workflowName: string
  setWorkflowName: (name: string) => void

  dbId: string | undefined
  setDbId: (id: string) => void

  executionState: ExecutionState
  executionLog: ExecutionEvent[]
  setExecutionState: (state: ExecutionState) => void
  appendExecutionEvent: (event: ExecutionEvent) => void
  clearExecutionLog: () => void

  setNodeExecutionStatus: (
    nodeId: string,
    status: 'idle' | 'running' | 'completed' | 'error' | 'waiting',
    output?: string,
  ) => void
  resetNodeExecutionStatuses: () => void

  isLogPanelOpen: boolean
  setLogPanelOpen: (open: boolean) => void

  isConfigPanelOpen: boolean
  setConfigPanelOpen: (open: boolean) => void

  // ── Save state ──
  saveStatus: 'idle' | 'unsaved' | 'saving' | 'saved'
  setSaveStatus: (status: 'idle' | 'unsaved' | 'saving' | 'saved') => void
  loadWorkflow: (ast: WorkflowAST, dbId: string) => void

  // ── Global UI (not per-tab) ──
  isApiKeyModalOpen: boolean
  setApiKeyModalOpen: (open: boolean) => void

  // ── Approval / run tracking ──
  pendingApproval: { runId: string; nodeId: string; message: string } | null
  setPendingApproval: (approval: { runId: string; nodeId: string; message: string } | null) => void

  currentRunId: string | null
  setCurrentRunId: (id: string | null) => void

  // ── Run history ──
  runHistory: WorkflowRun[]
  setRunHistory: (runs: WorkflowRun[]) => void

  // ── Version import ──
  importWorkflowVersion: (nodes: unknown[], edges: unknown[]) => void

  // ── Patch ──
  applyPatch: (ops: PatchOp[]) => void

  // ── Versions panel ──
  versionsOpen: boolean
  setVersionsOpen: (open: boolean) => void
}

// ── Helpers ──────────────────────────────────────────────────

function snap(s: WorkflowStore): TabSnapshot {
  return {
    workflowName: s.workflowName,
    dbId: s.dbId,
    nodes: s.nodes,
    edges: s.edges,
    selectedNodeId: s.selectedNodeId,
    executionState: s.executionState,
    executionLog: s.executionLog,
    isLogPanelOpen: s.isLogPanelOpen,
    isConfigPanelOpen: s.isConfigPanelOpen,
    history: s.history,
    future: s.future,
  }
}

const HISTORY_LIMIT = 10

function pushHistory(
  history: HistoryEntry[],
  nodes: FlowNode[],
  edges: FlowEdge[],
): HistoryEntry[] {
  return [...history, { nodes, edges }].slice(-HISTORY_LIMIT)
}

function astToSnapshot(ast: WorkflowAST, dbId?: string): TabSnapshot {
  const nodes: FlowNode[] = ast.nodes.map((n) => ({
    id: n.id,
    type: n.type,
    position: n.position,
    data: n.data,
  }))
  const edges: FlowEdge[] = ast.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    ...(e.sourceHandle != null ? { sourceHandle: e.sourceHandle } : {}),
    ...(e.targetHandle != null ? { targetHandle: e.targetHandle } : {}),
  }))
  return {
    workflowName: ast.name,
    dbId,
    nodes,
    edges,
    selectedNodeId: null,
    executionState: 'idle',
    executionLog: [],
    isLogPanelOpen: false,
    isConfigPanelOpen: true,
    history: [],
    future: [],
  }
}

// ── Initial state ─────────────────────────────────────────────

const FIRST_TAB_ID = 'tab-1'
const demo = buildDemoWorkflow()

// ── Store ────────────────────────────────────────────────────

export const useWorkflowStore = create<WorkflowStore>((set, get) => ({
  // Tabs
  tabs: [{ id: FIRST_TAB_ID, workflowName: 'Blog Post Pipeline' }],
  activeTabId: FIRST_TAB_ID,
  snapshots: {},

  addTab: (snapshot) => {
    const s = get()
    if (s.executionState === 'running') return
    const newId = crypto.randomUUID()
    const target: TabSnapshot = snapshot ?? {
      workflowName: 'New Workflow',
      nodes: [],
      edges: [],
      selectedNodeId: null,
      executionState: 'idle',
      executionLog: [],
      isLogPanelOpen: false,
      isConfigPanelOpen: true,
      history: [],
      future: [],
    }
    set({
      snapshots: { ...s.snapshots, [s.activeTabId]: snap(s) },
      tabs: [...s.tabs, { id: newId, workflowName: target.workflowName }],
      activeTabId: newId,
      ...target,
    })
  },

  closeTab: (tabId) => {
    const s = get()
    if (s.tabs.length <= 1) return
    if (s.executionState === 'running' && tabId === s.activeTabId) return

    const newTabs = s.tabs.filter((t) => t.id !== tabId)

    if (tabId === s.activeTabId) {
      const idx = s.tabs.findIndex((t) => t.id === tabId)
      const next = newTabs[Math.min(idx, newTabs.length - 1)]
      const target = s.snapshots[next.id]!
      const newSnaps = { ...s.snapshots }
      delete newSnaps[tabId]
      delete newSnaps[next.id]
      set({ tabs: newTabs, activeTabId: next.id, snapshots: newSnaps, ...target })
    } else {
      const newSnaps = { ...s.snapshots }
      delete newSnaps[tabId]
      set({ tabs: newTabs, snapshots: newSnaps })
    }
  },

  switchTab: (tabId) => {
    const s = get()
    if (tabId === s.activeTabId || s.executionState === 'running') return
    const target = s.snapshots[tabId]
    if (!target) return
    const newSnaps = { ...s.snapshots, [s.activeTabId]: snap(s) }
    delete newSnaps[tabId]
    set({ snapshots: newSnaps, activeTabId: tabId, ...target })
  },

  importWorkflowAsNewTab: (ast, dbId?) => {
    const s = get()
    const newId = crypto.randomUUID()
    const target = astToSnapshot(ast, dbId)
    set({
      snapshots: { ...s.snapshots, [s.activeTabId]: snap(s) },
      tabs: [...s.tabs, { id: newId, workflowName: target.workflowName, dbId }],
      activeTabId: newId,
      ...target,
    })
  },

  // Active tab state
  ...demo,
  workflowName: 'Blog Post Pipeline',
  history: [],
  future: [],

  undo: () =>
    set((state) => {
      if (state.history.length === 0) return {}
      const prev = state.history[state.history.length - 1]
      return {
        nodes: prev.nodes,
        edges: prev.edges,
        history: state.history.slice(0, -1),
        future: [{ nodes: state.nodes, edges: state.edges }, ...state.future].slice(0, HISTORY_LIMIT),
        selectedNodeId: null,
      }
    }),

  redo: () =>
    set((state) => {
      if (state.future.length === 0) return {}
      const next = state.future[0]
      return {
        nodes: next.nodes,
        edges: next.edges,
        history: pushHistory(state.history, state.nodes, state.edges),
        future: state.future.slice(1),
        selectedNodeId: null,
      }
    }),

  onNodesChange: (changes) =>
    set((state) => {
      const dragEnded = changes.some((c) => c.type === 'position' && c.dragging === false)
      return {
        nodes: applyNodeChanges(changes, state.nodes),
        ...(dragEnded && {
          history: pushHistory(state.history, state.nodes, state.edges),
          future: [],
        }),
      }
    }),

  onEdgesChange: (changes) =>
    set((state) => ({ edges: applyEdgeChanges(changes, state.edges) })),

  onConnect: (connection) =>
    set((state) => ({
      edges: addEdge(connection, state.edges),
      history: pushHistory(state.history, state.nodes, state.edges),
      future: [],
    })),

  addNode: (node) =>
    set((state) => ({
      nodes: [...state.nodes, node],
      history: pushHistory(state.history, state.nodes, state.edges),
      future: [],
    })),

  deleteNodesById: (ids) =>
    set((state) => {
      const idSet = new Set(ids)
      return {
        nodes: state.nodes.filter((n) => !idSet.has(n.id)),
        edges: state.edges.filter((e) => !idSet.has(e.source) && !idSet.has(e.target)),
        selectedNodeId: idSet.has(state.selectedNodeId ?? '') ? null : state.selectedNodeId,
        selectedNodeIds: state.selectedNodeIds.filter((id) => !idSet.has(id)),
        history: pushHistory(state.history, state.nodes, state.edges),
        future: [],
      }
    }),

  deleteEdgesById: (ids) =>
    set((state) => {
      const idSet = new Set(ids)
      return {
        edges: state.edges.filter((e) => !idSet.has(e.id)),
        selectedEdgeId: idSet.has(state.selectedEdgeId ?? '') ? null : state.selectedEdgeId,
        history: pushHistory(state.history, state.nodes, state.edges),
        future: [],
      }
    }),

  selectedNodeId: null,
  setSelectedNodeId: (id) => set({ selectedNodeId: id }),
  selectedEdgeId: null,
  setSelectedEdgeId: (id) => set({ selectedEdgeId: id }),
  selectedNodeIds: [],
  setSelectedNodeIds: (ids) => set({ selectedNodeIds: ids }),

  updateNodeData: (nodeId, partial) =>
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, ...partial } } : n,
      ),
      history: pushHistory(state.history, state.nodes, state.edges),
      future: [],
    })),

  setWorkflowName: (name) =>
    set((state) => ({
      workflowName: name,
      tabs: state.tabs.map((t) =>
        t.id === state.activeTabId ? { ...t, workflowName: name } : t,
      ),
    })),

  dbId: undefined,
  setDbId: (id) =>
    set((state) => ({
      dbId: id,
      tabs: state.tabs.map((t) =>
        t.id === state.activeTabId ? { ...t, dbId: id } : t,
      ),
    })),

  executionState: 'idle',
  executionLog: [],
  setExecutionState: (executionState) => set({ executionState }),
  appendExecutionEvent: (event) =>
    set((state) => ({ executionLog: [...state.executionLog, event] })),
  clearExecutionLog: () => set({ executionLog: [] }),

  setNodeExecutionStatus: (nodeId, status, output) =>
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === nodeId
          ? {
              ...n,
              data: {
                ...n.data,
                executionStatus: status,
                ...(output !== undefined ? { executionOutput: output } : {}),
              },
            }
          : n,
      ),
    })),

  resetNodeExecutionStatuses: () =>
    set((state) => ({
      nodes: state.nodes.map((n) => ({
        ...n,
        data: { ...n.data, executionStatus: 'idle' as const, executionOutput: undefined },
      })),
    })),

  isLogPanelOpen: false,
  setLogPanelOpen: (open) => set({ isLogPanelOpen: open }),

  isConfigPanelOpen: true,
  setConfigPanelOpen: (open) => set({ isConfigPanelOpen: open }),

  isApiKeyModalOpen: false,
  setApiKeyModalOpen: (open) => set({ isApiKeyModalOpen: open }),

  pendingApproval: null,
  setPendingApproval: (approval) => set({ pendingApproval: approval }),

  currentRunId: null,
  setCurrentRunId: (id) => set({ currentRunId: id }),

  runHistory: [],
  setRunHistory: (runs) => set({ runHistory: runs }),

  saveStatus: 'idle',
  setSaveStatus: (saveStatus) => set({ saveStatus }),

  loadWorkflow: (ast, dbId) => {
    const s = get()
    const snapshot = astToSnapshot(ast, dbId)
    set({
      ...snapshot,
      saveStatus: 'idle',
      tabs: s.tabs.map((t) =>
        t.id === s.activeTabId ? { ...t, workflowName: ast.name, dbId } : t,
      ),
    })
  },

  importWorkflowVersion: (rawNodes, rawEdges) =>
    set((state) => {
      if (!state.tabs.find((t) => t.id === state.activeTabId)) return {}
      // Map raw AST nodes → FlowNode shape (same as loadWorkflow does)
      const nodes: FlowNode[] = (rawNodes as Array<{ id: string; type: string; position: { x: number; y: number }; data: FlowNodeData }>).map((n) => ({
        id: n.id,
        type: n.type,
        position: n.position,
        data: n.data,
      }))
      const edges: FlowEdge[] = (rawEdges as Array<{ id: string; source: string; target: string; sourceHandle?: string | null; targetHandle?: string | null }>).map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        ...(e.sourceHandle != null ? { sourceHandle: e.sourceHandle } : {}),
        ...(e.targetHandle != null ? { targetHandle: e.targetHandle } : {}),
      }))
      return {
        nodes,
        edges,
        history: pushHistory(state.history, state.nodes, state.edges),
        future: [],
        selectedNodeId: null,
      }
    }),

  versionsOpen: false,
  setVersionsOpen: (open) => set({ versionsOpen: open }),

  applyPatch: (ops) =>
    set((state) => {
      let nodes = [...state.nodes]
      let edges = [...state.edges]

      for (const op of ops) {
        switch (op.op) {
          case 'add_node': {
            const n = op.node as { id: string; type: string; position: { x: number; y: number }; data: FlowNodeData }
            if (!nodes.find((x) => x.id === n.id)) nodes = [...nodes, { id: n.id, type: n.type, position: n.position, data: n.data }]
            break
          }
          case 'remove_node':
            nodes = nodes.filter((n) => n.id !== op.node_id)
            edges = edges.filter((e) => e.source !== op.node_id && e.target !== op.node_id)
            break
          case 'add_edge': {
            const e = op.edge as { id: string; source: string; target: string; sourceHandle?: string; targetHandle?: string }
            if (!edges.find((x) => x.id === e.id)) edges = [...edges, { id: e.id, source: e.source, target: e.target, ...(e.sourceHandle ? { sourceHandle: e.sourceHandle } : {}), ...(e.targetHandle ? { targetHandle: e.targetHandle } : {}) }]
            break
          }
          case 'remove_edge':
            edges = edges.filter((e) => e.id !== op.edge_id)
            break
          case 'update_node':
            nodes = nodes.map((n) => n.id === op.node_id ? { ...n, data: { ...n.data, ...op.data } } : n)
            break
        }
      }

      return {
        nodes,
        edges,
        history: pushHistory(state.history, state.nodes, state.edges),
        future: [],
      }
    }),
}))
