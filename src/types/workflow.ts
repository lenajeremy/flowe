import type { Node, Edge } from '@xyflow/react'

// ── Node Types ──────────────────────────────────────────────
export type NodeType =
  | 'textInput'
  | 'imageInput'
  | 'llm'
  | 'branch'
  | 'loop'
  | 'textOutput'
  | 'httpRequest'
  | 'emailSend'
  | 'humanApproval'
  | 'webhookTrigger'
  | 'scheduledTrigger'
  | 'notion'
  | 'linear'
  | 'github'
  | 'gitlab'
  | 'gmail'
  | 'stripe'
  | 'shopify'
  | 'googlecalendar'
  | 'outlook'
  | 'slack'
  | 'googledrive'
  | 'googledocs'
  | 'googlesheets'

export type ExecutionStatus = 'idle' | 'running' | 'completed' | 'error' | 'waiting'

export type LLMModel =
  | 'gpt-4o'
  | 'gpt-4o-mini'
  | 'o4-mini'
  | 'claude-opus-4-5'
  | 'claude-sonnet-4-5'
  | 'claude-haiku-4-5'
  | 'gemini-2.5-pro'
  | 'gemini-3-flash'
  | 'gemini-3.1-pro-preview'
  | 'gemini-3.1-flash'
  | 'gemini-3.1-flash-lite'

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

  // httpRequest
  url?: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  requestHeaders?: string   // JSON string of key:value pairs
  requestBody?: string      // template body

  // emailSend
  emailTo?: string
  emailSubject?: string
  emailBody?: string

  // humanApproval
  approvalMessage?: string
  approvalTimeout?: number  // seconds, 0 = no timeout
  approvalEmail?: string    // optional email to notify when approval is needed

  // scheduledTrigger
  interval?: '5m' | '15m' | '30m' | '1h' | '6h' | '12h' | '24h'

  // LLM structured output
  outputSchema?: string     // JSON schema string

  // LLM web tools
  enableWebSearch?: boolean  // gives the LLM web_search + read_url tools

  // notion / linear shared
  integrationToken?: string    // API token — stored in node config
  integrationOp?: string       // operation key e.g. "create_page"

  // notion
  notionDatabaseId?: string
  notionPageId?: string
  notionTitle?: string         // supports {{nodeId.output}} templates
  notionContent?: string       // supports {{nodeId.output}} templates
  notionFilter?: string        // JSON filter string
  notionQuery?: string         // search text
  notionProperties?: string    // JSON object of properties for update_page

  // linear
  linearTeamId?: string
  linearIssueId?: string
  linearTitle?: string         // supports {{nodeId.output}} templates
  linearDescription?: string   // supports {{nodeId.output}} templates
  linearPriority?: number      // 0..4
  linearCommentBody?: string   // supports {{nodeId.output}} templates
  linearLimit?: number
  linearStateId?: string
  linearAssigneeId?: string
  linearQuery?: string
  linearProjectId?: string

  // github
  githubRepo?: string          // owner/name
  githubTitle?: string
  githubBody?: string
  githubIssueNumber?: string
  githubLabels?: string        // comma-separated
  githubState?: string         // open | closed | all
  githubLimit?: number
  githubPrNumber?: string

  // gitlab
  gitlabProjectId?: string
  gitlabTitle?: string
  gitlabDescription?: string
  gitlabIssueIid?: string
  gitlabLabels?: string
  gitlabState?: string         // opened | closed | all
  gitlabLimit?: number
  gitlabMrIid?: string

  // gmail
  gmailTo?: string
  gmailCc?: string
  gmailSubject?: string
  gmailBody?: string
  gmailQuery?: string          // Gmail search syntax
  gmailMessageId?: string
  gmailLimit?: number
  gmailThreadId?: string
  gmailLabelId?: string
  gmailLabelName?: string
  gmailDraftId?: string

  // stripe
  stripeLimit?: number
  stripeCustomerEmail?: string
  stripePriceId?: string
  stripeQuantity?: number

  // shopify
  shopifyOrderId?: string
  shopifyLimit?: number
  shopifyStatus?: string       // open | closed | any
  shopifyTitle?: string
  shopifyDescription?: string
  shopifyPrice?: string

  // googlecalendar
  gcalCalendarId?: string
  gcalEventId?: string
  gcalSummary?: string
  gcalDescription?: string
  gcalStart?: string           // RFC3339
  gcalEnd?: string
  gcalAttendees?: string       // comma-separated emails
  gcalLimit?: number
  gcalText?: string            // quick_add natural language
  gcalResponse?: string        // accepted | declined | tentative

  // outlook
  outlookTo?: string
  outlookCc?: string
  outlookSubject?: string
  outlookBody?: string
  outlookQuery?: string
  outlookMessageId?: string
  outlookLimit?: number
  outlookStart?: string
  outlookEnd?: string
  outlookFolderId?: string
  outlookEventId?: string
  outlookComment?: string
  outlookResponse?: string
  outlookContactName?: string
  outlookContactEmail?: string

  // slack
  slackChannel?: string
  slackText?: string
  slackLimit?: number
  slackSendAs?: 'bot' | 'user'
  slackUserId?: string
  slackBotName?: string
  slackThreadTs?: string
  slackMessageTs?: string
  slackEmoji?: string
  slackChannelName?: string
  slackPrivate?: string
  slackTopic?: string
  slackFileName?: string
  slackFileContent?: string
  slackEmail?: string
  slackPostAt?: string

  // googledrive
  gdriveFileId?: string
  gdriveName?: string
  gdriveQuery?: string
  gdriveParentId?: string
  gdriveLimit?: number
  gdriveContent?: string
  gdriveMimeType?: string
  gdriveEmail?: string
  gdriveRole?: string

  // googledocs
  gdocsDocumentId?: string
  gdocsTitle?: string
  gdocsText?: string
  gdocsFindText?: string
  gdocsReplaceText?: string
  gdocsTemplateId?: string
  gdocsReplacements?: string

  // googlesheets
  gsheetsSpreadsheetId?: string
  gsheetsRange?: string        // A1 notation
  gsheetsValues?: string       // comma-separated cells
  gsheetsTitle?: string
  gsheetsSheetTitle?: string   // tab name
  gsheetsFind?: string
  gsheetsReplace?: string
  gsheetsRows?: string         // JSON array-of-arrays
  gsheetsStartRow?: number
  gsheetsEndRow?: number

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
  | 'node_waiting'   // humanApproval is waiting for review

export interface ExecutionEvent {
  id: string
  type: ExecutionEventType
  runId?: string
  nodeId?: string
  nodeLabel?: string
  nodeType?: NodeType
  message: string
  output?: string
  timestamp: number
}
