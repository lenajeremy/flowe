import { FormField, inputClass } from '@/components/ui/FormField'
import { TemplateField } from '@/components/ui/TemplateField'
import { Select } from '@/components/ui/Select'
import { IntegrationConnect } from '@/components/ui/IntegrationConnect'
import { ResourcePicker } from '@/components/ui/ResourcePicker'
import type { FlowNodeData } from '@/types/workflow'

// ── Integration provider config blocks ────────────────────────
// One component per provider, rendered by ConfigPanel. Shared field helpers
// (TextField/AreaField/NumField/SelectField/ResourceField) keep each block
// declarative; IntegrationSection renders the op selector + Connect card.

export interface ProviderConfigProps {
  data: FlowNodeData
  nodeId: string
  updateNodeData: (nodeId: string, partial: Partial<FlowNodeData>) => void
}

// ── Reusable integration-config field helpers ─────────────────
// The five new integration providers share the same form shapes; these small
// components keep each provider block declarative instead of 100+ lines of
// repeated JSX.

type UpdateFn = (nodeId: string, partial: Partial<FlowNodeData>) => void

interface FieldProps {
  label: string
  field: string
  data: FlowNodeData
  nodeId: string
  updateNodeData: UpdateFn
  placeholder?: string
}

function TextField({ label, field, data, nodeId, updateNodeData, placeholder }: FieldProps) {
  return (
    <FormField label={label} htmlFor={`cfg-${nodeId}-${field}`}>
      <TemplateField id={`cfg-${nodeId}-${field}`} placeholder={placeholder}
        value={typeof data[field] === 'string' ? (data[field] as string) : ''}
        onChange={(v) => updateNodeData(nodeId, { [field]: v })} />
    </FormField>
  )
}

function AreaField({ label, field, data, nodeId, updateNodeData, placeholder }: FieldProps) {
  return (
    <FormField label={label} htmlFor={`cfg-${nodeId}-${field}`}>
      <TemplateField id={`cfg-${nodeId}-${field}`} multiline rows={3} placeholder={placeholder}
        value={typeof data[field] === 'string' ? (data[field] as string) : ''}
        onChange={(v) => updateNodeData(nodeId, { [field]: v })} />
    </FormField>
  )
}

function NumField({ label, field, data, nodeId, updateNodeData, fallback }: FieldProps & { fallback: number }) {
  return (
    <FormField label={label} htmlFor={`cfg-${nodeId}-${field}`}>
      <input id={`cfg-${nodeId}-${field}`} type="number" className={inputClass}
        value={String(typeof data[field] === 'number' ? (data[field] as number) : fallback)}
        onChange={(e) => updateNodeData(nodeId, { [field]: Number(e.target.value) })} />
    </FormField>
  )
}

function SelectField({ label, field, data, nodeId, updateNodeData, fallback, options }: FieldProps & { fallback: string; options: { value: string; label: string }[] }) {
  return (
    <FormField label={label} htmlFor={`cfg-${nodeId}-${field}`}>
      <Select id={`cfg-${nodeId}-${field}`}
        value={typeof data[field] === 'string' ? (data[field] as string) : fallback}
        onChange={(val) => updateNodeData(nodeId, { [field]: val })}
        options={options} />
    </FormField>
  )
}

type ResourceProvider = 'notion' | 'linear' | 'github' | 'gitlab' | 'gmail' | 'stripe' | 'googlecalendar' | 'googledrive' | 'outlook' | 'slack'
type ResourceKind = 'database' | 'page' | 'team' | 'project' | 'repo' | 'price' | 'calendar' | 'folder' | 'channel' | 'user' | 'label'

function ResourceField({ label, provider, kind, field, data, nodeId, updateNodeData, placeholder }: FieldProps & { provider: ResourceProvider; kind: ResourceKind }) {
  return (
    <FormField label={label} htmlFor={`cfg-${nodeId}-${field}`}>
      <ResourcePicker provider={provider} kind={kind} id={`cfg-${nodeId}-${field}`} placeholder={placeholder}
        value={typeof data[field] === 'string' ? (data[field] as string) : ''}
        onChange={(val) => updateNodeData(nodeId, { [field]: val })} />
    </FormField>
  )
}

// IntegrationSection renders the operation selector + Connect card shared by
// the github/gitlab/gmail/stripe/shopify config blocks, then its children
// (the per-op fields).
function IntegrationSection({
  provider, label, data, nodeId, updateNodeData, defaultOp, ops, tokenPlaceholder, hideManual, children,
}: {
  provider: 'github' | 'gitlab' | 'gmail' | 'stripe' | 'shopify' | 'googlecalendar' | 'outlook' | 'slack' | 'googledrive' | 'googledocs' | 'googlesheets'
  label: string
  data: FlowNodeData
  nodeId: string
  updateNodeData: UpdateFn
  defaultOp: string
  ops: { value: string; label: string }[]
  tokenPlaceholder: string
  hideManual?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-3">
      <FormField label="Operation" htmlFor={`cfg-${nodeId}-op`}>
        <Select id={`cfg-${nodeId}-op`}
          value={typeof data.integrationOp === 'string' ? data.integrationOp : defaultOp}
          onChange={(val) => updateNodeData(nodeId, { integrationOp: val })}
          options={ops} />
      </FormField>

      <IntegrationConnect
        provider={provider}
        label={label}
        hasManualToken={!hideManual && typeof data.integrationToken === 'string' && data.integrationToken !== ''}
        manualField={hideManual ? null : (
          <FormField label={`${label} Token`} htmlFor={`cfg-${nodeId}-token`}>
            <input id={`cfg-${nodeId}-token`} type="password" className={inputClass} placeholder={tokenPlaceholder}
              value={typeof data.integrationToken === 'string' ? data.integrationToken : ''}
              onChange={(e) => updateNodeData(nodeId, { integrationToken: e.target.value })} />
          </FormField>
        )}
      />

      {children}
    </div>
  )
}

