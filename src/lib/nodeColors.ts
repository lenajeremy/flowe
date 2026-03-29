import type { NodeType } from '@/types/workflow'

export const NODE_ACCENT_COLORS: Record<NodeType, string> = {
  textInput:  'var(--color-node-input)',
  imageInput: 'var(--color-node-input)',
  llm:        'var(--color-node-llm)',
  branch:     'var(--color-node-branch)',
  loop:       'var(--color-node-loop)',
  textOutput: 'var(--color-node-output)',
}

export const NODE_ACCENT_HEX: Record<NodeType, string> = {
  textInput:  '#64748b',
  imageInput: '#64748b',
  llm:        '#3b82f6',
  branch:     '#f59e0b',
  loop:       '#8b5cf6',
  textOutput: '#10b981',
}

export const NODE_LABELS: Record<NodeType, string> = {
  textInput:  'Text Input',
  imageInput: 'Image Input',
  llm:        'LLM',
  branch:     'Branch',
  loop:       'Loop',
  textOutput: 'Text Output',
}

export const NODE_DESCRIPTIONS: Record<NodeType, string> = {
  textInput:  'Static text source',
  imageInput: 'Image URL source',
  llm:        'AI model call',
  branch:     'Conditional fork',
  loop:       'Iterate over list',
  textOutput: 'Display result',
}
