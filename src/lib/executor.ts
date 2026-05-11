import type {
  FlowNode,
  FlowEdge,
  NodeType,
  ExecutionState,
  ExecutionEvent,
  WorkflowAST,
  WorkflowASTNode,
  WorkflowASTEdge,
} from '@/types/workflow'
import { getApiKeys, isAnthropicModel } from '@/lib/apiKeys'

export interface ExecutorStore {
  nodes: FlowNode[]
  edges: FlowEdge[]
  workflowName: string
  setExecutionState: (s: ExecutionState) => void
  appendExecutionEvent: (e: ExecutionEvent) => void
  setNodeExecutionStatus: (id: string, status: 'idle' | 'running' | 'completed' | 'error', output?: string) => void
  setLogPanelOpen: (open: boolean) => void
}

// ── Vision helpers ────────────────────────────────────────────

interface ImageRef {
  mediaType: string  // e.g. "image/jpeg"
  data: string       // raw base64 (no prefix)
}

/** Parse data URLs referenced in the prompt template, replace them with
 *  "[attached image]" in a local copy of outputs, and return extracted refs. */
function extractImageRefs(
  promptTemplate: string,
  outputs: Map<string, string>,
): { images: ImageRef[]; patchedOutputs: Map<string, string> } {
  const patched = new Map(outputs)
  const images: ImageRef[] = []
  const re = /\{\{([\w-]+)\.output\}\}/g
  let m: RegExpExecArray | null
  while ((m = re.exec(promptTemplate)) !== null) {
    const nodeId = m[1]
    const val = patched.get(nodeId) ?? ''
    if (!val.startsWith('data:image/')) continue
    // data:image/jpeg;base64,<data>
    const withoutScheme = val.slice('data:'.length)
    const sep = withoutScheme.indexOf(';base64,')
    if (sep === -1) continue
    images.push({ mediaType: withoutScheme.slice(0, sep), data: withoutScheme.slice(sep + ';base64,'.length) })
    patched.set(nodeId, '[attached image]')
  }
  return { images, patchedOutputs: patched }
}

// ── API calls ────────────────────────────────────────────────