export function NotionConfig({ data, nodeId, updateNodeData }: ProviderConfigProps) {
  return (
      <div className="flex flex-col gap-3">
        {/* Operation */}
        <FormField label="Operation" htmlFor="cfg-notion-op">
          <Select
            id="cfg-notion-op"
            value={typeof data.integrationOp === 'string' ? data.integrationOp : 'create_page'}
            onChange={(val) => updateNodeData(nodeId, { integrationOp: val })}
            options={[
              { value: 'create_page', label: 'Create Page' },
              { value: 'query_database', label: 'Query Database' },
              { value: 'append_blocks', label: 'Append Blocks to Page' },
              { value: 'update_page', label: 'Update Page' },
              { value: 'get_page_content', label: 'Get Page Content' },
              { value: 'search', label: 'Search' },
              { value: 'add_comment', label: 'Add Comment' },
            ]}
          />
        </FormField>

        {/* Connection — OAuth via server, manual token as override */}
        <IntegrationConnect
          provider="notion"
          label="Notion"
          hasManualToken={typeof data.integrationToken === 'string' && data.integrationToken !== ''}
          manualField={
            <>
              <FormField label="Notion API Token" htmlFor="cfg-notion-token">
                <input
                  id="cfg-notion-token"
                  type="password"
                  value={typeof data.integrationToken === 'string' ? data.integrationToken : ''}
                  onChange={(e) => updateNodeData(nodeId, { integrationToken: e.target.value })}
                  className={inputClass}
                  placeholder="secret_..."
                />
              </FormField>
              <p className="text-[10px] text-[var(--color-muted)] -mt-2">
                Get from notion.so → Settings → Integrations → New integration
              </p>
            </>
          }
        />

        {/* create_page fields */}
        {(data.integrationOp === 'create_page' || !data.integrationOp) && (
          <>
            <FormField label="Database" htmlFor="cfg-notion-db">
              <ResourcePicker
                provider="notion"
                kind="database"
                id="cfg-notion-db"
                value={typeof data.notionDatabaseId === 'string' ? data.notionDatabaseId : ''}
                onChange={(val) => updateNodeData(nodeId, { notionDatabaseId: val })}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              />
            </FormField>
            <FormField label="Title" htmlFor="cfg-notion-title">
              <TemplateField
                id="cfg-notion-title"
                value={typeof data.notionTitle === 'string' ? data.notionTitle : ''}
                onChange={(v) => updateNodeData(nodeId, { notionTitle: v })}
                placeholder="{{llm-1.output}}"
              />
            </FormField>
            <FormField label="Content" htmlFor="cfg-notion-content">
              <TemplateField
                id="cfg-notion-content"
                multiline
                rows={3}
                value={typeof data.notionContent === 'string' ? data.notionContent : ''}
                onChange={(v) => updateNodeData(nodeId, { notionContent: v })}
                placeholder="{{llm-1.output}}"
              />
            </FormField>
          </>
        )}

        {/* query_database fields */}
        {data.integrationOp === 'query_database' && (
          <>
            <FormField label="Database" htmlFor="cfg-notion-db-q">
              <ResourcePicker
                provider="notion"
                kind="database"
                id="cfg-notion-db-q"
                value={typeof data.notionDatabaseId === 'string' ? data.notionDatabaseId : ''}
                onChange={(val) => updateNodeData(nodeId, { notionDatabaseId: val })}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              />
            </FormField>
            <FormField label="Filter (JSON, optional)" htmlFor="cfg-notion-filter">
              <TemplateField
                id="cfg-notion-filter"
                multiline
                rows={3}
                value={typeof data.notionFilter === 'string' ? data.notionFilter : ''}
                onChange={(v) => updateNodeData(nodeId, { notionFilter: v })}
                placeholder='{"property":"Status","select":{"equals":"Done"}}'
              />
            </FormField>
          </>
        )}

        {/* append_blocks fields */}
        {data.integrationOp === 'append_blocks' && (
          <>
            <FormField label="Page" htmlFor="cfg-notion-page">
              <ResourcePicker
                provider="notion"
                kind="page"
                id="cfg-notion-page"
                value={typeof data.notionPageId === 'string' ? data.notionPageId : ''}
                onChange={(val) => updateNodeData(nodeId, { notionPageId: val })}
                placeholder="{{prev-node.output}} or page ID"
              />
            </FormField>
            <FormField label="Content" htmlFor="cfg-notion-content-ap">
              <TemplateField
                id="cfg-notion-content-ap"
                multiline
                rows={3}
                value={typeof data.notionContent === 'string' ? data.notionContent : ''}
                onChange={(v) => updateNodeData(nodeId, { notionContent: v })}
                placeholder="{{llm-1.output}}"
              />
            </FormField>
          </>
        )}

        {/* get_page_content / add_comment need a page */}
        {(data.integrationOp === 'get_page_content' || data.integrationOp === 'add_comment') && (
          <FormField label="Page" htmlFor="cfg-notion-page-r">
            <ResourcePicker
              provider="notion" kind="page" id="cfg-notion-page-r"
              value={typeof data.notionPageId === 'string' ? data.notionPageId : ''}
              onChange={(val) => updateNodeData(nodeId, { notionPageId: val })}
              placeholder="{{prev-node.output}} or page ID"
            />
          </FormField>
        )}
        {data.integrationOp === 'add_comment' && (
          <FormField label="Comment" htmlFor="cfg-notion-comment">
            <TemplateField id="cfg-notion-comment" multiline rows={3}
              value={typeof data.notionContent === 'string' ? data.notionContent : ''}
              onChange={(v) => updateNodeData(nodeId, { notionContent: v })}
              placeholder="{{llm-1.output}}" />
          </FormField>
        )}
        {data.integrationOp === 'update_page' && (
          <>
            <FormField label="Page" htmlFor="cfg-notion-page-u">
              <ResourcePicker
                provider="notion" kind="page" id="cfg-notion-page-u"
                value={typeof data.notionPageId === 'string' ? data.notionPageId : ''}
                onChange={(val) => updateNodeData(nodeId, { notionPageId: val })}
                placeholder="Page ID"
              />
            </FormField>
            <FormField label="Properties (JSON)" htmlFor="cfg-notion-props">
              <TemplateField id="cfg-notion-props" multiline rows={4}
                value={typeof data.notionProperties === 'string' ? data.notionProperties : ''}
                onChange={(v) => updateNodeData(nodeId, { notionProperties: v })}
                placeholder='{"Status":{"select":{"name":"Done"}}}' />
            </FormField>
          </>
        )}
        {data.integrationOp === 'search' && (
          <FormField label="Search query" htmlFor="cfg-notion-query">
            <TemplateField id="cfg-notion-query"
              value={typeof data.notionQuery === 'string' ? data.notionQuery : ''}
              onChange={(v) => updateNodeData(nodeId, { notionQuery: v })}
              placeholder="meeting notes" />
          </FormField>
        )}
      </div>
  )
}

