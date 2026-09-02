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
  | 'integrationTrigger'
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
  | 'jira'
  | 'confluence'
  | 'bitbucket'
  | 'googlemeet'
  | 'googleslides'
  | 'googleforms'
  | 'googletasks'
  | 'googlechat'
  | 'googlekeep'
  | 'granola'
  | 'resend'
  | 'sendgrid'
  | 'kit'
  | 'airtable'
  | 'clickup'
  | 'monday'
  | 'asana'
  | 'typeform'
  | 'calendly'
  | 'dropbox'
  | 'netlify'
  | 'vercel'
  | 'supabase'
  | 'gumroad'
  | 'googlesearchconsole'
  | 'googlecontacts'
  | 'hubspot'
  | 'front'
  | 'data'
  | 'codingAgent'

export type ExecutionStatus = 'idle' | 'running' | 'completed' | 'error' | 'waiting'

export type LLMModel =
  | 'gemini-3.5-flash'
  | 'gemini-3-flash-preview'
  | 'gemini-3.1-pro-preview'
  | 'gpt-5.4-mini'
  | 'gpt-5.5'
  | 'claude-haiku-4-5-20251001'
  | 'claude-sonnet-4-6'
  | 'claude-opus-4-8'
  | 'grok-4.3'
  | 'grok-4.5'

/**
 * What an LLM node runs when nothing was chosen.
 *
 * Google's Flash tier: workflow runs are the volume in this product, and it is
 * priced at a quarter of gpt-4o per credit. Mirrors DefaultLLMModel on the
 * server, which is authoritative — this is only what the editor shows.
 */
