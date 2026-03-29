import { useCallback, useMemo, useEffect } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  BackgroundVariant,
  useReactFlow,
  type Node,
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

export function Canvas() {
  const {
    nodes, edges,
    onNodesChange, onEdgesChange, onConnect,
    setSelectedNodeId, selectedNodeId,
    addNode, deleteNodesById,
    executionState,
  } = useWorkflowStore(
    useShallow((s) => ({
      nodes: s.nodes,  // still needed for animatedEdges + MiniMap
      edges: s.edges,
      onNodesChange: s.onNodesChange,
      onEdgesChange: s.onEdgesChange,
      onConnect: s.onConnect,
      setSelectedNodeId: s.setSelectedNodeId,
      selectedNodeId: s.selectedNodeId,
      addNode: s.addNode,
      deleteNodesById: s.deleteNodesById,
      executionState: s.executionState,
    })),
  )

  const rfInstance = useReactFlow()

  // ── Delete key handler ────────────────────────────────────
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Delete') return
      // Don't fire while typing in form inputs
      const tag = (document.activeElement as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      e.preventDefault()

      if (!selectedNodeId) return

      if (e.shiftKey) {
        // Shift+Delete: delete selected node + all downstream nodes
        deleteNodesById(getDownstreamIds(selectedNodeId, edges))
      } else {
        // Delete: remove the selected node (and its edges)
        deleteNodesById([selectedNodeId])
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [edges, selectedNodeId, deleteNodesById])

  // ── Animated edges ────────────────────────────────────────
  const animatedEdges = useMemo(
    () => edges.map((e) => ({ ...e, animated: executionState === 'running' })),
    [edges, executionState],
  )

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => setSelectedNodeId(node.id),
    [setSelectedNodeId],
  )

  const onPaneClick = useCallback(
    () => setSelectedNodeId(null),
    [setSelectedNodeId],
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
    <div className="flex-1 relative overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={animatedEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onDrop={onDrop}
        onDragOver={onDragOver}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        deleteKeyCode={null}
        colorMode="dark"
        style={{ background: '#0a0a0f' }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#2a2a3a" />
        <Controls />
      </ReactFlow>
    </div>
  )
}