export function LinearConfig({ data, nodeId, updateNodeData }: ProviderConfigProps) {
  return (
      <div className="flex flex-col gap-3">
        {/* Operation */}
        <FormField label="Operation" htmlFor="cfg-linear-op">
          <Select
            id="cfg-linear-op"
            value={typeof data.integrationOp === 'string' ? data.integrationOp : 'create_issue'}
            onChange={(val) => updateNodeData(nodeId, { integrationOp: val })}
            options={[
              { value: 'create_issue', label: 'Create Issue' },
              { value: 'get_issues', label: 'Get Issues' },
              { value: 'create_comment', label: 'Create Comment' },
              { value: 'update_issue', label: 'Update Issue' },
              { value: 'search_issues', label: 'Search Issues' },
              { value: 'list_projects', label: 'List Projects' },
              { value: 'get_issue', label: 'Get Issue' },
            ]}
          />
        </FormField>

        {/* Connection — OAuth via server, manual token as override */}
        <IntegrationConnect
          provider="linear"
          label="Linear"
          hasManualToken={typeof data.integrationToken === 'string' && data.integrationToken !== ''}
          manualField={
            <>
              <FormField label="Linear API Key" htmlFor="cfg-linear-token">
                <input
                  id="cfg-linear-token"
                  type="password"
                  value={typeof data.integrationToken === 'string' ? data.integrationToken : ''}
                  onChange={(e) => updateNodeData(nodeId, { integrationToken: e.target.value })}
                  className={inputClass}
                  placeholder="lin_api_..."
                />
              </FormField>
              <p className="text-[10px] text-[var(--color-muted)] -mt-2">
                Get from linear.app → Settings → API → Personal API keys
              </p>
            </>
          }
        />

        {/* create_issue fields */}
        {(data.integrationOp === 'create_issue' || !data.integrationOp) && (
          <>
            <FormField label="Team" htmlFor="cfg-linear-team">
              <ResourcePicker
                provider="linear"
                kind="team"
                id="cfg-linear-team"
                value={typeof data.linearTeamId === 'string' ? data.linearTeamId : ''}
                onChange={(val) => updateNodeData(nodeId, { linearTeamId: val })}
                placeholder="Team ID from Linear"
              />
            </FormField>
            <FormField label="Title" htmlFor="cfg-linear-title">
              <TemplateField
                id="cfg-linear-title"
                value={typeof data.linearTitle === 'string' ? data.linearTitle : ''}
                onChange={(v) => updateNodeData(nodeId, { linearTitle: v })}
                placeholder="{{llm-1.output}}"
              />
            </FormField>
            <FormField label="Description" htmlFor="cfg-linear-desc">
              <TemplateField
                id="cfg-linear-desc"
                multiline
                rows={3}
                value={typeof data.linearDescription === 'string' ? data.linearDescription : ''}
                onChange={(v) => updateNodeData(nodeId, { linearDescription: v })}
                placeholder="{{llm-1.output}}"
              />
            </FormField>
            <FormField label="Priority" htmlFor="cfg-linear-priority">
              <Select
                id="cfg-linear-priority"
                value={String(typeof data.linearPriority === 'number' || typeof data.linearPriority === 'string' ? data.linearPriority : 3)}
                onChange={(val) => updateNodeData(nodeId, { linearPriority: Number(val) })}
                options={[
                  { value: '0', label: 'No Priority' },
                  { value: '1', label: 'Urgent' },
                  { value: '2', label: 'High' },
                  { value: '3', label: 'Medium' },
                  { value: '4', label: 'Low' },
                ]}
              />
            </FormField>
          </>
        )}

        {/* get_issues fields */}
        {data.integrationOp === 'get_issues' && (
          <>
            <FormField label="Team (optional)" htmlFor="cfg-linear-team-g">
              <ResourcePicker
                provider="linear"
                kind="team"
                id="cfg-linear-team-g"
                value={typeof data.linearTeamId === 'string' ? data.linearTeamId : ''}
                onChange={(val) => updateNodeData(nodeId, { linearTeamId: val })}
                placeholder="Leave blank for all teams"
              />
            </FormField>
            <FormField label="Limit" htmlFor="cfg-linear-limit">
              <input
                id="cfg-linear-limit"
                type="number"
                value={String(typeof data.linearLimit === 'number' || typeof data.linearLimit === 'string' ? data.linearLimit : 25)}
                onChange={(e) => updateNodeData(nodeId, { linearLimit: Number(e.target.value) })}
                className={inputClass}
                placeholder="25"
              />
            </FormField>
          </>
        )}

        {/* create_comment fields */}
        {data.integrationOp === 'create_comment' && (
          <>
            <FormField label="Issue ID" htmlFor="cfg-linear-issue">
              <TemplateField
                id="cfg-linear-issue"
                value={typeof data.linearIssueId === 'string' ? data.linearIssueId : ''}
                onChange={(v) => updateNodeData(nodeId, { linearIssueId: v })}
                placeholder="{{prev-node.output}} or issue ID"
              />
            </FormField>
            <FormField label="Comment" htmlFor="cfg-linear-comment">
              <TemplateField
                id="cfg-linear-comment"
                multiline
                rows={3}
                value={typeof data.linearCommentBody === 'string' ? data.linearCommentBody : ''}
                onChange={(v) => updateNodeData(nodeId, { linearCommentBody: v })}
                placeholder="{{llm-1.output}}"
              />
            </FormField>
          </>
        )}

        {/* get_issue fields */}
        {data.integrationOp === 'get_issue' && (
          <FormField label="Issue ID" htmlFor="cfg-linear-issue-g">
            <TemplateField id="cfg-linear-issue-g"
              value={typeof data.linearIssueId === 'string' ? data.linearIssueId : ''}
              onChange={(v) => updateNodeData(nodeId, { linearIssueId: v })}
              placeholder="{{prev-node.output}} or issue ID" />
          </FormField>
        )}

        {/* search_issues fields */}
        {data.integrationOp === 'search_issues' && (
          <>
            <FormField label="Search text" htmlFor="cfg-linear-query">
              <TemplateField id="cfg-linear-query"
                value={typeof data.linearQuery === 'string' ? data.linearQuery : ''}
                onChange={(v) => updateNodeData(nodeId, { linearQuery: v })}
                placeholder="login bug" />
            </FormField>
            <FormField label="Limit" htmlFor="cfg-linear-limit-s">
              <input id="cfg-linear-limit-s" type="number"
                value={String(typeof data.linearLimit === 'number' ? data.linearLimit : 10)}
                onChange={(e) => updateNodeData(nodeId, { linearLimit: Number(e.target.value) })}
                className={inputClass} placeholder="10" />
            </FormField>
          </>
        )}

        {/* update_issue fields */}
        {data.integrationOp === 'update_issue' && (
          <>
            <FormField label="Issue ID" htmlFor="cfg-linear-issue-u">
              <TemplateField id="cfg-linear-issue-u"
                value={typeof data.linearIssueId === 'string' ? data.linearIssueId : ''}
                onChange={(v) => updateNodeData(nodeId, { linearIssueId: v })}
                placeholder="{{prev-node.output}} or issue ID" />
            </FormField>
            <FormField label="Title (optional)" htmlFor="cfg-linear-title-u">
              <TemplateField id="cfg-linear-title-u"
                value={typeof data.linearTitle === 'string' ? data.linearTitle : ''}
                onChange={(v) => updateNodeData(nodeId, { linearTitle: v })}
                placeholder="Leave blank to keep" />
            </FormField>
            <FormField label="Description (optional)" htmlFor="cfg-linear-desc-u">
              <TemplateField id="cfg-linear-desc-u" multiline rows={3}
                value={typeof data.linearDescription === 'string' ? data.linearDescription : ''}
                onChange={(v) => updateNodeData(nodeId, { linearDescription: v })}
                placeholder="{{llm-1.output}}" />
            </FormField>
            <FormField label="Move to project (optional)" htmlFor="cfg-linear-project-u">
              <ResourcePicker
                provider="linear" kind="project" id="cfg-linear-project-u"
                value={typeof data.linearProjectId === 'string' ? data.linearProjectId : ''}
                onChange={(val) => updateNodeData(nodeId, { linearProjectId: val })}
                placeholder="Leave blank to keep" />
            </FormField>
          </>
        )}
      </div>
  )
}

