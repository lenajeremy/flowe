import type { NodeType, FlowNodeData } from '@/types/workflow'

export function getDefaultNodeData(type: NodeType): FlowNodeData {
  switch (type) {
    case 'textInput':
      return { nodeType: 'textInput', label: 'Text Input', defaultValue: '' }
    case 'imageInput':
      return { nodeType: 'imageInput', label: 'Image Input', imageUrl: '' }
    case 'llm':
      return {
        nodeType: 'llm',
        label: 'LLM',
        model: 'gpt-4o',
        systemPrompt: 'You are a helpful assistant.',
        userPrompt: '{{previousNode.output}}',
        temperature: 0.7,
        maxTokens: 1024,
      }
    case 'branch':
      return { nodeType: 'branch', label: 'Branch', condition: '' }
    case 'loop':
      return { nodeType: 'loop', label: 'Loop', loopOverField: 'output.items', mode: 'sequential' }
    case 'textOutput':
      return { nodeType: 'textOutput', label: 'Text Output' }
  }
}
