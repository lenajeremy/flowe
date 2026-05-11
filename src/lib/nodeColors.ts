import type { NodeType } from '@/types/workflow'

export const NODE_ACCENT_COLORS: Record<NodeType, string> = {
  textInput:        'var(--color-node-input)',
  imageInput:       'var(--color-node-input)',
  llm:              'var(--color-node-llm)',
  branch:           'var(--color-node-branch)',
  loop:             'var(--color-node-loop)',
  textOutput:       'var(--color-node-output)',
  httpRequest:      '#06b6d4',
  emailSend:        '#f97316',
  humanApproval:    '#ec4899',
  webhookTrigger:   '#10b981',
  scheduledTrigger: '#a855f7',
}

// Hex values matching the CSS vars above
export const NODE_ACCENT_HEX: Record<NodeType, string> = {
  textInput:        '#64748b',
  imageInput:       '#64748b',
  llm:              '#0d99ff',
  branch:           '#f59e0b',
  loop:             '#9b6bff',
  textOutput:       '#14ae5c',
  httpRequest:      '#06b6d4',
  emailSend:        '#f97316',
  humanApproval:    '#ec4899',
  webhookTrigger:   '#10b981',
  scheduledTrigger: '#a855f7',
}

// SVG path data for node icons (16×16 viewBox, stroke-only)
export const NODE_ICON_PATHS: Record<NodeType, string> = {
  textInput:        'M2 5h12M2 8.5h9M2 12h7',
  imageInput:       'M2 3.5h12v9H2zM2 9.5l3.5-3.5 3 3 2-2 3.5 3.5',
  llm:              'M8 2v3M8 11v3M2 8h3M11 8h3M4.2 4.2l2.1 2.1M9.7 9.7l2.1 2.1M11.8 4.2l-2.1 2.1M6.3 9.7l-2.1 2.1',
  branch:           'M8 2v5M8 7l-3.5 6M8 7l3.5 6',
  loop:             'M13.5 8A5.5 5.5 0 102.5 8M2.5 8l-2 2.5M2.5 8l2.5 2M13.5 8l2-2.5M13.5 8l-2.5-2',
  textOutput:       'M2 5h8M2 8.5h6M9.5 12h4.5M11.5 10l2 2-2 2',
  httpRequest:      'M2 8h12M10 5l4 3-4 3M8 3.5A4.5 4.5 0 118 12.5',
  emailSend:        'M2 4.5h12v7H2zM2 4.5l6 5 6-5',
  humanApproval:    'M8 2a2.5 2.5 0 100 5 2.5 2.5 0 000-5zM3 14c0-2.8 2.2-5 5-5s5 2.2 5 5M10.5 9.5l1.5 1.5 3-3',
  webhookTrigger:   'M2 8c0-3.3 2.7-6 6-6s6 2.7 6 6-2.7 6-6 6M8 5v3l2 2M14 2l-2.5 2.5',
  scheduledTrigger: 'M8 2a6 6 0 100 12A6 6 0 008 2zM8 5v3l2.5 1.5',
}

export const NODE_LABELS: Record<NodeType, string> = {
  textInput:        'Text Input',
  imageInput:       'Image Input',
  llm:              'LLM',
  branch:           'Branch',
  loop:             'Loop',
  textOutput:       'Text Output',
  httpRequest:      'HTTP Request',
  emailSend:        'Send Email',
  humanApproval:    'Human Approval',
  webhookTrigger:   'Webhook Trigger',
  scheduledTrigger: 'Scheduled Trigger',
}

export const NODE_DESCRIPTIONS: Record<NodeType, string> = {
  textInput:        'Static text source',
  imageInput:       'Image URL source',
  llm:              'AI model call',
  branch:           'Conditional fork',
  loop:             'Iterate over list',
  textOutput:       'Display result',
  httpRequest:      'Fetch data from any URL',
  emailSend:        'Send email via SendGrid',
  humanApproval:    'Wait for human review',
  webhookTrigger:   'Trigger via HTTP webhook',
  scheduledTrigger: 'Run on a schedule',
}