export function GithubConfig({ data, nodeId, updateNodeData }: ProviderConfigProps) {
  return (
      <IntegrationSection
        provider="github" label="GitHub" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
        defaultOp="create_issue"
        ops={[
          { value: 'create_issue', label: 'Create Issue' },
          { value: 'list_issues', label: 'List Issues' },
          { value: 'create_comment', label: 'Comment on Issue' },
          { value: 'list_pull_requests', label: 'List Pull Requests' },
          { value: 'get_pull_request', label: 'Get Pull Request' },
        ]}
        tokenPlaceholder="ghp_..."
      >
        <ResourceField label="Repository" provider="github" kind="repo" field="githubRepo" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="owner/name" />
        {data.integrationOp === 'create_issue' && (<>
          <TextField label="Title" field="githubTitle" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{llm-1.output}}" />
          <AreaField label="Body" field="githubBody" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{llm-1.output}}" />
          <TextField label="Labels (comma-separated)" field="githubLabels" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="bug, urgent" />
        </>)}
        {data.integrationOp === 'create_comment' && (<>
          <TextField label="Issue number" field="githubIssueNumber" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="42" />
          <AreaField label="Comment" field="githubBody" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{llm-1.output}}" />
        </>)}
        {(data.integrationOp === 'list_issues' || data.integrationOp === 'list_pull_requests') && (<>
          <SelectField label="State" field="githubState" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback="open"
            options={[{ value: 'open', label: 'Open' }, { value: 'closed', label: 'Closed' }, { value: 'all', label: 'All' }]} />
          <NumField label="Limit" field="githubLimit" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback={10} />
        </>)}
        {data.integrationOp === 'get_pull_request' && (
          <TextField label="PR number" field="githubPrNumber" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="7" />
        )}
      </IntegrationSection>
  )
}

