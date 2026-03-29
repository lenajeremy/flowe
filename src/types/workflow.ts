import type { Node, Edge } from '@xyflow/react'

// ── Node Types ──────────────────────────────────────────────
export type NodeType =
  | 'textInput'
  | 'imageInput'
  | 'llm'
  | 'branch'
  | 'loop'
  | 'textOutput'

export type ExecutionStatus = 'idle' | 'running' | 'completed' | 'error'

export type LLMModel =
  | 'gpt-4o'
  | 'gpt-4o-mini'
  | 'claude-opus-4-5'
  | 'claude-sonnet-4-5'
  | 'claude-haiku-4-5'

/**
 * Flat node data type that satisfies Record<string, unknown> for @xyflow/react.
 * All optional fields are present on every node; nodeType discriminant
 * determines which fields are "active".
 */
export type FlowNodeData = {
  nodeType: NodeType
  label: string
  executionStatus?: ExecutionStatus
  executionOutput?: string

  // TextInput
  defaultValue?: string

  // ImageInput
  imageUrl?: string

  // LLM
  model?: LLMModel
  systemPrompt?: string
  userPrompt?: string
  temperature?: number
  maxTokens?: number

  // Branch
  condition?: string

  // Loop
  loopOverField?: string
  mode?: 'sequential' | 'concurrent'

  // Index signature — required by @xyflow/react Node<Data> constraint
  [key: string]: unknown
}

export type FlowNode = Node<FlowNodeData>
export type FlowEdge = Edge

// ── Workflow AST ────────────────────────────────────────────
export interface WorkflowAST {
  version: '1.0'
  name: string
  nodes: WorkflowASTNode[]
  edges: WorkflowASTEdge[]
  createdAt: string
}

export interface WorkflowASTNode {
  id: string
  type: NodeType
  position: { x: number; y: number }
  data: FlowNodeData
}

export interface WorkflowASTEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string | null
  targetHandle?: string | null
}

// ── Execution ───────────────────────────────────────────────
export type ExecutionState = 'idle' | 'running' | 'completed' | 'error'

export type ExecutionEventType =
  | 'workflow_started'
  | 'node_started'
  | 'node_output'
  | 'node_completed'
  | 'node_error'
  | 'workflow_completed'
  | 'workflow_error'

export interface ExecutionEvent {
  id: string
  type: ExecutionEventType
  nodeId?: string
  nodeLabel?: string
  nodeType?: NodeType
  message: string
  output?: string
  timestamp: number
}