export const DEFAULT_LLM_MODEL: LLMModel = 'gemini-3.5-flash'

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

  // scheduledTrigger — mirror of the ScheduledTrigger row, cached on the node
  // so the canvas card renders the cadence without a fetch. Source of truth is
  // the /schedule endpoint; the background scheduler drives the actual runs.
  scheduleFrequency?: 'interval' | 'hourly' | 'daily' | 'weekly' | 'monthly'
  scheduleIntervalSeconds?: number
  scheduleRunTime?: string
  scheduleDayOfWeek?: number
  scheduleDayOfMonth?: number
  scheduleRepeat?: boolean
  scheduleNextRunAt?: string

  // data (persistence) — reads/writes a DataStore selected by id
  dataStoreId?: string
  dataStoreName?: string    // cached for the canvas card; id is the source of truth
  dataOp?: string       // get|set|increment|delete|append|query|update|count|clear
  dataKey?: string
  dataValue?: string
  dataAmount?: string
  dataRecord?: string
  dataFilter?: string
  dataRecordId?: string
  dataLimit?: string

  // LLM structured output
  outputSchema?: string     // JSON schema string

  // LLM web tools
  enableWebSearch?: boolean  // gives the LLM web_search + read_url tools

  // Coding agent (server-side, isolated Daytona environment)
  codingAgentRuntime?: 'codex'
  codingAgentTask?: string
  codingAgentRepositoryProvider?: 'github' | 'gitlab'
  codingAgentRepositoryId?: string
  codingAgentRepository?: string
  codingAgentBranch?: string
  codingAgentWorkspaceMode?: 'persistent' | 'ephemeral'
  codingAgentConversationKey?: string
  codingAgentModel?: string
  codingAgentMaxDuration?: number
  codingAgentAutoStopMinutes?: number
  codingAgentAutoDeleteMinutes?: number
  codingAgentAllowedDomains?: string[]
  codingAgentAllowWrite?: boolean
  /** 'open' (default) lets the agent reach the internet; 'allowlist' restricts
   *  it to codingAgentAllowedDomains plus the runtime, npm and the repo host.
   *  Naming any domain implies 'allowlist'. */
  codingAgentNetworkAccess?: 'open' | 'allowlist'
  /** Ids of other nodes on this canvas the agent may call while it works — how
   *  it opens its own pull request without ever holding a credential. Empty
   *  means no tools. */
  codingAgentToolNodes?: string[]
  codingAgentToolGrants?: Array<{
    nodeType?: string
    nodeIds?: string[]
    nodeId?: string
    allowedOperations: string[]
    allowedOverrideFields: string[]
  }>

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
  notionProperties?: string
  notionParentPageId?: string
  notionSchema?: string    // JSON object of properties for update_page

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
  linearLabelId?: string

  // github
  githubRepo?: string          // owner/name
  githubTitle?: string
  githubBody?: string
  githubIssueNumber?: string
  githubLabels?: string        // comma-separated
  githubState?: string         // open | closed | all
  githubLimit?: number
  githubTreeLimit?: number     // list_repo_tree: default 1000, max 5000
  githubBranch?: string
  githubBase?: string
  githubMergeMethod?: string
  githubPath?: string          // file path, or optional list_repo_tree prefix
  githubContent?: string
  githubCommitMessage?: string
  githubRef?: string
  githubTag?: string
  githubWorkflowId?: string
  githubQuery?: string
  githubPrNumber?: string
  githubSince?: string         // ISO 8601 time filter (commits/issues/runs)
  githubUntil?: string

  // gitlab
  gitlabProjectId?: string
  gitlabTitle?: string
  gitlabDescription?: string
  gitlabIssueIid?: string
  gitlabLabels?: string
  gitlabState?: string         // opened | closed | all
  gitlabLimit?: number
  gitlabSourceBranch?: string
  gitlabTargetBranch?: string
  gitlabRef?: string
  gitlabPath?: string
  gitlabContent?: string
  gitlabCommitMessage?: string
  gitlabStateEvent?: string
  gitlabMrIid?: string
  gitlabSince?: string         // ISO 8601 time filter (commits/issues/MRs/pipelines)
  gitlabUntil?: string

  // gmail
  gmailTo?: string
  gmailCc?: string
  gmailSubject?: string
  gmailBody?: string
  // integrationTrigger — the canvas's copy of what this node is subscribed to.
  // The authoritative record is the integration_triggers row on the server (that
  // is what the provider was registered against); these let the card render and
  // a manual run produce a realistic placeholder without a round trip.
  triggerProvider?: string
  triggerEvent?: string
  triggerResourceId?: string
  triggerResourceLabel?: string
  triggerFilters?: Record<string, string>

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
  stripeCustomerId?: string
  stripeCustomerName?: string
  stripeSubscriptionId?: string
  stripeProductId?: string
  stripeProductName?: string
  stripeAmount?: number
  stripeCurrency?: string
  stripeInterval?: string
  stripeInvoiceId?: string
  stripePaymentIntentId?: string
  stripeRefundReason?: string

  // shopify
  shopifyOrderId?: string
  shopifyLimit?: number
  shopifyStatus?: string       // open | closed | any
  shopifyTitle?: string
  shopifyDescription?: string
  shopifyPrice?: string
  shopifyProductId?: string
  shopifyCustomerId?: string
  shopifyCustomerEmail?: string
  shopifyCustomerName?: string
  shopifyQuery?: string
  shopifyQuantity?: number
  shopifyInventoryItemId?: string
  shopifyLocationId?: string
  shopifyDelta?: number
  shopifyDiscountCode?: string
  shopifyDiscountType?: string
  shopifyDiscountValue?: string

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

  // jira
  jiraIssueKey?: string
  jiraProjectKey?: string
  jiraSummary?: string
  jiraDescription?: string
  jiraIssueType?: string
  jiraJql?: string
  jiraLimit?: number
  jiraFields?: string
  jiraAssignee?: string
  jiraPriority?: string
  jiraLabels?: string
  jiraParentKey?: string
  jiraDueDate?: string
  jiraTransition?: string
  jiraComment?: string
  jiraTimeSpent?: string
  jiraStarted?: string
  jiraLinkType?: string
  jiraLinkedIssue?: string
  jiraQuery?: string
  jiraBoardId?: string
  jiraSprintId?: string
  jiraSprintName?: string
  jiraStartDate?: string
  jiraEndDate?: string
  jiraAttachName?: string
  jiraAttachBody?: string

  // confluence
  confluenceSpaceKey?: string
  confluencePageId?: string
  confluenceTitle?: string
  confluenceBody?: string
  confluenceParentId?: string
  confluenceCql?: string
  confluenceLimit?: number
  confluenceComment?: string
  confluenceLabel?: string
  confluenceStatus?: string    // current | draft
  confluenceAttachName?: string
  confluenceAttachBody?: string

  // bitbucket
  bitbucketWorkspace?: string
  bitbucketRepo?: string
  bitbucketPrId?: string
  bitbucketTitle?: string
  bitbucketBody?: string
  bitbucketSource?: string
  bitbucketDest?: string
  bitbucketBranch?: string
  bitbucketRef?: string
  bitbucketPath?: string
  bitbucketContent?: string
  bitbucketMessage?: string
  bitbucketMergeStrategy?: string  // merge_commit | squash | fast_forward
  bitbucketState?: string
  bitbucketLimit?: number
  bitbucketQuery?: string
  bitbucketPrivate?: string        // 'true' | 'false'
  bitbucketIssueId?: string
  bitbucketKind?: string
  bitbucketPriority?: string

  // googlemeet
  meetSpace?: string
  meetAccessType?: string        // OPEN | TRUSTED | RESTRICTED
  meetModeration?: string        // ON | OFF
  meetConferenceRecord?: string
  meetTranscript?: string
  meetFilter?: string
  meetLimit?: number

  // googleslides
  slidesPresentationId?: string
  slidesTitle?: string
  slidesSlideId?: string
  slidesLayout?: string          // TITLE_AND_BODY | TITLE_ONLY | SECTION_HEADER | BLANK
  slidesHeading?: string
  slidesBody?: string
  slidesFind?: string
  slidesReplace?: string
  slidesImageUrl?: string
  slidesObjectId?: string
  slidesNotes?: string
  slidesTemplateId?: string
  slidesReplacements?: string
  slidesIndex?: number

  // googleforms
  formsFormId?: string
  formsTitle?: string
  formsDescription?: string
  formsQuestion?: string
  formsQuestionType?: string     // TEXT | PARAGRAPH | RADIO | CHECKBOX | DROPDOWN | SCALE | DATE | TIME
  formsOptions?: string
  formsRequired?: string         // 'true' | 'false'
  formsItemId?: string
  formsResponseId?: string
  formsIndex?: number
  formsIsQuiz?: string           // 'true' | 'false'
  formsAccepting?: string        // 'true' | 'false'
  formsLimit?: number

  // googletasks
  tasksListId?: string
  tasksTaskId?: string
  tasksTitle?: string
  tasksNotes?: string
  tasksDue?: string
  tasksStatus?: string           // needsAction | completed
  tasksParent?: string
  tasksPrevious?: string
  tasksShowCompleted?: string    // 'true' | 'false'
  tasksDueMin?: string
  tasksDueMax?: string
  tasksDestinationList?: string
  tasksLimit?: number

  // googlechat
  chatSpace?: string
  chatMessageId?: string
  chatText?: string
  chatThread?: string
  chatDisplayName?: string
  chatSpaceType?: string         // SPACE | GROUP_CHAT
  chatMemberEmail?: string
  chatMembership?: string
  chatEmoji?: string
  chatFilter?: string
  chatLimit?: number

  // googlekeep
  keepNoteName?: string
  keepTitle?: string
  keepText?: string
  keepListItems?: string
  keepEmail?: string
  keepFilter?: string
  keepLimit?: number

  // granola
  granolaNoteId?: string
  granolaCreatedAfter?: string
  granolaCursor?: string
  granolaLimit?: number

  // resend
  resendFrom?: string
  resendTo?: string
  resendCc?: string
  resendBcc?: string
  resendReplyTo?: string
  resendSubject?: string
  resendHtml?: string
  resendText?: string
  resendScheduledAt?: string
  resendHeaders?: string
  resendTags?: string
  resendBatch?: string
  resendEmailId?: string
  resendDomain?: string
  resendDomainId?: string
  resendRegion?: string
  resendEmail?: string
  resendContactId?: string
  resendFirstName?: string
  resendLastName?: string
  resendUnsubscribed?: string
  resendProperties?: string
  resendSegmentId?: string
  resendName?: string
  resendBroadcastId?: string
  resendTemplateId?: string
  resendTemplateVars?: string
  resendUrl?: string
  resendEvents?: string
  resendWebhookId?: string
  resendLimit?: number

  // sendgrid
  sendgridFrom?: string
  sendgridTo?: string
  sendgridCc?: string
  sendgridBcc?: string
  sendgridReplyTo?: string
  sendgridSubject?: string
  sendgridHtml?: string
  sendgridText?: string
  sendgridSendAt?: string
  sendgridTemplateId?: string
  sendgridTemplateData?: string
  sendgridEmail?: string
  sendgridContactId?: string
  sendgridFirstName?: string
  sendgridLastName?: string
  sendgridCustomFields?: string
  sendgridListId?: string
  sendgridSegmentId?: string
  sendgridSingleSendId?: string
  sendgridJobId?: string
  sendgridName?: string
  sendgridQuery?: string
  sendgridFieldType?: string
  sendgridStartDate?: string
  sendgridEndDate?: string
  sendgridAggregate?: string
  sendgridLimit?: number

  // kit
  kitEmail?: string
  kitFirstName?: string
  kitState?: string
  kitFields?: string
  kitSubscriberId?: string
  kitCreatedAfter?: string
  kitTagId?: string
  kitFormId?: string
  kitSequenceId?: string
  kitBroadcastId?: string
  kitFieldId?: string
  kitPurchaseId?: string
  kitPurchase?: string
  kitWebhookId?: string
  kitUrl?: string
  kitEvent?: string
  kitName?: string
  kitSubject?: string
  kitContent?: string
  kitDescription?: string
  kitSendAt?: string
  kitLimit?: number

  // airtable
  airtableBaseId?: string
  airtableTable?: string
  airtableTableId?: string
  airtableRecordId?: string
  airtableFields?: string
  airtableRecords?: string
  airtableTypecast?: string
  airtableFormula?: string
  airtableView?: string
  airtableFieldNames?: string
  airtableSortField?: string
  airtableSortDirection?: string
  airtableOffset?: string
  airtableMergeOn?: string
  airtableComment?: string
  airtableCommentId?: string
  airtableName?: string
  airtableDescription?: string
  airtableWorkspaceId?: string
  airtableTables?: string
  airtableTableFields?: string
  airtableFieldType?: string
  airtableFieldOptions?: string
  airtableFieldId?: string
  airtableUrl?: string
  airtableWebhookId?: string
  airtableCursor?: string
  airtableLimit?: number

  // monday.com
  mondayBoardId?: string
  mondayItemId?: string
  mondayGroupId?: string
  mondayItemName?: string
  mondayColumnValues?: string
  mondayUpdateBody?: string
  mondayCursor?: string
  mondayLimit?: number

  // asana
  asanaWorkspaceId?: string
  asanaProjectId?: string
  asanaSectionId?: string
  asanaTaskId?: string
  asanaParentTaskId?: string
  asanaName?: string
  asanaNotes?: string
  asanaAssignee?: string
  asanaDueOn?: string
  asanaCompleted?: string
  asanaComment?: string
  asanaLimit?: number

  // clickup
  clickupWorkspaceId?: string
  clickupSpaceId?: string
  clickupFolderId?: string
  clickupListId?: string
  clickupTaskId?: string
  clickupCustomTaskIds?: string
  clickupName?: string
  clickupDescription?: string
  clickupStatus?: string
  clickupStatuses?: string
  clickupPriority?: string
  clickupDueDate?: string
  clickupTimeEstimate?: string
  clickupAssignees?: string
  clickupParent?: string
  clickupTagName?: string
  clickupSubtasks?: string
  clickupIncludeClosed?: string
  clickupOrderBy?: string
  clickupComment?: string
  clickupCommentId?: string
  clickupChecklistId?: string
  clickupChecklistItemId?: string
  clickupResolved?: string
  clickupFieldId?: string
  clickupFieldValue?: string
  clickupDependsOn?: string
  clickupDependencyOf?: string
  clickupLinksTo?: string
  clickupDuration?: string
  clickupStartDate?: string
  clickupEndDate?: string
  clickupUrl?: string
  clickupEvents?: string
  clickupWebhookId?: string
  clickupLimit?: number

  // typeform
  typeformFormId?: string
  typeformTitle?: string
  typeformDefinition?: string
  typeformWorkspaceId?: string
  typeformThemeId?: string
  typeformSearch?: string
  typeformSince?: string
  typeformUntil?: string
  typeformAfter?: string
  typeformCompleted?: string
  typeformQuery?: string
  typeformResponseIds?: string
  typeformUrl?: string
  typeformTag?: string
  typeformSecret?: string
  typeformLimit?: number

  // calendly
  calendlyUser?: string
  calendlyOrganization?: string
  calendlyScope?: string
  calendlyEventType?: string
  calendlyEvent?: string
  calendlyInvitee?: string
  calendlyNoShow?: string
  calendlyMembership?: string
  calendlyRoutingForm?: string
  calendlyStatus?: string
  calendlyStartTime?: string
  calendlyEndTime?: string
  calendlyEmail?: string
  calendlyReason?: string
  calendlyInviteeName?: string
  calendlyInviteeEmail?: string
  calendlyTimezone?: string
  calendlyGuests?: string
  calendlyAnswers?: string
  calendlyUrl?: string
  calendlyEvents?: string
  calendlyWebhookId?: string
  calendlyLimit?: number

  // dropbox
  dropboxPath?: string
  dropboxToPath?: string
  dropboxContent?: string
  dropboxOverwrite?: string
  dropboxRecursive?: string
  dropboxCursor?: string
  dropboxQuery?: string
  dropboxRev?: string
  dropboxUrl?: string
  dropboxVisibility?: string
  dropboxEmail?: string
  dropboxAccessLevel?: string
  dropboxMessage?: string
  dropboxTitle?: string
  dropboxLimit?: number

  // netlify
  netlifySiteId?: string
  netlifyAccountId?: string    // team ID; env var writes need it
  netlifyAccountSlug?: string    // team URL name; NOT the ID
  netlifyDeployId?: string
  netlifyBuildId?: string
  netlifyFormId?: string
  netlifySubmissionId?: string
  netlifyZoneId?: string
  netlifyRecordId?: string
  netlifyHookId?: string
  netlifyBuildHookId?: string
  netlifyKeyId?: string
  netlifyName?: string
  netlifyTitle?: string
  netlifyCustomDomain?: string
  netlifySiteConfig?: string    // raw JSON site body
  netlifyRepo?: string    // raw JSON repo settings
  netlifyConfigureDns?: string    // "true" | "false"
  netlifyBranch?: string
  netlifyClearCache?: string    // "true" | "false"
  netlifyDraft?: string    // "true" | "false"
  netlifyDeployFiles?: string    // JSON path → SHA1 manifest
  netlifyReason?: string    // required by disable_site
  netlifyEnvKey?: string
  netlifyEnvValue?: string
  netlifyEnvValueId?: string
  netlifyEnvContext?: string    // all|dev|dev-server|branch-deploy|deploy-preview|production|branch
  netlifyEnvContextParameter?: string    // branch name when context=branch
  netlifyEnvScopes?: string    // CSV: builds,functions,runtime,post-processing
  netlifyEnvIsSecret?: string    // "true" | "false"
  netlifyEnvVarsJson?: string    // raw JSON array of variables
  netlifyRecordType?: string
  netlifyHostname?: string
  netlifyRecordValue?: string
  netlifyTtl?: string
  netlifyPriority?: string    // MX
  netlifyWeight?: string    // SRV
  netlifyPort?: string    // SRV
  netlifyFlag?: string    // CAA
  netlifyTag?: string    // CAA
  netlifyHookType?: string    // defaults to "url"
  netlifyHookEvent?: string    // deploy_created, submission_created, …
  netlifyHookData?: string    // raw JSON data object
  netlifyUrl?: string    // convenience for a url hook
  netlifyFilter?: string    // all|owner|guest
  netlifyQuery?: string
  netlifyLogType?: string
  netlifyPage?: number    // 1-based
  netlifyPerPage?: number    // capped at 100

  // vercel
  // Team scoping is sent on every call. Without it the token resolves to its
  // owner's personal scope and a team project returns 404, not a 403.
  vercelTeamId?: string
  vercelTeamSlug?: string
  vercelProjectId?: string    // id OR name
  vercelDeploymentId?: string    // id OR a deployment URL
  vercelName?: string    // project name; redeploy reads it back when unset
  vercelTarget?: string    // production|preview|development
  vercelState?: string    // READY, ERROR, BUILDING, … (CSV allowed)
  vercelBranch?: string
  vercelSha?: string
  vercelAlias?: string
  vercelDomain?: string
  vercelRedirect?: string
  vercelGitBranch?: string    // branch-scoped env var, or a branch-locked domain
  vercelEnvKey?: string
  vercelEnvValue?: string
  vercelEnvVarId?: string    // from list_env_vars
  vercelEnvTarget?: string    // CSV: production,preview,development
  vercelEnvType?: string    // encrypted|plain|sensitive
  vercelProjectConfig?: string    // raw JSON body for update_project
  vercelUrl?: string
  vercelSearch?: string
  vercelBuildId?: string    // narrows build logs to one build
  vercelLimit?: number

  // supabase
  supabaseAllowWrite?: string    // "true" is required before run_sql will execute
  supabaseAllowedCidrs?: string
  supabaseAllowedCidrsV6?: string
  supabaseApiKeyId?: string
  supabaseApiKeyType?: string
  supabaseAuthConfig?: string
  supabaseBranchName?: string
  supabaseBranchRef?: string
  supabaseConfirmDelete?: string
  supabaseCursor?: string
  supabaseDbPass?: string    // database password for a new project
  supabaseEntrypointPath?: string
  supabaseForce?: string
  supabaseFunctionBody?: string
  supabaseFunctionSlug?: string
  supabaseGitBranch?: string
  supabaseHostname?: string
  supabaseImportMapPath?: string
  supabaseIncludedSchemas?: string
  supabaseInstanceSize?: string
  supabaseIpAddresses?: string
  supabaseLimit?: number
  supabaseMigrationName?: string
  supabaseMigrationVersion?: string
  supabaseName?: string
  supabaseOrgSlug?: string
  supabasePersistent?: string
  supabasePostgrestMaxRows?: number
  supabasePostgrestSchema?: string
  supabasePostgrestSearchPath?: string
  supabaseProjectRef?: string    // the 20-character project ref, NOT the project UUID
  supabaseRecoveryTimeUnix?: string
  supabaseRegion?: string
  supabaseRevealKeys?: string
  supabaseRollbackSql?: string
  supabaseSecretNames?: string
  supabaseSecrets?: string    // JSON object or array of name/value pairs
  supabaseSiteUrl?: string
  supabaseSnippetId?: string
  supabaseSortBy?: string
  supabaseSortOrder?: string
  supabaseSql?: string    // raw SQL; prefer parameters over string interpolation
  supabaseSqlParams?: string    // JSON array bound to $1, $2 … in the statement
  supabaseUriAllowList?: string
  supabaseVerifyJwt?: string
  supabaseWithData?: string

  // gumroad
  gumroadAfter?: string    // YYYY-MM-DD, exclusive
  gumroadAmount?: string    // refund amount in cents; omit to refund in full
  gumroadAmountOff?: string    // cents, or a percentage when the offer type is percent
  gumroadBefore?: string    // YYYY-MM-DD, exclusive
  gumroadCategoryId?: string
  gumroadCode?: string
  gumroadCustomPermalink?: string
  gumroadDescription?: string
  gumroadEmail?: string
  gumroadIncrementUses?: string    // "true" counts this check against the licence uses
  gumroadLicenseKey?: string
  gumroadMaxPurchases?: string
  gumroadName?: string
  gumroadOfferCodeId?: string
  gumroadOfferType?: string    // cents | percent
  gumroadPageKey?: string    // opaque paging key from a previous list_sales
  gumroadPrice?: string    // CENTS — 1000 is $10.00
  gumroadPriceDifference?: string    // variant surcharge, in cents
  gumroadProductId?: string
  gumroadRequired?: string
  gumroadResourceName?: string    // sale | refund | dispute | cancellation | subscription_updated
  gumroadSaleId?: string
  gumroadSubscriberId?: string
  gumroadTitle?: string
  gumroadTrackingUrl?: string
  gumroadUrl?: string
  gumroadWebhookId?: string

  // googlesearchconsole
  gscSiteUrl?: string    // https://example.com/ or sc-domain:example.com
  gscFeedPath?: string    // full sitemap URL
  gscStartDate?: string    // YYYY-MM-DD, Pacific time
  gscEndDate?: string
  gscDimensions?: string    // query, page, country, device, date
  gscSearchType?: string    // web | image | video | news | discover
  gscDataState?: string    // final (default) | all
  gscFilterExpression?: string    // one "dimension operator value" per line
  gscRowLimit?: number
  gscStartRow?: number
  gscInspectionUrl?: string
  gscLanguageCode?: string

  // googlecontacts
  contactsResourceName?: string    // people/c123; comma-separated for batch delete
  contactsFields?: string    // personFields mask; a sensible default applies
  contactsQuery?: string
  contactsPageToken?: string
  contactsSortOrder?: string
  contactsGivenName?: string
  contactsFamilyName?: string
  contactsEmail?: string    // comma-separated
  contactsPhone?: string    // comma-separated
  contactsOrganization?: string
  contactsJobTitle?: string
  contactsAddress?: string
  contactsNotes?: string
  contactsRawPerson?: string    // extra People-API fields as JSON
  contactsGroupId?: string
  contactsGroupName?: string
  contactsAddMembers?: string    // comma-separated resource names
  contactsRemoveMembers?: string
  contactsLimit?: number

  // hubspot
  hubspotAfter?: string
  hubspotArchived?: string
  hubspotAssociations?: string    // JSON array of associations to create alongside the record
  hubspotBatchInputs?: string    // JSON array, max 100 per request
  hubspotFieldType?: string
  hubspotFilters?: string    // JSON array of filter groups for search_objects
  hubspotGroupName?: string
  hubspotIdProperty?: string    // look a record up by a unique property such as email instead of its id
  hubspotLabel?: string
  hubspotLimit?: number
  hubspotListId?: string
  hubspotObjectId?: string
  hubspotObjectType?: string    // contacts | companies | deals | tickets | notes | tasks | calls | emails | meetings, or a custom type id
  hubspotProperties?: string    // comma-separated property names to return; v3 omits anything not asked for
  hubspotPropertyName?: string
  hubspotPropertyType?: string
  hubspotPropertyValues?: string    // JSON object keyed by HubSpot's internal names, e.g. firstname not First Name
  hubspotQuery?: string
  hubspotSortDirection?: string
  hubspotSortProperty?: string
  hubspotToObjectId?: string
  hubspotToObjectType?: string

  // front
  frontAssigneeId?: string
  frontAuthorId?: string    // teammate id the message or comment is sent as
  frontBcc?: string
  frontBody?: string
  frontCc?: string
  frontChannelId?: string    // cha_… — required to start a new conversation
  frontContactId?: string
  frontConversationId?: string    // cnv_…
  frontDescription?: string
  frontHandle?: string    // an address on a channel, e.g. an email address
  frontHandleSource?: string    // email | phone | twitter | intercom | custom
  frontInboxId?: string
  frontLimit?: number
  frontLinkId?: string
  frontName?: string
  frontPageToken?: string
  frontQuery?: string    // search terms, or event types for list_events
  frontStatus?: string    // archived | open | deleted | spam
  frontSubject?: string
  frontTagId?: string    // comma-separated tag ids
  frontTeammateId?: string
  frontTo?: string
  frontUrl?: string

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
  | 'node_waiting'         // humanApproval is waiting for review
  | 'node_progress'        // non-terminal activity from a long-running node
  | 'iteration_started'    // one pass of a loop body begins
  | 'iteration_completed'  // …and ends, carrying that pass's status
  | 'edge_taken'           // an edge enabled its target — the path, one hop at a time
  | 'node_skipped'         // a node that never ran, with the reason why
  | 'log_truncated'        // the run outran the event ceiling

/** Why a node never ran. Absent the distinction, a path a branch declined and
 *  one the run errored out before reaching look identical: the node is simply
 *  missing from the log. */
export type SkipReason = 'branch_not_taken' | 'not_reached'

/** Which pass of a loop an event belongs to. Loops do not nest, so one frame
 *  always locates an event. */
export interface IterationRef {
  loopNodeId: string
  index: number
  total: number
  itemPreview?: string
}

export interface ExecutionEvent {
  id: string
  type: ExecutionEventType
  runId?: string
  nodeId?: string
  nodeLabel?: string
  nodeType?: NodeType
  message: string
  output?: string
  payload?: Record<string, unknown>
  timestamp: number
  /** Set on every event raised inside a loop body, and on the
   *  iteration_started/completed pair bracketing it. */
  iteration?: IterationRef
  /** 'ok' | 'error' on iteration_completed. */
  status?: 'ok' | 'error'
  /** edge_taken only. sourceHandle is the branch output that chose the edge,
   *  and is absent for unconditional edges. */
  edgeId?: string
  sourceHandle?: string
  /** node_skipped only. */
  skipReason?: SkipReason
  /** The payload was clipped to the per-event cap — not the node returning less. */
  outputTruncated?: boolean
}
