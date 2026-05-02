import { useState } from 'react'
import type { ReactNode } from 'react'
import { useReactFlow } from '@xyflow/react'
import { useShallow } from 'zustand/react/shallow'
import { getDefaultNodeData } from '@/lib/nodeDefaults'
import { useWorkflowStore } from '@/store/workflowStore'
import type { NodeType, FlowNodeData } from '@/types/workflow'

type Tool = {
  id: string
  label: string
  title: string
  icon: ReactNode
  nodeType?: NodeType
  data?: Partial<FlowNodeData>
}

function PointerIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M4 2.5l9.5 8-4.7.8-2 4.2L4 2.5z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  )
}

function TriggerIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M4 3.5h4.5l1.5 2H14v9H4v-11z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M7 9h4M9 7v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function DatabaseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <ellipse cx="9" cy="4.5" rx="5" ry="2.2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4 4.5v8c0 1.2 2.2 2.2 5 2.2s5-1 5-2.2v-8M4 8.5c0 1.2 2.2 2.2 5 2.2s5-1 5-2.2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

function AiIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M9 2.5l1.2 3.3L13.5 7l-3.3 1.2L9 11.5 7.8 8.2 4.5 7l3.3-1.2L9 2.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M13.3 11.2l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6.6-1.4z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  )
}

function BranchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M5 4v3.5A3.5 3.5 0 0 0 8.5 11H13M5 7.5A3.5 3.5 0 0 1 8.5 4H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12 2.5L14.5 4 12 5.5M12 9.5l2.5 1.5-2.5 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function LoopIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M5 6.5h6.5a2.5 2.5 0 0 1 0 5H6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M7 4.5L5 6.5l2 2M11 9.5l2 2-2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ActionIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M3.5 9h7M8.5 5l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13.5 4.5h1v9h-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function ReportIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M5 2.8h5l3 3v9.4H5V2.8z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M10 3v3h3M7 9h4M7 12h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

function CodeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M6.5 5L3 9l3.5 4M11.5 5L15 9l-3.5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const TOOLS: Tool[] = [
  { id: 'select', label: 'Select', title: 'Select and move workflow nodes', icon: <PointerIcon /> },
  {
    id: 'trigger',
    label: 'Trigger',
    title: 'Add a workflow trigger payload',
    icon: <TriggerIcon />,
    nodeType: 'textInput',
    data: { label: 'Trigger Payload', defaultValue: '{\n  "source": "api",\n  "leadId": "lead_123"\n}' },
  },
  {
    id: 'data',
    label: 'Data',
    title: 'Add a data source step',
    icon: <DatabaseIcon />,
    nodeType: 'textInput',
    data: { label: 'Data Source', defaultValue: 'customer, account, documents, or table row' },
  },
  { id: 'ai', label: 'AI', title: 'Add an AI model step', icon: <AiIcon />, nodeType: 'llm' },
  { id: 'branch', label: 'Branch', title: 'Add a decision branch', icon: <BranchIcon />, nodeType: 'branch' },
  { id: 'loop', label: 'Loop', title: 'Add a loop over a list', icon: <LoopIcon />, nodeType: 'loop' },
  {
    id: 'action',
    label: 'Action',
    title: 'Add an action output step',
    icon: <ActionIcon />,
    nodeType: 'textOutput',
    data: { label: 'Action Result' },
  },
  {
    id: 'report',
    label: 'Report',
    title: 'Add a report output step',
    icon: <ReportIcon />,
    nodeType: 'textOutput',
    data: { label: 'Generated Report' },
  },
  {
    id: 'code',
    label: 'API',
    title: 'Add a code/API trigger note',
    icon: <CodeIcon />,
    nodeType: 'textInput',
    data: { label: 'API Trigger', defaultValue: 'workflowClient.trigger("workflow-slug", { input })' },
  },
]

export function BottomToolDock() {
  const [activeTool, setActiveTool] = useState('select')
  const rfInstance = useReactFlow()
  const { addNode, setSelectedNodeId, setConfigPanelOpen, nodes } = useWorkflowStore(
    useShallow((s) => ({
      addNode: s.addNode,
      setSelectedNodeId: s.setSelectedNodeId,
      setConfigPanelOpen: s.setConfigPanelOpen,
      nodes: s.nodes,
    })),
  )

  function addToolNode(tool: Tool) {
    setActiveTool(tool.id)
    if (!tool.nodeType) return

    const bounds = document.querySelector('.react-flow')?.getBoundingClientRect()
    const center = {
      x: (bounds?.left ?? 0) + (bounds?.width ?? window.innerWidth) / 2,
      y: (bounds?.top ?? 0) + (bounds?.height ?? window.innerHeight) / 2,
    }
    const position = rfInstance.screenToFlowPosition(center)
    const offset = (nodes.length % 5) * 28
    const nodeId = crypto.randomUUID()

    addNode({
      id: nodeId,
      type: tool.nodeType,
      position: { x: position.x + offset - 130, y: position.y + offset - 72 },
      data: { ...getDefaultNodeData(tool.nodeType), ...tool.data },
    })
    setSelectedNodeId(nodeId)
    setConfigPanelOpen(true)
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-5 z-40 flex justify-center px-4">
      <div className="pointer-events-auto flex max-w-[calc(100vw-2rem)] items-center gap-1 overflow-x-auto rounded-[14px] border border-[var(--color-border)] bg-[var(--color-elevated)]/95 p-1.5 shadow-[var(--dock-shadow)] backdrop-blur">
        {TOOLS.map((tool, index) => {
          const isActive = activeTool === tool.id
          return (
            <button
              key={tool.id}
              type="button"
              onClick={() => addToolNode(tool)}
              title={tool.title}
              aria-label={tool.title}
              className={`flex h-10 min-w-10 items-center justify-center gap-1.5 rounded-[8px] px-2.5 text-[11px] font-medium transition-colors ${
                isActive
                  ? 'bg-[var(--color-accent)] text-white'
                  : 'text-[var(--color-text)] hover:bg-[var(--color-surface2)]'
              } ${index === 6 ? 'ml-2 border-l border-[var(--color-border)] pl-4' : ''}`}
            >
              {tool.icon}
              <span className="hidden sm:inline">{tool.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