async function callAnthropic(
  model: string,
  systemPrompt: string,
  userPrompt: string,
  temperature: number,
  maxTokens: number,
  apiKey: string,
  images: ImageRef[] = [],
): Promise<string> {
  type ContentBlock =
    | { type: 'text'; text: string }
    | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }

  const content: ContentBlock[] = [
    ...images.map((img): ContentBlock => ({
      type: 'image',
      source: { type: 'base64', media_type: img.mediaType, data: img.data },
    })),
    { type: 'text', text: userPrompt },
  ]

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-allow-browser': 'true',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature,
      system: systemPrompt,
      messages: [{ role: 'user', content: images.length > 0 ? content : userPrompt }],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Anthropic API error ${res.status}: ${err}`)
  }

  const json = await res.json() as {
    content: Array<{ type: string; text: string }>
  }
  return json.content.find((b) => b.type === 'text')?.text ?? ''
}

async function callOpenAI(
  model: string,
  systemPrompt: string,
  userPrompt: string,
  temperature: number,
  maxTokens: number,
  apiKey: string,
  images: ImageRef[] = [],
): Promise<string> {
  type OAIBlock =
    | { type: 'text'; text: string }
    | { type: 'image_url'; image_url: { url: string } }

  const userContent: string | OAIBlock[] = images.length > 0
    ? [
        ...images.map((img): OAIBlock => ({
          type: 'image_url',
          image_url: { url: `data:${img.mediaType};base64,${img.data}` },
        })),
        { type: 'text', text: userPrompt },
      ]
    : userPrompt

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`OpenAI API error ${res.status}: ${err}`)
  }

  const json = await res.json() as {
    choices: Array<{ message: { content: string } }>
  }
  return json.choices[0]?.message.content ?? ''
}

// ── Helpers ──────────────────────────────────────────────────

/** Replace {{nodeId.output}} tokens with actual node outputs.
 *  Node IDs can be UUIDs (contain hyphens), so the pattern uses [\w-]+ */
function substituteTemplates(text: string, outputs: Map<string, string>): string {
  return text.replace(/\{\{([\w-]+)\.output\}\}/g, (_match, nodeId: string) => {
    return outputs.get(nodeId) ?? `[no output from ${nodeId}]`
  })
}

/**
 * Evaluate a branch condition string against the upstream node's output.
 * The upstream output is available as `output` — parsed as JSON if possible.
 */
function evaluateBranchCondition(condition: string, upstreamOutput: string): 'true' | 'false' {
  try {
    let output: unknown = upstreamOutput
    try {
      output = JSON.parse(upstreamOutput)
    } catch {
      // keep as raw string
    }
    const result = new Function('output', `"use strict"; return Boolean(${condition})`)(output)
    return result ? 'true' : 'false'
  } catch {
    return 'false'
  }
}

/** Run a single node, returning its string output */
async function executeNode(
  node: FlowNode,
  outputs: Map<string, string>,
  edges: FlowEdge[],
): Promise<string> {
  const { data } = node

  switch (data.nodeType) {
    case 'textInput':
      return typeof data.defaultValue === 'string' && data.defaultValue
        ? data.defaultValue
        : '(empty text input)'

    case 'imageInput':
      return typeof data.imageUrl === 'string' && data.imageUrl
        ? data.imageUrl
        : '(no image)'

    case 'llm': {
      const model = typeof data.model === 'string' ? data.model : 'gpt-4o'
      const systemPrompt = substituteTemplates(
        typeof data.systemPrompt === 'string' ? data.systemPrompt : '',
        outputs,
      )
      const userPromptTemplate = typeof data.userPrompt === 'string' ? data.userPrompt : ''
      const { images, patchedOutputs } = extractImageRefs(userPromptTemplate, outputs)
      const userPrompt = substituteTemplates(userPromptTemplate, patchedOutputs)
      const temperature = typeof data.temperature === 'number' ? data.temperature : 0.7
      const maxTokens = typeof data.maxTokens === 'number' ? data.maxTokens : 1024
      const keys = getApiKeys()

      if (isAnthropicModel(model)) {
        if (!keys.anthropic) throw new Error('Anthropic API key not set. Click the key icon in the toolbar.')
        return callAnthropic(model, systemPrompt, userPrompt, temperature, maxTokens, keys.anthropic, images)
      } else {
        if (!keys.openai) throw new Error('OpenAI API key not set. Click the key icon in the toolbar.')
        return callOpenAI(model, systemPrompt, userPrompt, temperature, maxTokens, keys.openai, images)
      }
    }

    case 'branch': {
      const condition = typeof data.condition === 'string' ? data.condition : 'false'
      // Find the upstream node output (first incoming edge's source)
      const incomingEdge = edges.find((e) => e.target === node.id)
      const upstreamOutput = incomingEdge ? (outputs.get(incomingEdge.source) ?? '') : ''
      return evaluateBranchCondition(condition, upstreamOutput)
    }

    case 'loop':
      return 'Iterated sequentially.'

    case 'textOutput': {
      // Show the upstream node's output
      const incomingEdge = edges.find((e) => e.target === node.id)
      return incomingEdge ? (outputs.get(incomingEdge.source) ?? '(no input)') : '(no input)'
    }

    case 'httpRequest': {
      const method = typeof data.method === 'string' ? data.method : 'GET'
      const url = substituteTemplates(typeof data.url === 'string' ? data.url : '', outputs)
      let headers: Record<string, string> = {}
      try {
        headers = JSON.parse(typeof data.requestHeaders === 'string' ? data.requestHeaders : '{}')
      } catch {
        // ignore malformed headers
      }
      const body = (method === 'POST' || method === 'PUT' || method === 'PATCH')
        ? substituteTemplates(typeof data.requestBody === 'string' ? data.requestBody : '', outputs)
        : undefined
      const fetchOptions: RequestInit = {
        method,
        headers: { 'Content-Type': 'application/json', ...headers },
        ...(body ? { body } : {}),
      }
      const res = await fetch(url, fetchOptions)
      const text = await res.text()
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`)
      return text
    }

    case 'emailSend': {
      const emailTo = substituteTemplates(typeof data.emailTo === 'string' ? data.emailTo : '', outputs)
      const emailSubject = substituteTemplates(typeof data.emailSubject === 'string' ? data.emailSubject : '', outputs)
      const emailBody = substituteTemplates(typeof data.emailBody === 'string' ? data.emailBody : '', outputs)
      // In dev/browser mode, log and return a stub response
      console.info('[emailSend] dev mode — would send email', { to: emailTo, subject: emailSubject, body: emailBody })
      return `Email sent to ${emailTo}: "${emailSubject}"`
    }

    case 'humanApproval': {
      // In the browser executor, simulate an instant auto-approval stub
      // A real implementation would pause execution and wait for an external event
      return 'approved'
    }

    case 'webhookTrigger':
      return '{"trigger":"webhook"}'

    case 'scheduledTrigger':
      return `{"trigger":"scheduled","time":"${new Date().toISOString()}"}`

    case 'notion':
      return JSON.stringify({ status: 'ok', note: 'Notion operations run via backend. Use the Run button.' })

    case 'linear':
      return JSON.stringify({ status: 'ok', note: 'Linear operations run via backend. Use the Run button.' })
  }
}