export function GitlabConfig({ data, nodeId, updateNodeData }: ProviderConfigProps) {
  return (
      <IntegrationSection
        provider="gitlab" label="GitLab" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
        defaultOp="create_issue"
        ops={[
          { value: 'create_issue', label: 'Create Issue' },
          { value: 'list_issues', label: 'List Issues' },
          { value: 'create_comment', label: 'Comment on Issue' },
          { value: 'list_merge_requests', label: 'List Merge Requests' },
          { value: 'get_merge_request', label: 'Get Merge Request' },
        ]}
        tokenPlaceholder="glpat-..."
      >
        <ResourceField label="Project" provider="gitlab" kind="project" field="gitlabProjectId" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="Project ID" />
        {data.integrationOp === 'create_issue' && (<>
          <TextField label="Title" field="gitlabTitle" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{llm-1.output}}" />
          <AreaField label="Description" field="gitlabDescription" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{llm-1.output}}" />
          <TextField label="Labels (comma-separated)" field="gitlabLabels" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="bug, backend" />
        </>)}
        {data.integrationOp === 'create_comment' && (<>
          <TextField label="Issue IID" field="gitlabIssueIid" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="12" />
          <AreaField label="Comment" field="gitlabDescription" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{llm-1.output}}" />
        </>)}
        {(data.integrationOp === 'list_issues' || data.integrationOp === 'list_merge_requests') && (<>
          <SelectField label="State" field="gitlabState" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback="opened"
            options={[{ value: 'opened', label: 'Opened' }, { value: 'closed', label: 'Closed' }, { value: 'all', label: 'All' }]} />
          <NumField label="Limit" field="gitlabLimit" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback={10} />
        </>)}
        {data.integrationOp === 'get_merge_request' && (
          <TextField label="MR IID" field="gitlabMrIid" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="3" />
        )}
      </IntegrationSection>
  )
}

export function GmailConfig({ data, nodeId, updateNodeData }: ProviderConfigProps) {
  const op = data.integrationOp ?? 'send_email'
  return (
      <IntegrationSection
        provider="gmail" label="Gmail" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
        defaultOp="send_email"
        ops={[
          { value: 'send_email', label: 'Send Email' },
          { value: 'reply_to_message', label: 'Reply to Message' },
          { value: 'list_messages', label: 'List Messages' },
          { value: 'get_message', label: 'Get Message' },
          { value: 'get_thread', label: 'Get Thread' },
          { value: 'create_draft', label: 'Create Draft' },
          { value: 'list_drafts', label: 'List Drafts' },
          { value: 'send_draft', label: 'Send Draft' },
          { value: 'list_labels', label: 'List Labels' },
          { value: 'create_label', label: 'Create Label' },
          { value: 'add_label', label: 'Add Label to Message' },
          { value: 'remove_label', label: 'Remove Label from Message' },
          { value: 'mark_read', label: 'Mark as Read' },
          { value: 'mark_unread', label: 'Mark as Unread' },
          { value: 'archive_message', label: 'Archive Message' },
          { value: 'trash_message', label: 'Move to Trash' },
        ]}
        tokenPlaceholder=""
        hideManual
      >
        {(op === 'send_email' || op === 'create_draft') && (<>
          <TextField label="To" field="gmailTo" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="team@example.com" />
          <TextField label="Cc (optional)" field="gmailCc" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="" />
          <TextField label="Subject" field="gmailSubject" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{llm-1.output}}" />
          <AreaField label="Body" field="gmailBody" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{llm-1.output}}" />
        </>)}
        {op === 'reply_to_message' && (<>
          <TextField label="Message ID" field="gmailMessageId" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{prev-node.output.id}}" />
          <TextField label="To (optional — defaults to sender)" field="gmailTo" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="" />
          <AreaField label="Reply body" field="gmailBody" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{llm-1.output}}" />
        </>)}
        {op === 'list_messages' && (<>
          <TextField label="Search query" field="gmailQuery" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="is:unread newer_than:1d" />
          <NumField label="Limit" field="gmailLimit" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback={10} />
        </>)}
        {(op === 'get_message' || op === 'mark_read' || op === 'mark_unread' || op === 'archive_message' || op === 'trash_message') && (
          <TextField label="Message ID" field="gmailMessageId" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{prev-node.output.id}}" />
        )}
        {op === 'get_thread' && (
          <TextField label="Thread ID" field="gmailThreadId" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{prev-node.output.threadId}}" />
        )}
        {(op === 'add_label' || op === 'remove_label') && (<>
          <TextField label="Message ID" field="gmailMessageId" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{prev-node.output.id}}" />
          <ResourceField label="Label" provider="gmail" kind="label" field="gmailLabelId" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="Label_123 or IMPORTANT" />
        </>)}
        {op === 'create_label' && (
          <TextField label="Label name" field="gmailLabelName" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="Automated" />
        )}
        {op === 'list_drafts' && (
          <NumField label="Limit" field="gmailLimit" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback={10} />
        )}
        {op === 'send_draft' && (
          <TextField label="Draft ID" field="gmailDraftId" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{prev-node.output.id}}" />
        )}
      </IntegrationSection>
  )
}

export function StripeConfig({ data, nodeId, updateNodeData }: ProviderConfigProps) {
  return (
      <IntegrationSection
        provider="stripe" label="Stripe" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
        defaultOp="list_customers"
        ops={[
          { value: 'list_customers', label: 'List Customers' },
          { value: 'list_payments', label: 'List Payments' },
          { value: 'list_invoices', label: 'List Invoices' },
          { value: 'get_balance', label: 'Get Balance' },
          { value: 'create_payment_link', label: 'Create Payment Link' },
        ]}
        tokenPlaceholder="sk_..."
      >
        {data.integrationOp === 'list_customers' && (
          <TextField label="Filter by email (optional)" field="stripeCustomerEmail" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="jane@example.com" />
        )}
        {(data.integrationOp === 'list_customers' || data.integrationOp === 'list_payments' || data.integrationOp === 'list_invoices') && (
          <NumField label="Limit" field="stripeLimit" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback={10} />
        )}
        {data.integrationOp === 'create_payment_link' && (<>
          <ResourceField label="Price" provider="stripe" kind="price" field="stripePriceId" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="price_..." />
          <NumField label="Quantity" field="stripeQuantity" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback={1} />
        </>)}
      </IntegrationSection>
  )
}

