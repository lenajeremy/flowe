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
import { useWorkflowStore } from '@/store/workflowStore'
import { useShallow } from 'zustand/react/shallow'
import { getDefaultNodeData } from '@/lib/nodeDefaults'
import type { NodeType, FlowEdge } from '@/types/workflow'

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
    onNodesChange, onEdgesChange, onConnect,
    setSelectedNodeId, selectedNodeId,
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
      selectedEdgeId: s.selectedEdgeId,
      setSelectedEdgeId: s.setSelectedEdgeId,
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

  // ── Keyboard handler ─────────────────────────────────────
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (document.activeElement as HTMLElement)?.tagName
      const inInput = tag === 'INPUT' || tag === 'TEXTAREA'

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
      if (!selectedNodeId) return
      if (e.shiftKey) {
        deleteNodesById(getDownstreamIds(selectedNodeId, edges))
      } else {
        deleteNodesById([selectedNodeId])
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [edges, selectedNodeId, selectedEdgeId, deleteNodesById, deleteEdgesById, undo, redo])

  // ── Animated edges ────────────────────────────────────────
  const animatedEdges = useMemo(
    () => edges.map((e) => ({
      ...e,
      animated: executionState === 'running',
      selected: e.id === selectedEdgeId,
      style: e.id === selectedEdgeId
        ? { stroke: 'var(--color-accent)', strokeWidth: 2 }
        : undefined,
    })),
    [edges, executionState, selectedEdgeId],
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
    },
    [setSelectedEdgeId, setSelectedNodeId],
  )

  const onSelectionChange = useCallback(
    ({ nodes: selectedNodes }: { nodes: Node[] }) => {
      const ids = selectedNodes.map((n) => n.id)
      setSelectedNodeIds(ids)
      if (ids.length !== 1) setSelectedNodeId(null)
    },
    [setSelectedNodeIds, setSelectedNodeId],
  )

  const onPaneClick = useCallback(
    () => {
      setSelectedNodeId(null)
      setSelectedEdgeId(null)
      setSelectedNodeIds([])
    },
    [setSelectedNodeId, setSelectedEdgeId, setSelectedNodeIds],
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
      setSelectedNodeId(nodeId)
    },
    [rfInstance, addNode, setSelectedNodeId],
  )

  return (
    <div className="relative h-full flex-1 overflow-hidden">
      <ReactFlow
        nodes={nodes}
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
        fitView
        fitViewOptions={{ padding: 0.2 }}
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
          color={theme === 'dark' ? '#3a3a3a' : '#d8d8d8'}
        />
      </ReactFlow>
    </div>
  )
}
