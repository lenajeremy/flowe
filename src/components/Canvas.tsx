import { useCallback, useMemo, useEffect } from 'react'
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  useReactFlow,
  type Node,
  type Edge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { nodeTypes } from './nodes'
import { GradientEdge } from './GradientEdge'
import { CanvasControls } from './CanvasControls'
import { useWorkflowStore } from '@/store/workflowStore'
import { useWatchStores } from '@/lib/dataLive'
import { useShallow } from 'zustand/react/shallow'
import { getDefaultNodeData } from '@/lib/nodeDefaults'
import { NODE_ACCENT_HEX } from '@/lib/nodeColors'
import type { NodeType, FlowEdge } from '@/types/workflow'
import { derivePath, edgePathState, nodePathState, isEmptyPath } from '@/lib/runLog'
import posthog from '@/lib/posthog'

// Must be defined at module scope — never inside a component body
const edgeTypes = { gradient: GradientEdge }

/** BFS to collect nodeId + every node reachable downstream via edges */
function getDownstreamIds(startId: string, edges: FlowEdge[]): string[] {
  const visited = new Set<string>([startId])
  const queue = [startId]
  while (queue.length > 0) {
    const id = queue.shift()!
    for (const e of edges) {
      if (e.source === id && !visited.has(e.target)) {
        visited.add(e.target)
        queue.push(e.target)
      }
    }
  }
  return [...visited]
}

interface CanvasProps {
  theme: 'dark' | 'light'
}