export function ShopifyConfig({ data, nodeId, updateNodeData }: ProviderConfigProps) {
  return (
      <IntegrationSection
        provider="shopify" label="Shopify" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
        defaultOp="list_orders"
        ops={[
          { value: 'list_orders', label: 'List Orders' },
          { value: 'get_order', label: 'Get Order' },
          { value: 'list_products', label: 'List Products' },
          { value: 'create_product', label: 'Create Product' },
          { value: 'list_customers', label: 'List Customers' },
        ]}
        tokenPlaceholder="shpat_..."
        hideManual
      >
        {data.integrationOp === 'list_orders' && (<>
          <SelectField label="Status" field="shopifyStatus" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback="any"
            options={[{ value: 'any', label: 'Any' }, { value: 'open', label: 'Open' }, { value: 'closed', label: 'Closed' }]} />
          <NumField label="Limit" field="shopifyLimit" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback={10} />
        </>)}
        {(data.integrationOp === 'list_products' || data.integrationOp === 'list_customers') && (
          <NumField label="Limit" field="shopifyLimit" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback={10} />
        )}
        {data.integrationOp === 'get_order' && (
          <TextField label="Order ID" field="shopifyOrderId" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{prev-node.output}}" />
        )}
        {data.integrationOp === 'create_product' && (<>
          <TextField label="Title" field="shopifyTitle" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{llm-1.output}}" />
          <AreaField label="Description" field="shopifyDescription" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{llm-1.output}}" />
          <TextField label="Price" field="shopifyPrice" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="19.99" />
        </>)}
      </IntegrationSection>
  )
}

export function GoogleCalendarConfig({ data, nodeId, updateNodeData }: ProviderConfigProps) {
  return (
      <IntegrationSection
        provider="googlecalendar" label="Google Calendar" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
        defaultOp="list_events"
        ops={[
          { value: 'list_events', label: 'List Events' },
          { value: 'create_event', label: 'Create Event' },
          { value: 'delete_event', label: 'Delete Event' },
        ]}
        tokenPlaceholder=""
        hideManual
      >
        <ResourceField label="Calendar" provider="googlecalendar" kind="calendar" field="gcalCalendarId" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="primary" />
        {data.integrationOp === 'list_events' && (
          <NumField label="Limit" field="gcalLimit" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback={10} />
        )}
        {data.integrationOp === 'create_event' && (<>
          <TextField label="Title" field="gcalSummary" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{llm-1.output}}" />
          <AreaField label="Description" field="gcalDescription" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{llm-1.output}}" />
          <TextField label="Start (RFC3339)" field="gcalStart" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="2026-07-20T15:00:00Z" />
          <TextField label="End (RFC3339)" field="gcalEnd" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="2026-07-20T16:00:00Z" />
          <TextField label="Attendees (comma-separated)" field="gcalAttendees" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="a@x.com, b@y.com" />
        </>)}
        {data.integrationOp === 'delete_event' && (
          <TextField label="Event ID" field="gcalEventId" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{prev-node.output}}" />
        )}
      </IntegrationSection>
  )
}

