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
import { buildDemoWorkflow } from '@/lib/demoWorkflow'

// ── Tab types ────────────────────────────────────────────────

export interface TabMeta {
  id: string
  workflowName: string
}

export interface TabSnapshot {
  workflowName: string
  nodes: FlowNode[]
  edges: FlowEdge[]
  selectedNodeId: string | null
  executionState: ExecutionState
  executionLog: ExecutionEvent[]
  isLogPanelOpen: boolean
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
  importWorkflowAsNewTab: (ast: WorkflowAST) => void

  // ── Active tab state (flat; all existing consumers unchanged) ──
  nodes: FlowNode[]
  edges: FlowEdge[]
  onNodesChange: (changes: NodeChange<FlowNode>[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  onConnect: (connection: Connection) => void
  addNode: (node: FlowNode) => void
  deleteNodesById: (ids: string[]) => void

  selectedNodeId: string | null
  setSelectedNodeId: (id: string | null) => void

  updateNodeData: (nodeId: string, partial: Partial<FlowNodeData>) => void

  workflowName: string
  setWorkflowName: (name: string) => void

  executionState: ExecutionState
  executionLog: ExecutionEvent[]
  setExecutionState: (state: ExecutionState) => void
  appendExecutionEvent: (event: ExecutionEvent) => void
  clearExecutionLog: () => void

  setNodeExecutionStatus: (
    nodeId: string,
    status: 'idle' | 'running' | 'completed' | 'error',
    output?: string,
  ) => void
  resetNodeExecutionStatuses: () => void

  isLogPanelOpen: boolean
  setLogPanelOpen: (open: boolean) => void

  // ── Global UI (not per-tab) ──
  isApiKeyModalOpen: boolean
  setApiKeyModalOpen: (open: boolean) => void
}

// ── Helpers ──────────────────────────────────────────────────

function snap(s: WorkflowStore): TabSnapshot {
  return {
    workflowName: s.workflowName,
    nodes: s.nodes,
    edges: s.edges,
    selectedNodeId: s.selectedNodeId,
    executionState: s.executionState,
    executionLog: s.executionLog,
    isLogPanelOpen: s.isLogPanelOpen,
  }
}

function astToSnapshot(ast: WorkflowAST): TabSnapshot {
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
    nodes,
    edges,
    selectedNodeId: null,
    executionState: 'idle',
    executionLog: [],
    isLogPanelOpen: false,
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
      ...buildDemoWorkflow(),
      selectedNodeId: null,
      executionState: 'idle',
      executionLog: [],
      isLogPanelOpen: false,
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

  importWorkflowAsNewTab: (ast) => {
    const s = get()
    const newId = crypto.randomUUID()
    const target = astToSnapshot(ast)
    set({
      snapshots: { ...s.snapshots, [s.activeTabId]: snap(s) },
      tabs: [...s.tabs, { id: newId, workflowName: target.workflowName }],
      activeTabId: newId,
      ...target,
    })
  },

  // Active tab state
  ...demo,
  workflowName: 'Blog Post Pipeline',

  onNodesChange: (changes) =>
    set((state) => ({ nodes: applyNodeChanges(changes, state.nodes) })),

  onEdgesChange: (changes) =>
    set((state) => ({ edges: applyEdgeChanges(changes, state.edges) })),

  onConnect: (connection) =>
    set((state) => ({ edges: addEdge(connection, state.edges) })),

  addNode: (node) =>
    set((state) => ({ nodes: [...state.nodes, node] })),

  deleteNodesById: (ids) =>
    set((state) => {
      const idSet = new Set(ids)
      return {
        nodes: state.nodes.filter((n) => !idSet.has(n.id)),
        edges: state.edges.filter((e) => !idSet.has(e.source) && !idSet.has(e.target)),
        selectedNodeId: idSet.has(state.selectedNodeId ?? '') ? null : state.selectedNodeId,
      }
    }),

  selectedNodeId: null,
  setSelectedNodeId: (id) => set({ selectedNodeId: id }),

  updateNodeData: (nodeId, partial) =>
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, ...partial } } : n,
      ),
    })),

  setWorkflowName: (name) =>
    set((state) => ({
      workflowName: name,
      tabs: state.tabs.map((t) =>
        t.id === state.activeTabId ? { ...t, workflowName: name } : t,
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

  isApiKeyModalOpen: false,
  setApiKeyModalOpen: (open) => set({ isApiKeyModalOpen: open }),
}))