export function Canvas({ theme }: CanvasProps) {
  const {
    nodes, edges,
    isPathMode, pathStep, pathEvents, executionLog,
    onNodesChange, onEdgesChange, onConnect,
    setSelectedNodeId, selectedNodeId, selectedNodeIds,
    selectedEdgeId, setSelectedEdgeId,
    setSelectedNodeIds,
    addNode, deleteNodesById, deleteEdgesById,
    executionState,
    undo, redo,
    setConfigPanelOpen,
    activeTool,
  } = useWorkflowStore(
    useShallow((s) => ({
      nodes: s.nodes,
      edges: s.edges,
      onNodesChange: s.onNodesChange,
      onEdgesChange: s.onEdgesChange,
      onConnect: s.onConnect,
      setSelectedNodeId: s.setSelectedNodeId,
      selectedNodeId: s.selectedNodeId,
      selectedNodeIds: s.selectedNodeIds,
      selectedEdgeId: s.selectedEdgeId,
      setSelectedEdgeId: s.setSelectedEdgeId,
      isPathMode: s.isPathMode,
      pathStep: s.pathStep,
      pathEvents: s.pathEvents,
      executionLog: s.executionLog,
      setSelectedNodeIds: s.setSelectedNodeIds,
      addNode: s.addNode,
      deleteNodesById: s.deleteNodesById,
      deleteEdgesById: s.deleteEdgesById,
      executionState: s.executionState,
      undo: s.undo,
      redo: s.redo,
      setConfigPanelOpen: s.setConfigPanelOpen,
      activeTool: s.activeTool,
    })),
  )

  const rfInstance = useReactFlow()
  const { setActiveTool } = useWorkflowStore(useShallow((s) => ({ setActiveTool: s.setActiveTool })))

  // Stream live values for every Data node on the board, so their cards show
  // what's actually stored — including writes from scheduled runs.
  useWatchStores(
    nodes
      .filter((n) => n.data?.nodeType === 'data')
      .map((n) => (typeof n.data?.dataStoreId === 'string' ? n.data.dataStoreId : ''))
      .filter(Boolean),
  )

  // ── Keyboard handler ─────────────────────────────────────
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const active = document.activeElement as HTMLElement | null
      const tag = active?.tagName
      // isContentEditable covers the TemplateField divs — without it, Backspace
      // while typing in one would fall through and delete the selected node.
      const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || !!active?.isContentEditable

      if (!inInput && e.key === 'v') { setActiveTool('select'); return }
      if (!inInput && e.key === 'h') { setActiveTool('hand'); return }

      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        if (inInput) return
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
        return
      }

      if (e.key !== 'Delete' && e.key !== 'Backspace') return
      if (inInput) return
      e.preventDefault()

      if (selectedEdgeId) {
        deleteEdgesById([selectedEdgeId])
        return
      }
      const ids = selectedNodeIds.length > 0
        ? selectedNodeIds
        : selectedNodeId ? [selectedNodeId] : []
      if (ids.length === 0) return
      if (e.shiftKey && ids.length === 1) {
        deleteNodesById(getDownstreamIds(ids[0], edges))
      } else {
        deleteNodesById(ids)
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [edges, selectedNodeId, selectedNodeIds, selectedEdgeId, deleteNodesById, deleteEdgesById, undo, redo, setActiveTool])

  // A run with no path events at all is one from before this existed, or a
  // single-node test. Overlaying it would grey out the whole graph and claim
  // nothing ran, so the overlay stays off rather than lying.
  const runPath = useMemo(
    () => derivePath(pathEvents ?? executionLog),
    [pathEvents, executionLog],
  )
  const pathActive = isPathMode && !isEmptyPath(runPath)

  // ── Gradient edges — Figma frames 161-168: fade into the target's accent ──
  const animatedEdges = useMemo(
    () => edges.map((e) => {
      const targetNode = nodes.find((n) => n.id === e.target)
      const accent = targetNode ? NODE_ACCENT_HEX[targetNode.data.nodeType] : '#70f17b'
      const pathState = pathActive ? edgePathState(runPath, e, pathStep) : undefined
      return {
        ...e,
        type: 'gradient',
        data: {
          ...e.data,
          accent,
          pathState,
          // The branch output that chose this edge, surfaced on the edge itself
          // — which is where "why did it go this way" is actually asked.
          verdict: pathState === 'taken' ? runPath.taken.get(e.id) || undefined : undefined,
        },
        animated: executionState === 'running' && pathState !== 'skipped',
        selected: e.id === selectedEdgeId,
      }
    }),
    [edges, nodes, executionState, selectedEdgeId, pathActive, runPath, pathStep],
  )

  // Node dimming rides on the React Flow wrapper's className rather than a prop
  // threaded through forty node components.
  const pathNodes = useMemo(
    () => (pathActive
      ? nodes.map((n) => ({ ...n, className: `path-${nodePathState(runPath, n.id, pathStep)}` }))
      : nodes),
    [nodes, pathActive, runPath, pathStep],
  )

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      setSelectedNodeId(node.id)
      setSelectedEdgeId(null)
      setConfigPanelOpen(true)
    },
    [setSelectedNodeId, setSelectedEdgeId, setConfigPanelOpen],
  )

  const onEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: Edge) => {
      setSelectedEdgeId(edge.id)
      setSelectedNodeId(null)
      setConfigPanelOpen(false)
    },
    [setSelectedEdgeId, setSelectedNodeId, setConfigPanelOpen],
  )

  const onSelectionChange = useCallback(
    ({ nodes: selectedNodes }: { nodes: Node[] }) => {
      const ids = selectedNodes.map((n) => n.id)
      setSelectedNodeIds(ids)
      if (ids.length !== 1) {
        setSelectedNodeId(null)
        setConfigPanelOpen(false)
      }
    },
    [setSelectedNodeIds, setSelectedNodeId, setConfigPanelOpen],
  )

  const onPaneClick = useCallback(
    () => {
      setSelectedNodeId(null)
      setSelectedEdgeId(null)
      setSelectedNodeIds([])
      setConfigPanelOpen(false)
    },
    [setSelectedNodeId, setSelectedEdgeId, setSelectedNodeIds, setConfigPanelOpen],
  )

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
  }, [])

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      const type = event.dataTransfer.getData('application/flowe-node-type') as NodeType
      if (!type) return
      const position = rfInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY })
      const nodeId = crypto.randomUUID()
      addNode({ id: nodeId, type, position, data: getDefaultNodeData(type) })
      posthog.capture('workflow_node_added', { node_type: type })
      setSelectedNodeId(nodeId)
    },
    [rfInstance, addNode, setSelectedNodeId],
  )

  return (
    <div className="relative h-full flex-1 overflow-hidden">
      <ReactFlow
        nodes={pathNodes}
        edges={animatedEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        onSelectionChange={onSelectionChange}
        onDrop={onDrop}
        onDragOver={onDragOver}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={5}
        connectionLineStyle={{ stroke: 'var(--color-accent)', strokeWidth: 3 }}
        connectionRadius={40}
        deleteKeyCode={null}
        panOnDrag={activeTool === 'hand' ? true : [1, 2]}
        selectionOnDrag={activeTool === 'select'}
        selectionMode={'partial' as never}
        panOnScroll={false}
        colorMode={theme}
        style={{ background: 'var(--color-canvas)', cursor: activeTool === 'hand' ? 'grab' : 'default' }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="var(--color-canvas-dot)"
        />
      </ReactFlow>

      {/* Bottom-left zoom / tool cluster — Figma frames 160-168 */}
      <CanvasControls />
    </div>
  )
}