export function OutlookConfig({ data, nodeId, updateNodeData }: ProviderConfigProps) {
  const op = data.integrationOp ?? 'send_email'
  return (
      <IntegrationSection
        provider="outlook" label="Outlook" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
        defaultOp="send_email"
        ops={[
          { value: 'send_email', label: 'Send Email' },
          { value: 'reply_to_message', label: 'Reply to Message' },
          { value: 'forward_message', label: 'Forward Message' },
          { value: 'create_draft', label: 'Create Draft' },
          { value: 'list_messages', label: 'List Messages' },
          { value: 'get_message', label: 'Get Message' },
          { value: 'move_message', label: 'Move Message' },
          { value: 'mark_read', label: 'Mark as Read' },
          { value: 'flag_message', label: 'Flag Message' },
          { value: 'delete_message', label: 'Delete Message' },
          { value: 'list_folders', label: 'List Folders' },
          { value: 'create_event', label: 'Create Event' },
          { value: 'list_events', label: 'List Events' },
          { value: 'update_event', label: 'Update Event' },
          { value: 'delete_event', label: 'Delete Event' },
          { value: 'respond_to_event', label: 'Respond to Event' },
          { value: 'list_contacts', label: 'List Contacts' },
          { value: 'create_contact', label: 'Create Contact' },
        ]}
        tokenPlaceholder=""
        hideManual
      >
        {(op === 'send_email' || op === 'create_draft') && (<>
          <TextField label="To" field="outlookTo" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="team@example.com" />
          <TextField label="Cc (optional)" field="outlookCc" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="" />
          <TextField label="Subject" field="outlookSubject" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{llm-1.output}}" />
          <AreaField label="Body (HTML)" field="outlookBody" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{llm-1.output}}" />
        </>)}
        {op === 'reply_to_message' && (<>
          <TextField label="Message ID" field="outlookMessageId" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{prev-node.output.id}}" />
          <AreaField label="Reply" field="outlookComment" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{llm-1.output}}" />
        </>)}
        {op === 'forward_message' && (<>
          <TextField label="Message ID" field="outlookMessageId" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{prev-node.output.id}}" />
          <TextField label="To" field="outlookTo" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="team@example.com" />
          <AreaField label="Comment (optional)" field="outlookComment" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="FYI" />
        </>)}
        {op === 'list_messages' && (<>
          <TextField label="Search query (optional)" field="outlookQuery" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="from:jane subject:invoice" />
          <NumField label="Limit" field="outlookLimit" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback={10} />
        </>)}
        {(op === 'get_message' || op === 'mark_read' || op === 'flag_message' || op === 'delete_message') && (
          <TextField label="Message ID" field="outlookMessageId" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{prev-node.output.id}}" />
        )}
        {op === 'move_message' && (<>
          <TextField label="Message ID" field="outlookMessageId" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{prev-node.output.id}}" />
          <ResourceField label="Destination folder" provider="outlook" kind="folder" field="outlookFolderId" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="Folder id from List Folders" />
        </>)}
        {op === 'create_event' && (<>
          <TextField label="Title" field="outlookSubject" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{llm-1.output}}" />
          <AreaField label="Body (HTML)" field="outlookBody" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{llm-1.output}}" />
          <TextField label="Start (RFC3339)" field="outlookStart" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="2026-07-20T15:00:00" />
          <TextField label="End (RFC3339)" field="outlookEnd" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="2026-07-20T16:00:00" />
        </>)}
        {op === 'list_events' && (<>
          <TextField label="Window start (optional, RFC3339)" field="outlookStart" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="2026-07-20T00:00:00Z" />
          <TextField label="Window end (optional, RFC3339)" field="outlookEnd" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="2026-07-27T00:00:00Z" />
          <NumField label="Limit" field="outlookLimit" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback={10} />
        </>)}
        {op === 'update_event' && (<>
          <TextField label="Event ID" field="outlookEventId" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{prev-node.output.id}}" />
          <TextField label="Title (optional)" field="outlookSubject" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="Leave blank to keep" />
          <AreaField label="Body (optional, HTML)" field="outlookBody" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="Leave blank to keep" />
          <TextField label="Start (optional, RFC3339)" field="outlookStart" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="Leave blank to keep" />
          <TextField label="End (optional, RFC3339)" field="outlookEnd" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="Leave blank to keep" />
        </>)}
        {op === 'delete_event' && (
          <TextField label="Event ID" field="outlookEventId" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{prev-node.output.id}}" />
        )}
        {op === 'respond_to_event' && (<>
          <TextField label="Event ID" field="outlookEventId" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{prev-node.output.id}}" />
          <SelectField label="Response" field="outlookResponse" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback="accept"
            options={[{ value: 'accept', label: 'Accept' }, { value: 'decline', label: 'Decline' }, { value: 'tentativelyAccept', label: 'Tentative' }]} />
          <TextField label="Comment (optional)" field="outlookComment" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="" />
        </>)}
        {op === 'list_contacts' && (<>
          <TextField label="Search (optional)" field="outlookQuery" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="jane" />
          <NumField label="Limit" field="outlookLimit" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback={25} />
        </>)}
        {op === 'create_contact' && (<>
          <TextField label="Name" field="outlookContactName" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="Jane Doe" />
          <TextField label="Email" field="outlookContactEmail" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="jane@example.com" />
        </>)}
      </IntegrationSection>
  )
}

export function SlackConfig({ data, nodeId, updateNodeData }: ProviderConfigProps) {
  const op = data.integrationOp ?? 'send_message'
  const needsChannel = ['send_message', 'reply_in_thread', 'update_message', 'delete_message', 'schedule_message',
    'add_reaction', 'pin_message', 'archive_channel', 'join_channel', 'invite_to_channel', 'set_channel_topic',
    'upload_file', 'get_channel_history'].includes(op)
  const needsMessageTs = ['update_message', 'delete_message', 'add_reaction', 'pin_message'].includes(op)
  const needsText = ['send_message', 'send_dm', 'reply_in_thread', 'update_message', 'schedule_message'].includes(op)
  return (
      <IntegrationSection
        provider="slack" label="Slack" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
        defaultOp="send_message"
        ops={[
          { value: 'send_message', label: 'Send Message' },
          { value: 'send_dm', label: 'Send Direct Message' },
          { value: 'reply_in_thread', label: 'Reply in Thread' },
          { value: 'update_message', label: 'Update Message' },
          { value: 'delete_message', label: 'Delete Message' },
          { value: 'schedule_message', label: 'Schedule Message' },
          { value: 'add_reaction', label: 'Add Reaction' },
          { value: 'pin_message', label: 'Pin Message' },
          { value: 'upload_file', label: 'Upload File' },
          { value: 'create_channel', label: 'Create Channel' },
          { value: 'archive_channel', label: 'Archive Channel' },
          { value: 'join_channel', label: 'Join Channel' },
          { value: 'invite_to_channel', label: 'Invite to Channel' },
          { value: 'set_channel_topic', label: 'Set Channel Topic' },
          { value: 'list_channels', label: 'List Channels' },
          { value: 'get_channel_history', label: 'Conversation History' },
          { value: 'list_users', label: 'List Users' },
          { value: 'get_user_by_email', label: 'Find User by Email' },
          { value: 'search_messages', label: 'Search Messages' },
        ]}
        tokenPlaceholder=""
        hideManual
      >
        {needsChannel && (
          <ResourceField label="Channel" provider="slack" kind="channel" field="slackChannel" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="#general or C0123..." />
        )}
        {(op === 'send_message' || op === 'reply_in_thread') && (<>
          <SelectField label="Send as" field="slackSendAs" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback="bot"
            options={[{ value: 'bot', label: 'Bot (app identity)' }, { value: 'user', label: 'Me (my Slack identity)' }]} />
          {op === 'send_message' && (data.slackSendAs ?? 'bot') === 'bot' && (
            <TextField label="Bot name (optional)" field="slackBotName" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="Flowe Reporter" />
          )}
        </>)}
        {op === 'reply_in_thread' && (
          <TextField label="Thread ts" field="slackThreadTs" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{prev-node.output.ts}}" />
        )}
        {needsMessageTs && (
          <TextField label="Message ts" field="slackMessageTs" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{prev-node.output.ts}}" />
        )}
        {op === 'send_dm' && (
          <ResourceField label="Recipient" provider="slack" kind="user" field="slackUserId" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="@teammate or U0123..." />
        )}
        {needsText && (
          <AreaField label="Message" field="slackText" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{llm-1.output}}" />
        )}
        {op === 'send_dm' && (
          <p className="-mt-2 text-[10px] leading-relaxed text-[var(--color-muted)]">
            Direct messages are always sent as you, from your Slack account.
          </p>
        )}
        {op === 'schedule_message' && (
          <TextField label="Post at (RFC3339)" field="slackPostAt" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="2026-07-20T15:00:00Z" />
        )}
        {op === 'add_reaction' && (
          <TextField label="Emoji (no colons)" field="slackEmoji" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="tada" />
        )}
        {op === 'upload_file' && (<>
          <TextField label="File name" field="slackFileName" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="report.md" />
          <AreaField label="File content" field="slackFileContent" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{llm-1.output}}" />
        </>)}
        {op === 'create_channel' && (<>
          <TextField label="Channel name" field="slackChannelName" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="launch-updates" />
          <SelectField label="Visibility" field="slackPrivate" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback="false"
            options={[{ value: 'false', label: 'Public' }, { value: 'true', label: 'Private' }]} />
        </>)}
        {op === 'invite_to_channel' && (
          <TextField label="User IDs (comma-separated)" field="slackUserId" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="U0123, U0456" />
        )}
        {op === 'set_channel_topic' && (
          <TextField label="Topic" field="slackTopic" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{llm-1.output}}" />
        )}
        {op === 'get_user_by_email' && (
          <TextField label="Email" field="slackEmail" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="jane@example.com" />
        )}
        {op === 'search_messages' && (<>
          <TextField label="Search query" field="slackText" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="deploy failed in:#alerts" />
          <p className="-mt-2 text-[10px] leading-relaxed text-[var(--color-muted)]">
            Search runs as you (your Slack identity), not the bot.
          </p>
        </>)}
        {(op === 'list_channels' || op === 'get_channel_history' || op === 'list_users' || op === 'search_messages') && (
          <NumField label="Limit" field="slackLimit" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback={op === 'list_channels' || op === 'list_users' ? 100 : 20} />
        )}
      </IntegrationSection>
  )
}

