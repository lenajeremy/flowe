import type { NodeType } from '@/types/workflow'

export const NODE_ACCENT_COLORS: Record<NodeType, string> = {
  textInput:  'var(--color-node-input)',
  imageInput: 'var(--color-node-input)',
  llm:        'var(--color-node-llm)',
  branch:     'var(--color-node-branch)',
  loop:       'var(--color-node-loop)',
  textOutput: 'var(--color-node-output)',
}

// Hex values matching the CSS vars above
export const NODE_ACCENT_HEX: Record<NodeType, string> = {
  textInput:  '#64748b',
  imageInput: '#64748b',
  llm:        '#0d99ff',
  branch:     '#f59e0b',
  loop:       '#9b6bff',
  textOutput: '#14ae5c',
}

// SVG path data for node icons (16×16 viewBox, stroke-only)
export const NODE_ICON_PATHS: Record<NodeType, string> = {
  textInput:  'M2 5h12M2 8.5h9M2 12h7',
  imageInput: 'M2 3.5h12v9H2zM2 9.5l3.5-3.5 3 3 2-2 3.5 3.5',
  llm:        'M8 2v3M8 11v3M2 8h3M11 8h3M4.2 4.2l2.1 2.1M9.7 9.7l2.1 2.1M11.8 4.2l-2.1 2.1M6.3 9.7l-2.1 2.1',
  branch:     'M8 2v5M8 7l-3.5 6M8 7l3.5 6',
  loop:       'M13.5 8A5.5 5.5 0 102.5 8M2.5 8l-2 2.5M2.5 8l2.5 2M13.5 8l2-2.5M13.5 8l-2.5-2',
  textOutput: 'M2 5h8M2 8.5h6M9.5 12h4.5M11.5 10l2 2-2 2',
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