// ── Topo sort ────────────────────────────────────────────────

function topoSort(nodes: FlowNode[], edges: FlowEdge[]): string[] {
  const inDegree = new Map<string, number>()
  const adj = new Map<string, string[]>()

  for (const n of nodes) {
    inDegree.set(n.id, 0)
    adj.set(n.id, [])
  }
  for (const e of edges) {
    adj.get(e.source)?.push(e.target)
    inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1)
  }

  const queue = nodes.filter((n) => (inDegree.get(n.id) ?? 0) === 0).map((n) => n.id)
  const result: string[] = []

  while (queue.length > 0) {
    const id = queue.shift()!
    result.push(id)
    for (const neighbor of adj.get(id) ?? []) {
      const deg = (inDegree.get(neighbor) ?? 1) - 1
      inDegree.set(neighbor, deg)
      if (deg === 0) queue.push(neighbor)
    }
  }

  for (const n of nodes) {
    if (!result.includes(n.id)) result.push(n.id)
  }
  return result
}

// ── Event helpers ────────────────────────────────────────────

let workflowStartTime = 0

function makeEvent(
  type: ExecutionEvent['type'],
  node?: FlowNode,
  output?: string,
  message?: string,
): ExecutionEvent {
  return {
    id: crypto.randomUUID(),
    type,
    nodeId: node?.id,
    nodeLabel: node?.data.label,
    nodeType: node?.data.nodeType as NodeType | undefined,
    message: message ?? (node ? node.data.label : 'Workflow'),
    output,
    timestamp: Date.now() - workflowStartTime,
  }
}

// ── Main entry ───────────────────────────────────────────────

export async function runWorkflow(store: ExecutorStore): Promise<void> {
  const { nodes, edges } = store
  workflowStartTime = Date.now()

  store.appendExecutionEvent(makeEvent('workflow_started', undefined, undefined, 'Workflow started'))

  const order = topoSort(nodes, edges)

  // Track enabled nodes (branch gates)
  const inDegreeMap = new Map<string, number>()
  for (const n of nodes) inDegreeMap.set(n.id, 0)
  for (const e of edges) inDegreeMap.set(e.target, (inDegreeMap.get(e.target) ?? 0) + 1)

  const enabled = new Set<string>(
    nodes.filter((n) => (inDegreeMap.get(n.id) ?? 0) === 0).map((n) => n.id),
  )

  const outputs = new Map<string, string>()

  for (const nodeId of order) {
    const node = nodes.find((n) => n.id === nodeId)
    if (!node || !enabled.has(nodeId)) continue

    store.setNodeExecutionStatus(nodeId, 'running')
    store.appendExecutionEvent(makeEvent('node_started', node))

    let output: string
    try {
      output = await executeNode(node, outputs, edges)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      store.setNodeExecutionStatus(nodeId, 'error', message)
      store.appendExecutionEvent(makeEvent('node_error', node, undefined, `Error: ${message}`))
      store.setExecutionState('error')
      store.appendExecutionEvent(makeEvent('workflow_error', undefined, undefined, `Workflow failed at "${node.data.label}"`))
      return
    }

    outputs.set(nodeId, output)
    store.appendExecutionEvent(makeEvent('node_output', node, output))
    store.setNodeExecutionStatus(nodeId, 'completed', output)
    store.appendExecutionEvent(makeEvent('node_completed', node, undefined, `${node.data.label} completed`))

    // Activate downstream nodes, respecting branch gates
    for (const edge of edges.filter((e) => e.source === nodeId)) {
      if (node.data.nodeType === 'branch') {
        if (edge.sourceHandle === output) enabled.add(edge.target)
      } else {
        enabled.add(edge.target)
      }
    }
  }

  store.setExecutionState('completed')
  store.appendExecutionEvent(makeEvent('workflow_completed', undefined, undefined, 'Workflow completed successfully'))
}

// ── Export ───────────────────────────────────────────────────

export function serializeToAST(nodes: FlowNode[], edges: FlowEdge[], name: string): WorkflowAST {
  const astNodes: WorkflowASTNode[] = nodes.map((n) => ({
    id: n.id,
    type: n.data.nodeType,
    position: n.position,
    data: n.data,
  }))
  const astEdges: WorkflowASTEdge[] = edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle,
    targetHandle: e.targetHandle,
  }))
  return { version: '1.0', name, nodes: astNodes, edges: astEdges, createdAt: new Date().toISOString() }
}