export function GoogleDriveConfig({ data, nodeId, updateNodeData }: ProviderConfigProps) {
  return (
      <IntegrationSection
        provider="googledrive" label="Google Drive" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
        defaultOp="list_files"
        ops={[
          { value: 'list_files', label: 'List Files' },
          { value: 'search', label: 'Search' },
          { value: 'get_file', label: 'Get File' },
          { value: 'create_folder', label: 'Create Folder' },
          { value: 'delete_file', label: 'Delete File' },
        ]}
        tokenPlaceholder=""
        hideManual
      >
        {(data.integrationOp === 'list_files' || data.integrationOp === 'search') && (<>
          <TextField label="Query (optional)" field="gdriveQuery" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="name contains 'report'" />
          <NumField label="Limit" field="gdriveLimit" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback={20} />
        </>)}
        {(data.integrationOp === 'get_file' || data.integrationOp === 'delete_file') && (
          <TextField label="File ID" field="gdriveFileId" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{prev-node.output}}" />
        )}
        {data.integrationOp === 'create_folder' && (<>
          <TextField label="Folder name" field="gdriveName" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{llm-1.output}}" />
          <ResourceField label="Parent folder (optional)" provider="googledrive" kind="folder" field="gdriveParentId" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="root" />
        </>)}
      </IntegrationSection>
  )
}

export function GoogleDocsConfig({ data, nodeId, updateNodeData }: ProviderConfigProps) {
  return (
      <IntegrationSection
        provider="googledocs" label="Google Docs" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
        defaultOp="create_document"
        ops={[
          { value: 'create_document', label: 'Create Document' },
          { value: 'get_document', label: 'Get Document' },
          { value: 'append_text', label: 'Append Text' },
        ]}
        tokenPlaceholder=""
        hideManual
      >
        {data.integrationOp === 'create_document' && (
          <TextField label="Title" field="gdocsTitle" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{llm-1.output}}" />
        )}
        {(data.integrationOp === 'get_document' || data.integrationOp === 'append_text') && (
          <TextField label="Document ID" field="gdocsDocumentId" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{prev-node.output}}" />
        )}
        {data.integrationOp === 'append_text' && (
          <AreaField label="Text to append" field="gdocsText" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{llm-1.output}}" />
        )}
      </IntegrationSection>
  )
}

export function GoogleSheetsConfig({ data, nodeId, updateNodeData }: ProviderConfigProps) {
  return (
      <IntegrationSection
        provider="googlesheets" label="Google Sheets" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
        defaultOp="read_range"
        ops={[
          { value: 'read_range', label: 'Read Range' },
          { value: 'append_row', label: 'Append Row' },
          { value: 'update_range', label: 'Update Range' },
          { value: 'create_spreadsheet', label: 'Create Spreadsheet' },
        ]}
        tokenPlaceholder=""
        hideManual
      >
        {data.integrationOp !== 'create_spreadsheet' && (
          <TextField label="Spreadsheet ID" field="gsheetsSpreadsheetId" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{prev-node.output}}" />
        )}
        {(data.integrationOp === 'read_range' || data.integrationOp === 'append_row' || data.integrationOp === 'update_range') && (
          <TextField label="Range (A1)" field="gsheetsRange" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="Sheet1!A1:C10" />
        )}
        {(data.integrationOp === 'append_row' || data.integrationOp === 'update_range') && (
          <TextField label="Values (comma-separated)" field="gsheetsValues" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="Jane, jane@x.com, {{llm-1.output}}" />
        )}
        {data.integrationOp === 'create_spreadsheet' && (
          <TextField label="Title" field="gsheetsTitle" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{llm-1.output}}" />
        )}
      </IntegrationSection>
  )
}
