import { useState } from 'react'
import { FormField, inputClass } from '@/components/ui/FormField'
import { TemplateField } from '@/components/ui/TemplateField'
import { Select } from '@/components/ui/select'
import { DateTimePicker } from '@/components/ui/DateTimePicker'
import { IntegrationConnect } from '@/components/ui/IntegrationConnect'
import { ResourcePicker } from '@/components/ui/ResourcePicker'
import type { FlowNodeData } from '@/types/workflow'
import { Input } from '@/components/ui/input'

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
      <Input id={`cfg-${nodeId}-${field}`} type="number" className={inputClass}
        value={String(typeof data[field] === 'number' ? (data[field] as number) : fallback)}
        onChange={(e) => updateNodeData(nodeId, { [field]: Number(e.target.value) })} />
    </FormField>
  )
}

// Calendar + time popover; stores ISO 8601 UTC in the node data so the
// backend can pass it straight to provider APIs.
function DateTimeField({ label, field, data, nodeId, updateNodeData }: FieldProps) {
  return (
    <FormField label={label} htmlFor={`cfg-${nodeId}-${field}`}>
      <DateTimePicker id={`cfg-${nodeId}-${field}`}
        value={typeof data[field] === 'string' ? (data[field] as string) : ''}
        onChange={(iso) => updateNodeData(nodeId, { [field]: iso })} />
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

type ResourceProvider = 'airtable' | 'clickup' | 'notion' | 'linear' | 'github' | 'gitlab' | 'gmail' | 'stripe' | 'googlecalendar' | 'googledrive' | 'outlook' | 'slack' | 'jira' | 'confluence' | 'bitbucket' | 'googlemeet' | 'googleslides' | 'googleforms' | 'googletasks' | 'googlechat' | 'googlekeep'
type ResourceKind = 'database' | 'page' | 'team' | 'project' | 'repo' | 'price' | 'calendar' | 'folder' | 'channel' | 'user' | 'label' | 'space' | 'board' | 'tasklist' | 'base' | 'workspace'

function ResourceField({ label, provider, kind, field, data, nodeId, updateNodeData, placeholder }: FieldProps & { provider: ResourceProvider; kind: ResourceKind }) {
  return (
    <FormField label={label} htmlFor={`cfg-${nodeId}-${field}`}>
      <ResourcePicker provider={provider} kind={kind} id={`cfg-${nodeId}-${field}`} placeholder={placeholder}
        value={typeof data[field] === 'string' ? (data[field] as string) : ''}
        onChange={(val) => updateNodeData(nodeId, { [field]: val })} />
    </FormField>
  )
}


// FilePickField: file-upload ops take a real file instead of typed content.
// Picking a file reads it as text and fills the provider's content + name
// fields (and MIME type where given); "Use template content instead" swaps
// in the TemplateField for workflow-generated files (e.g. LLM output).
const FILE_PICK_MAX = 1 << 20 // 1MB — content is stored in the workflow JSON

function FilePickField({ data, nodeId, updateNodeData, contentField, nameField, mimeField, pathField, contentLabel = 'Content' }: {
  data: FlowNodeData
  nodeId: string
  updateNodeData: UpdateFn
  contentField: string
  /** hard-set to the picked file's name (Slack/Drive uploads) */
  nameField?: string
  mimeField?: string
  /** set to the picked file's name only when currently empty (repo commits keep their path field) */
  pathField?: string
  contentLabel?: string
}) {
  const [manual, setManual] = useState(false)
  const [pickedName, setPickedName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const name = nameField && typeof data[nameField] === 'string' ? (data[nameField] as string) : pickedName
  const content = typeof data[contentField] === 'string' ? (data[contentField] as string) : ''
  const hasFile = !manual && content !== '' && name !== ''

  function handleFile(file: File | undefined) {
    if (!file) return
    if (file.size > FILE_PICK_MAX) {
      setError('File is too large — 1MB max (larger files: use template content from an upstream node)')
      return
    }
    setError(null)
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = typeof ev.target?.result === 'string' ? ev.target.result : ''
      const partial: Record<string, unknown> = { [contentField]: text }
      if (nameField) partial[nameField] = file.name
      if (mimeField) partial[mimeField] = file.type || 'text/plain'
      if (pathField && !(typeof data[pathField] === 'string' && data[pathField])) partial[pathField] = file.name
      setPickedName(file.name)
      updateNodeData(nodeId, partial as Partial<FlowNodeData>)
    }
    reader.onerror = () => setError('Could not read that file')
    reader.readAsText(file)
  }

  function clear() {
    const partial: Record<string, unknown> = { [contentField]: '' }
    if (nameField) partial[nameField] = ''
    setPickedName('')
    updateNodeData(nodeId, partial as Partial<FlowNodeData>)
  }

  return (
    <div className="mb-3 flex flex-col gap-1.5">
      <span className="micro text-[var(--color-subtle)]">{contentLabel}</span>
      {manual ? (
        <>
          {nameField && (
            <TextField label="File name" field={nameField} data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="report.md" />
          )}
          <AreaField label={contentLabel} field={contentField} data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{llm-1.output}}" />
        </>
      ) : hasFile ? (
        <div className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface2)] px-3 py-2.5">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="flex-shrink-0 text-[var(--color-accent)]">
            <path d="M4 2h5l3 3v9H4V2zM9 2v3h3" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
          </svg>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-medium text-[var(--color-text)]">{name}</p>
            <p className="text-[10px] text-[var(--color-subtle)]">{(content.length / 1024).toFixed(1)} KB loaded</p>
          </div>
          <button
            type="button"
            onClick={clear}
            className="flex-shrink-0 text-[11px] text-[var(--color-muted)] transition-colors hover:text-[var(--color-fail)]"
          >
            Remove
          </button>
        </div>
      ) : (
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--color-border2)] px-4 py-4 text-[12px] text-[var(--color-muted)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-text)]">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1v8M4 4l3-3 3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M1 10v1.5A1.5 1.5 0 002.5 13h9a1.5 1.5 0 001.5-1.5V10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          Select file
          <input
            type="file"
            className="sr-only"
            onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = '' }}
          />
        </label>
      )}
      {error && <p className="text-[11px] text-[var(--color-fail)]">{error}</p>}
      <button
        type="button"
        onClick={() => { setManual((v) => !v); setError(null) }}
        className="self-start text-[10px] text-[var(--color-subtle)] transition-colors hover:text-[var(--color-text)]"
      >
        {manual ? '− Select a file instead' : '+ Use template content instead'}
      </button>
    </div>
  )
}

// IntegrationSection renders the operation selector + Connect card shared by
// the github/gitlab/gmail/stripe/shopify config blocks, then its children
// (the per-op fields).
function IntegrationSection({
  provider, label, data, nodeId, updateNodeData, defaultOp, ops, tokenPlaceholder, hideManual, children,
}: {
  provider: 'github' | 'gitlab' | 'gmail' | 'stripe' | 'shopify' | 'googlecalendar' | 'outlook' | 'slack' | 'googledrive' | 'googledocs' | 'googlesheets' | 'jira' | 'confluence' | 'bitbucket' | 'granola' | 'resend' | 'sendgrid' | 'kit' | 'airtable' | 'clickup' | 'typeform' | 'calendly' | 'googlemeet' | 'googleslides' | 'googleforms' | 'googletasks' | 'googlechat' | 'googlekeep'
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
            <Input id={`cfg-${nodeId}-token`} type="password" className={inputClass} placeholder={tokenPlaceholder}
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
              { value: 'list_comments', label: 'List Comments' },
              { value: 'create_subpage', label: 'Create Subpage' },
              { value: 'archive_page', label: 'Archive Page' },
              { value: 'create_database', label: 'Create Database' },
              { value: 'get_database', label: 'Get Database Schema' },
              { value: 'list_users', label: 'List Users' },
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
                <Input
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

        {(data.integrationOp === 'list_comments' || data.integrationOp === 'archive_page') && (
          <FormField label="Page" htmlFor="cfg-notion-page-x">
            <ResourcePicker
              provider="notion" kind="page" id="cfg-notion-page-x"
              value={typeof data.notionPageId === 'string' ? data.notionPageId : ''}
              onChange={(val) => updateNodeData(nodeId, { notionPageId: val })}
              placeholder="{{prev-node.output}} or page ID"
            />
          </FormField>
        )}
        {(data.integrationOp === 'create_subpage' || data.integrationOp === 'create_database') && (
          <FormField label="Parent page" htmlFor="cfg-notion-parent">
            <ResourcePicker
              provider="notion" kind="page" id="cfg-notion-parent"
              value={typeof data.notionParentPageId === 'string' ? data.notionParentPageId : ''}
              onChange={(val) => updateNodeData(nodeId, { notionParentPageId: val })}
              placeholder="Parent page ID"
            />
          </FormField>
        )}
        {data.integrationOp === 'create_subpage' && (<>
          <TextField label="Title" field="notionTitle" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{llm-1.output}}" />
          <AreaField label="Content" field="notionContent" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{llm-1.output}}" />
        </>)}
        {data.integrationOp === 'create_database' && (<>
          <TextField label="Database title" field="notionTitle" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="Tasks" />
          <AreaField label="Schema (JSON properties, optional)" field="notionSchema" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder={'{"Status":{"select":{"options":[{"name":"Todo"}]}}}'} />
        </>)}
        {data.integrationOp === 'get_database' && (
          <FormField label="Database" htmlFor="cfg-notion-db-schema">
            <ResourcePicker
              provider="notion" kind="database" id="cfg-notion-db-schema"
              value={typeof data.notionDatabaseId === 'string' ? data.notionDatabaseId : ''}
              onChange={(val) => updateNodeData(nodeId, { notionDatabaseId: val })}
              placeholder="Database ID"
            />
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
              { value: 'list_comments', label: 'List Comments' },
              { value: 'archive_issue', label: 'Archive Issue' },
              { value: 'add_label', label: 'Add Label to Issue' },
              { value: 'list_labels', label: 'List Labels' },
              { value: 'list_states', label: 'List Workflow States' },
              { value: 'list_teams', label: 'List Teams' },
              { value: 'list_users', label: 'List Users' },
              { value: 'list_cycles', label: 'List Cycles' },
              { value: 'create_project', label: 'Create Project' },
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
                <Input
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
              <Input
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
              <Input id="cfg-linear-limit-s" type="number"
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

        {(data.integrationOp === 'list_comments' || data.integrationOp === 'archive_issue' || data.integrationOp === 'add_label') && (
          <TextField label="Issue ID" field="linearIssueId" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{prev-node.output}} or issue ID" />
        )}
        {data.integrationOp === 'add_label' && (
          <TextField label="Label ID (from List Labels)" field="linearLabelId" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="label uuid" />
        )}
        {(data.integrationOp === 'list_labels' || data.integrationOp === 'list_states' || data.integrationOp === 'list_cycles' || data.integrationOp === 'create_project') && (
          <FormField label="Team" htmlFor="cfg-linear-team-x">
            <ResourcePicker
              provider="linear" kind="team" id="cfg-linear-team-x"
              value={typeof data.linearTeamId === 'string' ? data.linearTeamId : ''}
              onChange={(val) => updateNodeData(nodeId, { linearTeamId: val })}
              placeholder="Team ID"
            />
          </FormField>
        )}
        {data.integrationOp === 'create_project' && (<>
          <TextField label="Project name" field="linearTitle" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="Q3 Launch" />
          <AreaField label="Description" field="linearDescription" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{llm-1.output}}" />
        </>)}
      </div>
  )
}

export function GithubConfig({ data, nodeId, updateNodeData }: ProviderConfigProps) {
  const op = data.integrationOp ?? 'create_issue'
  const needsRepo = op !== 'list_repos' && op !== 'search_issues'
  return (
      <IntegrationSection
        provider="github" label="GitHub" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
        defaultOp="create_issue"
        ops={[
          { value: 'create_issue', label: 'Create Issue' },
          { value: 'get_issue', label: 'Get Issue' },
          { value: 'update_issue', label: 'Update Issue' },
          { value: 'list_issues', label: 'List Issues' },
          { value: 'search_issues', label: 'Search Issues (all repos)' },
          { value: 'create_comment', label: 'Comment on Issue' },
          { value: 'create_pull_request', label: 'Create Pull Request' },
          { value: 'merge_pull_request', label: 'Merge Pull Request' },
          { value: 'list_pull_requests', label: 'List Pull Requests' },
          { value: 'get_pull_request', label: 'Get Pull Request' },
          { value: 'list_pr_files', label: 'List PR Files' },
          { value: 'list_commits', label: 'List Commits' },
          { value: 'list_branches', label: 'List Branches' },
          { value: 'get_file', label: 'Read File' },
          { value: 'create_or_update_file', label: 'Commit File' },
          { value: 'list_releases', label: 'List Releases' },
          { value: 'create_release', label: 'Create Release' },
          { value: 'trigger_workflow', label: 'Trigger Actions Workflow' },
          { value: 'list_workflow_runs', label: 'List Workflow Runs' },
          { value: 'list_repos', label: 'List My Repos' },
        ]}
        tokenPlaceholder="ghp_..."
      >
        {needsRepo && (
          <ResourceField label="Repository" provider="github" kind="repo" field="githubRepo" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="owner/name" />
        )}
        {op === 'create_issue' && (<>
          <TextField label="Title" field="githubTitle" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{llm-1.output}}" />
          <AreaField label="Body" field="githubBody" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{llm-1.output}}" />
          <TextField label="Labels (comma-separated)" field="githubLabels" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="bug, urgent" />
        </>)}
        {(op === 'get_issue' || op === 'update_issue' || op === 'create_comment') && (
          <TextField label="Issue number" field="githubIssueNumber" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="42" />
        )}
        {op === 'update_issue' && (<>
          <TextField label="Title (optional)" field="githubTitle" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="Leave blank to keep" />
          <AreaField label="Body (optional)" field="githubBody" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="Leave blank to keep" />
          <SelectField label="State" field="githubState" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback=""
            options={[{ value: '', label: 'Keep current' }, { value: 'open', label: 'Open' }, { value: 'closed', label: 'Closed' }]} />
          <TextField label="Labels (optional, replaces all)" field="githubLabels" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="bug, urgent" />
        </>)}
        {op === 'create_comment' && (
          <AreaField label="Comment" field="githubBody" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{llm-1.output}}" />
        )}
        {op === 'search_issues' && (
          <TextField label="Search query" field="githubQuery" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="is:open label:bug repo:owner/name" />
        )}
        {op === 'create_pull_request' && (<>
          <TextField label="Title" field="githubTitle" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{llm-1.output}}" />
          <AreaField label="Body" field="githubBody" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{llm-1.output}}" />
          <TextField label="Head branch" field="githubBranch" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="feature/my-change" />
          <TextField label="Base branch" field="githubBase" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="main" />
        </>)}
        {(op === 'merge_pull_request' || op === 'get_pull_request' || op === 'list_pr_files') && (
          <TextField label="PR number" field="githubPrNumber" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="7" />
        )}
        {op === 'merge_pull_request' && (
          <SelectField label="Merge method" field="githubMergeMethod" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback="merge"
            options={[{ value: 'merge', label: 'Merge commit' }, { value: 'squash', label: 'Squash' }, { value: 'rebase', label: 'Rebase' }]} />
        )}
        {(op === 'list_issues' || op === 'list_pull_requests') && (
          <SelectField label="State" field="githubState" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback="open"
            options={[{ value: 'open', label: 'Open' }, { value: 'closed', label: 'Closed' }, { value: 'all', label: 'All' }]} />
        )}
        {(op === 'list_commits' || op === 'get_file') && (
          <TextField label="Branch/ref (optional)" field="githubRef" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="main" />
        )}
        {(op === 'get_file' || op === 'create_or_update_file') && (
          <TextField label="File path" field="githubPath" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="docs/report.md" />
        )}
        {op === 'create_or_update_file' && (<>
          <FilePickField data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            contentField="githubContent" pathField="githubPath" contentLabel="File content" />
          <TextField label="Commit message" field="githubCommitMessage" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="Update report" />
          <TextField label="Branch (optional)" field="githubBranch" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="main" />
        </>)}
        {op === 'create_release' && (<>
          <TextField label="Tag" field="githubTag" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="v1.2.0" />
          <TextField label="Release title (optional)" field="githubTitle" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="defaults to tag" />
          <AreaField label="Notes (optional)" field="githubBody" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{llm-1.output}}" />
        </>)}
        {op === 'trigger_workflow' && (<>
          <TextField label="Workflow file" field="githubWorkflowId" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="deploy.yml" />
          <TextField label="Ref" field="githubRef" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="main" />
          <AreaField label="Inputs (optional JSON)" field="githubBody" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder={'{"environment":"prod"}'} />
        </>)}
        {(op === 'list_commits' || op === 'list_workflow_runs') && (<>
          <DateTimeField label={op === 'list_commits' ? 'Committed after (optional)' : 'Created after (optional)'}
            field="githubSince" data={data} nodeId={nodeId} updateNodeData={updateNodeData} />
          <DateTimeField label={op === 'list_commits' ? 'Committed before (optional)' : 'Created before (optional)'}
            field="githubUntil" data={data} nodeId={nodeId} updateNodeData={updateNodeData} />
        </>)}
        {op === 'list_issues' && (
          <DateTimeField label="Updated after (optional)" field="githubSince" data={data} nodeId={nodeId} updateNodeData={updateNodeData} />
        )}
        {['list_issues', 'list_pull_requests', 'list_commits', 'list_branches', 'list_releases', 'list_workflow_runs', 'search_issues', 'list_repos', 'list_pr_files'].includes(op) && (
          <NumField label="Limit" field="githubLimit" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback={10} />
        )}
      </IntegrationSection>
  )
}

export function GitlabConfig({ data, nodeId, updateNodeData }: ProviderConfigProps) {
  const op = data.integrationOp ?? 'create_issue'
  return (
      <IntegrationSection
        provider="gitlab" label="GitLab" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
        defaultOp="create_issue"
        ops={[
          { value: 'create_issue', label: 'Create Issue' },
          { value: 'get_issue', label: 'Get Issue' },
          { value: 'update_issue', label: 'Update Issue' },
          { value: 'list_issues', label: 'List Issues' },
          { value: 'create_comment', label: 'Comment on Issue' },
          { value: 'create_merge_request', label: 'Create Merge Request' },
          { value: 'merge_mr', label: 'Merge MR' },
          { value: 'list_merge_requests', label: 'List Merge Requests' },
          { value: 'get_merge_request', label: 'Get Merge Request' },
          { value: 'list_branches', label: 'List Branches' },
          { value: 'list_commits', label: 'List Commits' },
          { value: 'list_pipelines', label: 'List Pipelines' },
          { value: 'trigger_pipeline', label: 'Trigger Pipeline' },
          { value: 'get_file', label: 'Read File' },
          { value: 'commit_file', label: 'Commit File' },
        ]}
        tokenPlaceholder="glpat-..."
      >
        <ResourceField label="Project" provider="gitlab" kind="project" field="gitlabProjectId" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="Project ID" />
        {op === 'create_issue' && (<>
          <TextField label="Title" field="gitlabTitle" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{llm-1.output}}" />
          <AreaField label="Description" field="gitlabDescription" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{llm-1.output}}" />
          <TextField label="Labels (comma-separated)" field="gitlabLabels" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="bug, backend" />
        </>)}
        {(op === 'get_issue' || op === 'update_issue' || op === 'create_comment') && (
          <TextField label="Issue IID" field="gitlabIssueIid" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="12" />
        )}
        {op === 'update_issue' && (<>
          <TextField label="Title (optional)" field="gitlabTitle" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="Leave blank to keep" />
          <AreaField label="Description (optional)" field="gitlabDescription" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="Leave blank to keep" />
          <SelectField label="State" field="gitlabStateEvent" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback=""
            options={[{ value: '', label: 'Keep current' }, { value: 'close', label: 'Close' }, { value: 'reopen', label: 'Reopen' }]} />
          <TextField label="Labels (optional)" field="gitlabLabels" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="bug, backend" />
        </>)}
        {op === 'create_comment' && (
          <AreaField label="Comment" field="gitlabDescription" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{llm-1.output}}" />
        )}
        {op === 'create_merge_request' && (<>
          <TextField label="Title" field="gitlabTitle" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{llm-1.output}}" />
          <AreaField label="Description" field="gitlabDescription" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{llm-1.output}}" />
          <TextField label="Source branch" field="gitlabSourceBranch" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="feature/my-change" />
          <TextField label="Target branch" field="gitlabTargetBranch" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="main" />
        </>)}
        {(op === 'merge_mr' || op === 'get_merge_request') && (
          <TextField label="MR IID" field="gitlabMrIid" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="3" />
        )}
        {(op === 'list_issues' || op === 'list_merge_requests') && (
          <SelectField label="State" field="gitlabState" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback="opened"
            options={[{ value: 'opened', label: 'Opened' }, { value: 'closed', label: 'Closed' }, { value: 'all', label: 'All' }]} />
        )}
        {(op === 'list_commits' || op === 'trigger_pipeline' || op === 'get_file' || op === 'commit_file') && (
          <TextField label="Branch/ref" field="gitlabRef" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="main" />
        )}
        {(op === 'get_file' || op === 'commit_file') && (
          <TextField label="File path" field="gitlabPath" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="docs/report.md" />
        )}
        {op === 'commit_file' && (<>
          <FilePickField data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            contentField="gitlabContent" pathField="gitlabPath" contentLabel="File content" />
          <TextField label="Commit message" field="gitlabCommitMessage" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="Update report" />
        </>)}
        {['list_commits', 'list_issues', 'list_merge_requests', 'list_pipelines'].includes(op) && (() => {
          const when = op === 'list_commits' ? 'Committed' : op === 'list_pipelines' ? 'Updated' : 'Created'
          return (<>
            <DateTimeField label={`${when} after (optional)`} field="gitlabSince" data={data} nodeId={nodeId} updateNodeData={updateNodeData} />
            <DateTimeField label={`${when} before (optional)`} field="gitlabUntil" data={data} nodeId={nodeId} updateNodeData={updateNodeData} />
          </>)
        })()}
        {['list_issues', 'list_merge_requests', 'list_branches', 'list_commits', 'list_pipelines'].includes(op) && (
          <NumField label="Limit" field="gitlabLimit" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback={10} />
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
  const op = data.integrationOp ?? 'list_customers'
  return (
      <IntegrationSection
        provider="stripe" label="Stripe" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
        defaultOp="list_customers"
        ops={[
          { value: 'list_customers', label: 'List Customers' },
          { value: 'create_customer', label: 'Create Customer' },
          { value: 'get_customer', label: 'Get Customer' },
          { value: 'list_payments', label: 'List Payments' },
          { value: 'get_payment_intent', label: 'Get Payment' },
          { value: 'list_invoices', label: 'List Invoices' },
          { value: 'get_invoice', label: 'Get Invoice' },
          { value: 'list_subscriptions', label: 'List Subscriptions' },
          { value: 'get_subscription', label: 'Get Subscription' },
          { value: 'cancel_subscription', label: 'Cancel Subscription' },
          { value: 'list_products', label: 'List Products' },
          { value: 'create_product', label: 'Create Product' },
          { value: 'create_price', label: 'Create Price' },
          { value: 'create_payment_link', label: 'Create Payment Link' },
          { value: 'create_refund', label: 'Create Refund' },
          { value: 'list_refunds', label: 'List Refunds' },
          { value: 'get_balance', label: 'Get Balance' },
          { value: 'list_events', label: 'Account Events' },
        ]}
        tokenPlaceholder="sk_..."
      >
        {op === 'list_customers' && (
          <TextField label="Filter by email (optional)" field="stripeCustomerEmail" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="jane@example.com" />
        )}
        {op === 'create_customer' && (<>
          <TextField label="Email" field="stripeCustomerEmail" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="jane@example.com" />
          <TextField label="Name (optional)" field="stripeCustomerName" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="Jane Doe" />
        </>)}
        {op === 'get_customer' && (
          <TextField label="Customer ID" field="stripeCustomerId" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="cus_..." />
        )}
        {op === 'list_subscriptions' && (
          <TextField label="Customer ID (optional)" field="stripeCustomerId" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="cus_..." />
        )}
        {(op === 'get_subscription' || op === 'cancel_subscription') && (
          <TextField label="Subscription ID" field="stripeSubscriptionId" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="sub_..." />
        )}
        {op === 'create_product' && (
          <TextField label="Product name" field="stripeProductName" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="Pro Plan" />
        )}
        {op === 'create_price' && (<>
          <TextField label="Product ID" field="stripeProductId" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="prod_..." />
          <NumField label="Amount (cents)" field="stripeAmount" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback={1000} />
          <TextField label="Currency" field="stripeCurrency" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="usd" />
          <SelectField label="Billing" field="stripeInterval" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback="one-time"
            options={[{ value: 'one-time', label: 'One-time' }, { value: 'month', label: 'Monthly' }, { value: 'year', label: 'Yearly' }]} />
        </>)}
        {op === 'get_invoice' && (
          <TextField label="Invoice ID" field="stripeInvoiceId" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="in_..." />
        )}
        {op === 'get_payment_intent' && (
          <TextField label="Payment Intent ID" field="stripePaymentIntentId" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="pi_..." />
        )}
        {op === 'create_refund' && (<>
          <TextField label="Payment Intent ID" field="stripePaymentIntentId" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="pi_..." />
          <NumField label="Amount in cents (0 = full refund)" field="stripeAmount" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback={0} />
          <SelectField label="Reason" field="stripeRefundReason" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback="requested_by_customer"
            options={[{ value: 'requested_by_customer', label: 'Requested by customer' }, { value: 'duplicate', label: 'Duplicate' }, { value: 'fraudulent', label: 'Fraudulent' }]} />
        </>)}
        {op === 'create_payment_link' && (<>
          <ResourceField label="Price" provider="stripe" kind="price" field="stripePriceId" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="price_..." />
          <NumField label="Quantity" field="stripeQuantity" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback={1} />
        </>)}
        {['list_customers', 'list_payments', 'list_invoices', 'list_subscriptions', 'list_products', 'list_refunds', 'list_events'].includes(op) && (
          <NumField label="Limit" field="stripeLimit" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback={10} />
        )}
      </IntegrationSection>
  )
}

export function ShopifyConfig({ data, nodeId, updateNodeData }: ProviderConfigProps) {
  const op = data.integrationOp ?? 'list_orders'
  return (
      <IntegrationSection
        provider="shopify" label="Shopify" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
        defaultOp="list_orders"
        ops={[
          { value: 'list_orders', label: 'List Orders' },
          { value: 'get_order', label: 'Get Order' },
          { value: 'cancel_order', label: 'Cancel Order' },
          { value: 'close_order', label: 'Close Order' },
          { value: 'list_products', label: 'List Products' },
          { value: 'get_product', label: 'Get Product' },
          { value: 'create_product', label: 'Create Product' },
          { value: 'update_product', label: 'Update Product' },
          { value: 'delete_product', label: 'Delete Product' },
          { value: 'list_customers', label: 'List Customers' },
          { value: 'get_customer', label: 'Get Customer' },
          { value: 'search_customers', label: 'Search Customers' },
          { value: 'create_customer', label: 'Create Customer' },
          { value: 'create_draft_order', label: 'Create Draft Order' },
          { value: 'list_draft_orders', label: 'List Draft Orders' },
          { value: 'list_locations', label: 'List Locations' },
          { value: 'adjust_inventory', label: 'Adjust Inventory' },
          { value: 'create_discount_code', label: 'Create Discount Code' },
        ]}
        tokenPlaceholder="shpat_..."
        hideManual
      >
        {op === 'list_orders' && (
          <SelectField label="Status" field="shopifyStatus" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback="any"
            options={[{ value: 'any', label: 'Any' }, { value: 'open', label: 'Open' }, { value: 'closed', label: 'Closed' }]} />
        )}
        {(op === 'get_order' || op === 'cancel_order' || op === 'close_order') && (
          <TextField label="Order ID" field="shopifyOrderId" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{prev-node.output}}" />
        )}
        {(op === 'get_product' || op === 'update_product' || op === 'delete_product') && (
          <TextField label="Product ID" field="shopifyProductId" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{prev-node.output}}" />
        )}
        {(op === 'create_product' || op === 'update_product') && (<>
          <TextField label={op === 'update_product' ? 'Title (optional)' : 'Title'} field="shopifyTitle" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{llm-1.output}}" />
          <AreaField label={op === 'update_product' ? 'Description (optional)' : 'Description'} field="shopifyDescription" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{llm-1.output}}" />
          <TextField label={op === 'update_product' ? 'Price (optional)' : 'Price'} field="shopifyPrice" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="19.99" />
        </>)}
        {op === 'get_customer' && (
          <TextField label="Customer ID" field="shopifyCustomerId" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{prev-node.output}}" />
        )}
        {op === 'search_customers' && (
          <TextField label="Search query" field="shopifyQuery" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="jane@example.com" />
        )}
        {op === 'create_customer' && (<>
          <TextField label="Email" field="shopifyCustomerEmail" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="jane@example.com" />
          <TextField label="Name" field="shopifyCustomerName" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="Jane Doe" />
        </>)}
        {op === 'create_draft_order' && (<>
          <TextField label="Line item title" field="shopifyTitle" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="Custom order" />
          <TextField label="Price" field="shopifyPrice" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="49.00" />
          <NumField label="Quantity" field="shopifyQuantity" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback={1} />
          <TextField label="Customer email (optional)" field="shopifyCustomerEmail" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="jane@example.com" />
        </>)}
        {op === 'adjust_inventory' && (<>
          <TextField label="Inventory item ID" field="shopifyInventoryItemId" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="from product variant" />
          <TextField label="Location ID" field="shopifyLocationId" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="from List Locations" />
          <NumField label="Adjustment (±)" field="shopifyDelta" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback={1} />
        </>)}
        {op === 'create_discount_code' && (<>
          <TextField label="Code" field="shopifyDiscountCode" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="SUMMER20" />
          <SelectField label="Type" field="shopifyDiscountType" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback="percentage"
            options={[{ value: 'percentage', label: 'Percentage off' }, { value: 'fixed_amount', label: 'Fixed amount off' }]} />
          <TextField label="Value" field="shopifyDiscountValue" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="20" />
        </>)}
        {['list_orders', 'list_products', 'list_customers', 'search_customers', 'list_draft_orders'].includes(op) && (
          <NumField label="Limit" field="shopifyLimit" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback={10} />
        )}
      </IntegrationSection>
  )
}

export function GoogleCalendarConfig({ data, nodeId, updateNodeData }: ProviderConfigProps) {
  const op = data.integrationOp ?? 'list_events'
  return (
      <IntegrationSection
        provider="googlecalendar" label="Google Calendar" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
        defaultOp="list_events"
        ops={[
          { value: 'list_events', label: 'List Events' },
          { value: 'get_event', label: 'Get Event' },
          { value: 'create_event', label: 'Create Event' },
          { value: 'update_event', label: 'Update Event' },
          { value: 'delete_event', label: 'Delete Event' },
          { value: 'quick_add', label: 'Quick Add (natural language)' },
          { value: 'respond_to_event', label: 'Respond to Invitation' },
          { value: 'find_free_time', label: 'Find Free Time' },
          { value: 'list_calendars', label: 'List Calendars' },
        ]}
        tokenPlaceholder=""
        hideManual
      >
        {op !== 'list_calendars' && (
          <ResourceField label="Calendar" provider="googlecalendar" kind="calendar" field="gcalCalendarId" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="primary" />
        )}
        {op === 'list_events' && (
          <NumField label="Limit" field="gcalLimit" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback={10} />
        )}
        {(op === 'get_event' || op === 'delete_event' || op === 'update_event' || op === 'respond_to_event') && (
          <TextField label="Event ID" field="gcalEventId" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{prev-node.output.id}}" />
        )}
        {op === 'create_event' && (<>
          <TextField label="Title" field="gcalSummary" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{llm-1.output}}" />
          <AreaField label="Description" field="gcalDescription" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{llm-1.output}}" />
          <TextField label="Start (RFC3339)" field="gcalStart" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="2026-07-20T15:00:00Z" />
          <TextField label="End (RFC3339)" field="gcalEnd" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="2026-07-20T16:00:00Z" />
          <TextField label="Attendees (comma-separated)" field="gcalAttendees" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="a@x.com, b@y.com" />
        </>)}
        {op === 'update_event' && (<>
          <TextField label="Title (optional)" field="gcalSummary" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="Leave blank to keep" />
          <AreaField label="Description (optional)" field="gcalDescription" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="Leave blank to keep" />
          <TextField label="Start (optional, RFC3339)" field="gcalStart" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="Leave blank to keep" />
          <TextField label="End (optional, RFC3339)" field="gcalEnd" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="Leave blank to keep" />
          <TextField label="Attendees (optional, replaces all)" field="gcalAttendees" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="a@x.com, b@y.com" />
        </>)}
        {op === 'quick_add' && (
          <TextField label="Describe the event" field="gcalText" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="Lunch with Sam on Friday at 1pm" />
        )}
        {op === 'respond_to_event' && (
          <SelectField label="Response" field="gcalResponse" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback="accepted"
            options={[{ value: 'accepted', label: 'Accept' }, { value: 'declined', label: 'Decline' }, { value: 'tentative', label: 'Tentative' }]} />
        )}
        {op === 'find_free_time' && (<>
          <TextField label="Window start (optional, RFC3339)" field="gcalStart" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="defaults to now" />
          <TextField label="Window end (optional, RFC3339)" field="gcalEnd" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="defaults to +7 days" />
        </>)}
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
            <TextField label="Bot name (optional)" field="slackBotName" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="Fernary Reporter" />
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
        {op === 'upload_file' && (
          <FilePickField data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            contentField="slackFileContent" nameField="slackFileName" />
        )}
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
  const op = data.integrationOp ?? 'list_files'
  const needsFile = ['get_file', 'read_file', 'copy_file', 'move_file', 'rename_file', 'share_file', 'list_permissions', 'trash_file', 'delete_file'].includes(op)
  return (
      <IntegrationSection
        provider="googledrive" label="Google Drive" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
        defaultOp="list_files"
        ops={[
          { value: 'list_files', label: 'List Files' },
          { value: 'search', label: 'Search' },
          { value: 'get_file', label: 'Get File Info' },
          { value: 'read_file', label: 'Read File Content' },
          { value: 'upload_file', label: 'Upload File' },
          { value: 'create_folder', label: 'Create Folder' },
          { value: 'copy_file', label: 'Copy File' },
          { value: 'move_file', label: 'Move File' },
          { value: 'rename_file', label: 'Rename File' },
          { value: 'share_file', label: 'Share File' },
          { value: 'list_permissions', label: 'List Permissions' },
          { value: 'trash_file', label: 'Move to Trash' },
          { value: 'delete_file', label: 'Delete Permanently' },
        ]}
        tokenPlaceholder=""
        hideManual
      >
        {(op === 'list_files' || op === 'search') && (<>
          <TextField label="Query (optional)" field="gdriveQuery" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="name contains 'report'" />
          <NumField label="Limit" field="gdriveLimit" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback={20} />
        </>)}
        {needsFile && (
          <TextField label="File ID" field="gdriveFileId" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{prev-node.output.id}}" />
        )}
        {op === 'upload_file' && (
          <FilePickField data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            contentField="gdriveContent" nameField="gdriveName" mimeField="gdriveMimeType" />
        )}
        {(op === 'create_folder' || op === 'upload_file' || op === 'copy_file' || op === 'move_file') && (
          <ResourceField label={op === 'move_file' ? 'Destination folder' : 'Parent folder (optional)'} provider="googledrive" kind="folder" field="gdriveParentId" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="root" />
        )}
        {(op === 'create_folder' || op === 'rename_file') && (
          <TextField label={op === 'rename_file' ? 'New name' : 'Folder name'} field="gdriveName" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{llm-1.output}}" />
        )}
        {op === 'copy_file' && (
          <TextField label="Copy name (optional)" field="gdriveName" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="Leave blank to keep" />
        )}
        {op === 'share_file' && (<>
          <TextField label="Share with email (blank → anyone with link)" field="gdriveEmail" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="jane@example.com" />
          <SelectField label="Role" field="gdriveRole" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback="reader"
            options={[{ value: 'reader', label: 'Viewer' }, { value: 'commenter', label: 'Commenter' }, { value: 'writer', label: 'Editor' }]} />
        </>)}
      </IntegrationSection>
  )
}

export function GoogleDocsConfig({ data, nodeId, updateNodeData }: ProviderConfigProps) {
  const op = data.integrationOp ?? 'create_document'
  return (
      <IntegrationSection
        provider="googledocs" label="Google Docs" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
        defaultOp="create_document"
        ops={[
          { value: 'create_document', label: 'Create Document' },
          { value: 'create_from_template', label: 'Create from Template' },
          { value: 'get_document', label: 'Get Document' },
          { value: 'append_text', label: 'Append Text' },
          { value: 'insert_text_at_start', label: 'Insert Text at Start' },
          { value: 'replace_text', label: 'Find & Replace' },
        ]}
        tokenPlaceholder=""
        hideManual
      >
        {(op === 'create_document' || op === 'create_from_template') && (
          <TextField label="Title" field="gdocsTitle" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{llm-1.output}}" />
        )}
        {op === 'create_from_template' && (<>
          <TextField label="Template document ID" field="gdocsTemplateId" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="1AbC…" />
          <AreaField label={'Replacements (JSON: {"{{name}}":"Jane"})'} field="gdocsReplacements" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder={'{"{{name}}":"{{llm-1.output.name}}"}'} />
        </>)}
        {(op === 'get_document' || op === 'append_text' || op === 'insert_text_at_start' || op === 'replace_text') && (
          <TextField label="Document ID" field="gdocsDocumentId" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{prev-node.output.documentId}}" />
        )}
        {(op === 'append_text' || op === 'insert_text_at_start') && (
          <AreaField label="Text" field="gdocsText" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{llm-1.output}}" />
        )}
        {op === 'replace_text' && (<>
          <TextField label="Find" field="gdocsFindText" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{placeholder}}" />
          <TextField label="Replace with" field="gdocsReplaceText" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{llm-1.output}}" />
        </>)}
      </IntegrationSection>
  )
}

export function GoogleSheetsConfig({ data, nodeId, updateNodeData }: ProviderConfigProps) {
  const op = data.integrationOp ?? 'read_range'
  return (
      <IntegrationSection
        provider="googlesheets" label="Google Sheets" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
        defaultOp="read_range"
        ops={[
          { value: 'read_range', label: 'Read Range' },
          { value: 'append_row', label: 'Append Row' },
          { value: 'append_rows', label: 'Append Rows (bulk)' },
          { value: 'update_range', label: 'Update Range' },
          { value: 'clear_range', label: 'Clear Range' },
          { value: 'find_replace', label: 'Find & Replace' },
          { value: 'list_sheets', label: 'List Sheet Tabs' },
          { value: 'add_sheet', label: 'Add Sheet Tab' },
          { value: 'delete_sheet', label: 'Delete Sheet Tab' },
          { value: 'delete_rows', label: 'Delete Rows' },
          { value: 'create_spreadsheet', label: 'Create Spreadsheet' },
        ]}
        tokenPlaceholder=""
        hideManual
      >
        {op !== 'create_spreadsheet' && (
          <TextField label="Spreadsheet ID" field="gsheetsSpreadsheetId" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{prev-node.output}}" />
        )}
        {(op === 'read_range' || op === 'append_row' || op === 'update_range' || op === 'clear_range') && (
          <TextField label="Range (A1)" field="gsheetsRange" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="Sheet1!A1:C10" />
        )}
        {op === 'append_rows' && (<>
          <TextField label="Range (optional, e.g. Sheet1!A1)" field="gsheetsRange" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="A1" />
          <AreaField label="Rows (JSON array of arrays)" field="gsheetsRows" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder={'[["Jane","jane@x.com"],["Bob","bob@x.com"]]'} />
        </>)}
        {(op === 'append_row' || op === 'update_range') && (
          <TextField label="Values (comma-separated)" field="gsheetsValues" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="Jane, jane@x.com, {{llm-1.output}}" />
        )}
        {op === 'find_replace' && (<>
          <TextField label="Find" field="gsheetsFind" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="old value" />
          <TextField label="Replace with" field="gsheetsReplace" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{llm-1.output}}" />
        </>)}
        {(op === 'add_sheet' || op === 'delete_sheet' || op === 'delete_rows') && (
          <TextField label="Sheet tab name" field="gsheetsSheetTitle" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="Sheet1" />
        )}
        {op === 'delete_rows' && (<>
          <NumField label="First row (1-based)" field="gsheetsStartRow" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback={2} />
          <NumField label="Last row (inclusive)" field="gsheetsEndRow" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback={2} />
        </>)}
        {op === 'create_spreadsheet' && (
          <TextField label="Title" field="gsheetsTitle" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{llm-1.output}}" />
        )}
      </IntegrationSection>
  )
}

export function JiraConfig({ data, nodeId, updateNodeData }: ProviderConfigProps) {
  const op = data.integrationOp ?? 'search_issues'
  // Ops that act on an existing issue, and so need a key.
  const needsIssue = ['get_issue', 'update_issue', 'delete_issue', 'assign_issue', 'transition_issue',
    'list_transitions', 'link_issues', 'add_comment', 'list_comments', 'add_worklog', 'list_worklogs',
    'add_attachment', 'move_issues_to_sprint'].includes(op)
  return (
      <IntegrationSection
        provider="jira" label="Jira" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
        defaultOp="search_issues"
        ops={[
          { value: 'search_issues', label: 'Search Issues (JQL)' },
          { value: 'get_issue', label: 'Get Issue' },
          { value: 'create_issue', label: 'Create Issue' },
          { value: 'update_issue', label: 'Update Issue' },
          { value: 'delete_issue', label: 'Delete Issue' },
          { value: 'assign_issue', label: 'Assign Issue' },
          { value: 'transition_issue', label: 'Transition Issue' },
          { value: 'list_transitions', label: 'List Transitions' },
          { value: 'link_issues', label: 'Link Issues' },
          { value: 'add_comment', label: 'Add Comment' },
          { value: 'list_comments', label: 'List Comments' },
          { value: 'add_worklog', label: 'Log Work' },
          { value: 'list_worklogs', label: 'List Worklogs' },
          { value: 'add_attachment', label: 'Add Attachment' },
          { value: 'list_projects', label: 'List Projects' },
          { value: 'get_project', label: 'Get Project' },
          { value: 'list_issue_types', label: 'List Issue Types' },
          { value: 'search_users', label: 'Search Users' },
          { value: 'get_current_user', label: 'Current User' },
          { value: 'list_boards', label: 'List Boards' },
          { value: 'list_sprints', label: 'List Sprints' },
          { value: 'get_sprint_issues', label: 'Sprint Issues' },
          { value: 'create_sprint', label: 'Create Sprint' },
          { value: 'move_issues_to_sprint', label: 'Move Issues to Sprint' },
        ]}
        tokenPlaceholder="Atlassian API token"
        hideManual
      >
        {op === 'search_issues' && (<>
          <AreaField label="JQL" field="jiraJql" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder='project = ENG AND status != Done ORDER BY created DESC' />
          <TextField label="Fields (optional)" field="jiraFields" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="summary,status,assignee" />
        </>)}

        {needsIssue && (
          <TextField label={op === 'move_issues_to_sprint' ? 'Issue keys' : 'Issue key'}
            field="jiraIssueKey" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder={op === 'move_issues_to_sprint' ? 'ENG-1, ENG-2' : 'ENG-1234'} />
        )}

        {(op === 'create_issue' || op === 'get_project' || op === 'list_issue_types' || op === 'list_boards') && (
          <ResourceField label={op === 'create_issue' ? 'Project' : 'Project (optional)'}
            provider="jira" kind="project" field="jiraProjectKey" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="ENG" />
        )}

        {(op === 'create_issue' || op === 'update_issue') && (<>
          <TextField label={op === 'update_issue' ? 'Summary (optional)' : 'Summary'} field="jiraSummary"
            data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{llm-1.output}}" />
          <AreaField label="Description (optional)" field="jiraDescription" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="{{llm-1.output}}" />
          {op === 'create_issue' && (
            <SelectField label="Issue type" field="jiraIssueType" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback="Task"
              options={[
                { value: 'Task', label: 'Task' },
                { value: 'Bug', label: 'Bug' },
                { value: 'Story', label: 'Story' },
                { value: 'Epic', label: 'Epic' },
                { value: 'Sub-task', label: 'Sub-task' },
              ]} />
          )}
          <SelectField label="Priority (optional)" field="jiraPriority" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback=""
            options={[
              { value: '', label: 'Leave unset' },
              { value: 'Highest', label: 'Highest' },
              { value: 'High', label: 'High' },
              { value: 'Medium', label: 'Medium' },
              { value: 'Low', label: 'Low' },
              { value: 'Lowest', label: 'Lowest' },
            ]} />
          <TextField label="Labels (optional)" field="jiraLabels" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="backend, urgent" />
          <TextField label="Due date (optional)" field="jiraDueDate" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="2026-08-31" />
          <TextField label="Parent issue (optional)" field="jiraParentKey" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="ENG-100 — for a sub-task or epic child" />
        </>)}

        {(op === 'create_issue' || op === 'update_issue' || op === 'assign_issue') && (
          <TextField label={op === 'assign_issue' ? 'Assignee' : 'Assignee (optional)'} field="jiraAssignee"
            data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="me, jane@example.com, or an account ID" />
        )}

        {op === 'transition_issue' && (
          <TextField label="Target status" field="jiraTransition" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="In Progress" />
        )}

        {(op === 'add_comment' || op === 'transition_issue' || op === 'add_worklog') && (
          <AreaField label={op === 'add_comment' ? 'Comment' : 'Comment (optional)'} field="jiraComment"
            data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{llm-1.output}}" />
        )}

        {op === 'add_worklog' && (<>
          <TextField label="Time spent" field="jiraTimeSpent" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="3h 30m" />
          <DateTimeField label="Started (optional)" field="jiraStarted" data={data} nodeId={nodeId} updateNodeData={updateNodeData} />
        </>)}

        {op === 'link_issues' && (<>
          <SelectField label="Link type" field="jiraLinkType" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback="Relates"
            options={[
              { value: 'Relates', label: 'Relates to' },
              { value: 'Blocks', label: 'Blocks' },
              { value: 'Duplicate', label: 'Duplicates' },
              { value: 'Cloners', label: 'Clones' },
            ]} />
          <TextField label="Linked issue" field="jiraLinkedIssue" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="ENG-5678" />
        </>)}

        {op === 'add_attachment' && (<>
          <TextField label="File name" field="jiraAttachName" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="report.txt" />
          <AreaField label="File content" field="jiraAttachBody" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="{{llm-1.output}}" />
        </>)}

        {op === 'search_users' && (
          <TextField label="Search query" field="jiraQuery" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="jane" />
        )}

        {(op === 'list_sprints' || op === 'create_sprint') && (
          <ResourceField label="Board" provider="jira" kind="board" field="jiraBoardId" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="board ID" />
        )}

        {(op === 'get_sprint_issues' || op === 'move_issues_to_sprint') && (
          <TextField label="Sprint ID" field="jiraSprintId" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder={op === 'move_issues_to_sprint' ? "sprint ID, or 'backlog'" : 'from List Sprints'} />
        )}

        {op === 'create_sprint' && (<>
          <TextField label="Sprint name" field="jiraSprintName" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="Sprint 24" />
          <DateTimeField label="Start (optional)" field="jiraStartDate" data={data} nodeId={nodeId} updateNodeData={updateNodeData} />
          <DateTimeField label="End (optional)" field="jiraEndDate" data={data} nodeId={nodeId} updateNodeData={updateNodeData} />
        </>)}

        {['search_issues', 'list_comments', 'list_projects', 'search_users', 'list_boards', 'list_sprints', 'get_sprint_issues'].includes(op) && (
          <NumField label="Limit" field="jiraLimit" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback={25} />
        )}
      </IntegrationSection>
  )
}

export function ConfluenceConfig({ data, nodeId, updateNodeData }: ProviderConfigProps) {
  const op = data.integrationOp ?? 'list_pages'
  const needsPage = ['get_page', 'update_page', 'delete_page', 'list_child_pages', 'add_comment',
    'list_comments', 'list_labels', 'add_label', 'list_attachments', 'upload_attachment'].includes(op)
  return (
      <IntegrationSection
        provider="confluence" label="Confluence" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
        defaultOp="list_pages"
        ops={[
          { value: 'list_pages', label: 'List Pages' },
          { value: 'get_page', label: 'Get Page' },
          { value: 'find_page_by_title', label: 'Find Page by Title' },
          { value: 'search_pages', label: 'Search Pages (CQL)' },
          { value: 'list_child_pages', label: 'List Child Pages' },
          { value: 'create_page', label: 'Create Page' },
          { value: 'update_page', label: 'Update Page' },
          { value: 'delete_page', label: 'Delete Page' },
          { value: 'list_spaces', label: 'List Spaces' },
          { value: 'get_space', label: 'Get Space' },
          { value: 'list_blog_posts', label: 'List Blog Posts' },
          { value: 'create_blog_post', label: 'Create Blog Post' },
          { value: 'add_comment', label: 'Add Comment' },
          { value: 'list_comments', label: 'List Comments' },
          { value: 'list_labels', label: 'List Labels' },
          { value: 'add_label', label: 'Add Label' },
          { value: 'list_attachments', label: 'List Attachments' },
          { value: 'upload_attachment', label: 'Upload Attachment' },
          { value: 'get_current_user', label: 'Current User' },
        ]}
        tokenPlaceholder="Atlassian API token"
        hideManual
      >
        {['get_space', 'create_page', 'create_blog_post', 'list_pages', 'find_page_by_title'].includes(op) && (
          <ResourceField
            label={['get_space', 'create_page', 'create_blog_post'].includes(op) ? 'Space' : 'Space (optional)'}
            provider="confluence" kind="space" field="confluenceSpaceKey" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="ENG" />
        )}

        {needsPage && (
          <TextField label={op === 'list_child_pages' ? 'Parent page ID' : 'Page ID'} field="confluencePageId"
            data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{prev-node.output}}" />
        )}

        {(op === 'create_page' || op === 'create_blog_post' || op === 'find_page_by_title') && (
          <TextField label="Title" field="confluenceTitle" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="Weekly report" />
        )}
        {op === 'update_page' && (
          <TextField label="Title (optional)" field="confluenceTitle" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="leave blank to keep the current title" />
        )}

        {['create_page', 'update_page', 'create_blog_post'].includes(op) && (<>
          <AreaField label="Body" field="confluenceBody" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="{{llm-1.output}} — plain text, or Confluence storage-format HTML" />
          <SelectField label="Status" field="confluenceStatus" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback="current"
            options={[{ value: 'current', label: 'Published' }, { value: 'draft', label: 'Draft' }]} />
        </>)}

        {op === 'create_page' && (
          <TextField label="Parent page (optional)" field="confluenceParentId" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="page ID to nest under" />
        )}

        {op === 'search_pages' && (
          <AreaField label="CQL" field="confluenceCql" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder='text ~ "onboarding" AND space = ENG' />
        )}

        {op === 'add_comment' && (
          <AreaField label="Comment" field="confluenceComment" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="{{llm-1.output}}" />
        )}

        {op === 'add_label' && (
          <TextField label="Labels" field="confluenceLabel" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="runbook, q3" />
        )}

        {op === 'upload_attachment' && (<>
          <TextField label="File name" field="confluenceAttachName" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="notes.txt" />
          <AreaField label="File content" field="confluenceAttachBody" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="{{llm-1.output}}" />
        </>)}

        {['list_pages', 'list_spaces', 'search_pages', 'find_page_by_title', 'list_child_pages',
          'list_blog_posts', 'list_comments', 'list_attachments'].includes(op) && (
          <NumField label="Limit" field="confluenceLimit" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback={25} />
        )}
      </IntegrationSection>
  )
}

export function BitbucketConfig({ data, nodeId, updateNodeData }: ProviderConfigProps) {
  const op = data.integrationOp ?? 'list_pull_requests'
  const accountOp = op === 'get_current_user' || op === 'list_workspaces' || op === 'list_repositories'
  const needsPr = ['get_pull_request', 'merge_pull_request', 'decline_pull_request', 'approve_pull_request',
    'comment_on_pull_request', 'list_pr_comments', 'list_pr_commits', 'get_pr_diff'].includes(op)
  return (
      <IntegrationSection
        provider="bitbucket" label="Bitbucket" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
        defaultOp="list_pull_requests"
        ops={[
          { value: 'list_pull_requests', label: 'List Pull Requests' },
          { value: 'get_pull_request', label: 'Get Pull Request' },
          { value: 'create_pull_request', label: 'Create Pull Request' },
          { value: 'merge_pull_request', label: 'Merge Pull Request' },
          { value: 'decline_pull_request', label: 'Decline Pull Request' },
          { value: 'approve_pull_request', label: 'Approve Pull Request' },
          { value: 'comment_on_pull_request', label: 'Comment on Pull Request' },
          { value: 'list_pr_comments', label: 'List PR Comments' },
          { value: 'list_pr_commits', label: 'List PR Commits' },
          { value: 'get_pr_diff', label: 'Get PR Diff' },
          { value: 'list_repositories', label: 'List Repositories' },
          { value: 'get_repository', label: 'Get Repository' },
          { value: 'create_repository', label: 'Create Repository' },
          { value: 'list_branches', label: 'List Branches' },
          { value: 'create_branch', label: 'Create Branch' },
          { value: 'delete_branch', label: 'Delete Branch' },
          { value: 'list_commits', label: 'List Commits' },
          { value: 'get_commit', label: 'Get Commit' },
          { value: 'get_file', label: 'Get File' },
          { value: 'commit_file', label: 'Commit File' },
          { value: 'list_issues', label: 'List Issues' },
          { value: 'get_issue', label: 'Get Issue' },
          { value: 'create_issue', label: 'Create Issue' },
          { value: 'comment_on_issue', label: 'Comment on Issue' },
          { value: 'list_pipelines', label: 'List Pipelines' },
          { value: 'trigger_pipeline', label: 'Trigger Pipeline' },
          { value: 'list_workspaces', label: 'List Workspaces' },
          { value: 'get_current_user', label: 'Current User' },
        ]}
        tokenPlaceholder="Bitbucket access token"
        hideManual
      >
        {!accountOp && (
          <ResourceField label="Repository" provider="bitbucket" kind="repo" field="bitbucketRepo"
            data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="my-service" />
        )}

        {needsPr && (
          <TextField label="Pull request ID" field="bitbucketPrId" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="42" />
        )}

        {op === 'create_pull_request' && (<>
          <TextField label="Source branch" field="bitbucketSource" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="feature/checkout" />
          <TextField label="Destination branch (optional)" field="bitbucketDest" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="main — defaults to the repo's main branch" />
        </>)}

        {(op === 'create_pull_request' || op === 'create_issue') && (
          <TextField label="Title" field="bitbucketTitle" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="{{llm-1.output}}" />
        )}

        {['create_pull_request', 'create_issue', 'comment_on_pull_request', 'comment_on_issue', 'create_repository'].includes(op) && (
          <AreaField
            label={op === 'comment_on_pull_request' || op === 'comment_on_issue' ? 'Comment'
              : op === 'create_repository' ? 'Description (optional)' : 'Description'}
            field="bitbucketBody" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{llm-1.output}}" />
        )}

        {op === 'merge_pull_request' && (
          <SelectField label="Merge strategy" field="bitbucketMergeStrategy" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback="merge_commit"
            options={[
              { value: 'merge_commit', label: 'Merge commit' },
              { value: 'squash', label: 'Squash' },
              { value: 'fast_forward', label: 'Fast forward' },
            ]} />
        )}

        {op === 'create_repository' && (
          <SelectField label="Visibility" field="bitbucketPrivate" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback="true"
            options={[{ value: 'true', label: 'Private' }, { value: 'false', label: 'Public' }]} />
        )}

        {(op === 'create_branch' || op === 'delete_branch' || op === 'commit_file' || op === 'trigger_pipeline') && (
          <TextField label={op === 'trigger_pipeline' ? 'Branch' : 'Branch name'} field="bitbucketBranch"
            data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="main" />
        )}

        {(op === 'create_branch' || op === 'get_file' || op === 'list_commits' || op === 'get_commit') && (
          <TextField
            label={op === 'get_commit' ? 'Commit hash' : op === 'create_branch' ? 'Branch off (optional)' : 'Branch, tag or commit (optional)'}
            field="bitbucketRef" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="main" />
        )}

        {(op === 'get_file' || op === 'commit_file') && (
          <TextField label="File path" field="bitbucketPath" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="docs/readme.md" />
        )}

        {op === 'commit_file' && (<>
          <AreaField label="File content" field="bitbucketContent" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="{{llm-1.output}}" />
          <TextField label="Commit message" field="bitbucketMessage" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="Update docs" />
        </>)}

        {op === 'merge_pull_request' && (
          <TextField label="Merge message (optional)" field="bitbucketMessage" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="Merged by Fernary" />
        )}

        {(op === 'get_issue' || op === 'comment_on_issue') && (
          <TextField label="Issue ID" field="bitbucketIssueId" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="17" />
        )}

        {op === 'create_issue' && (<>
          <SelectField label="Kind" field="bitbucketKind" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback="bug"
            options={[
              { value: 'bug', label: 'Bug' },
              { value: 'enhancement', label: 'Enhancement' },
              { value: 'proposal', label: 'Proposal' },
              { value: 'task', label: 'Task' },
            ]} />
          <SelectField label="Priority" field="bitbucketPriority" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback="major"
            options={[
              { value: 'trivial', label: 'Trivial' },
              { value: 'minor', label: 'Minor' },
              { value: 'major', label: 'Major' },
              { value: 'critical', label: 'Critical' },
              { value: 'blocker', label: 'Blocker' },
            ]} />
        </>)}

        {op === 'list_pull_requests' && (
          <SelectField label="State" field="bitbucketState" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback="OPEN"
            options={[
              { value: 'OPEN', label: 'Open' },
              { value: 'MERGED', label: 'Merged' },
              { value: 'DECLINED', label: 'Declined' },
              { value: 'SUPERSEDED', label: 'Superseded' },
            ]} />
        )}
        {op === 'list_issues' && (
          <SelectField label="State" field="bitbucketState" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback="new"
            options={[
              { value: 'new', label: 'New' },
              { value: 'open', label: 'Open' },
              { value: 'resolved', label: 'Resolved' },
              { value: 'closed', label: 'Closed' },
            ]} />
        )}

        {op === 'list_repositories' && (
          <TextField label="Filter (optional)" field="bitbucketQuery" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder='name ~ "api"' />
        )}

        <TextField label="Workspace (optional)" field="bitbucketWorkspace" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
          placeholder="defaults to your connected workspace" />

        {['list_pull_requests', 'list_repositories', 'list_branches', 'list_commits', 'list_issues',
          'list_pipelines', 'list_pr_comments', 'list_pr_commits', 'list_workspaces'].includes(op) && (
          <NumField label="Limit" field="bitbucketLimit" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback={25} />
        )}
      </IntegrationSection>
  )
}

export function GoogleMeetConfig({ data, nodeId, updateNodeData }: ProviderConfigProps) {
  const op = data.integrationOp ?? 'create_space'
  const needsRecord = ['get_conference_record', 'list_participants', 'list_recordings', 'list_transcripts'].includes(op)
  return (
      <IntegrationSection
        provider="googlemeet" label="Google Meet" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
        defaultOp="create_space"
        ops={[
          { value: 'create_space', label: 'Create Meeting' },
          { value: 'get_space', label: 'Get Meeting' },
          { value: 'update_space', label: 'Update Meeting' },
          { value: 'end_active_conference', label: 'End Conference' },
          { value: 'list_conference_records', label: 'List Conferences' },
          { value: 'get_conference_record', label: 'Get Conference' },
          { value: 'list_participants', label: 'List Participants' },
          { value: 'list_recordings', label: 'List Recordings' },
          { value: 'list_transcripts', label: 'List Transcripts' },
          { value: 'get_transcript_text', label: 'Get Transcript Text' },
          { value: 'list_transcript_entries', label: 'Transcript Entries' },
        ]}
        tokenPlaceholder="Google access token"
        hideManual
      >
        {['get_space', 'update_space', 'end_active_conference', 'list_conference_records'].includes(op) && (
          <TextField label={op === 'list_conference_records' ? 'Meeting (optional)' : 'Meeting'}
            field="meetSpace" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="spaces/… or a meeting code" />
        )}

        {(op === 'create_space' || op === 'update_space') && (<>
          <SelectField label="Who can join" field="meetAccessType" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback="TRUSTED"
            options={[
              { value: 'TRUSTED', label: 'People in your organization' },
              { value: 'OPEN', label: 'Anyone with the link' },
              { value: 'RESTRICTED', label: 'Invited people only' },
            ]} />
          <SelectField label="Moderation" field="meetModeration" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback=""
            options={[
              { value: '', label: 'Leave unset' },
              { value: 'ON', label: 'On — host controls' },
              { value: 'OFF', label: 'Off' },
            ]} />
        </>)}

        {needsRecord && (
          <TextField label="Conference record" field="meetConferenceRecord" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="conferenceRecords/… from List Conferences" />
        )}

        {(op === 'get_transcript_text' || op === 'list_transcript_entries') && (
          <TextField label="Transcript" field="meetTranscript" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="…/transcripts/… from List Transcripts" />
        )}

        {op === 'list_conference_records' && (
          <TextField label="Filter (optional)" field="meetFilter" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder='start_time>="2026-08-01T00:00:00Z"' />
        )}

        {['list_conference_records', 'list_participants', 'get_transcript_text', 'list_transcript_entries'].includes(op) && (
          <NumField label="Limit" field="meetLimit" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback={25} />
        )}
      </IntegrationSection>
  )
}

export function GoogleSlidesConfig({ data, nodeId, updateNodeData }: ProviderConfigProps) {
  const op = data.integrationOp ?? 'create_presentation'
  const needsDeck = op !== 'create_presentation' && op !== 'create_from_template'
  const needsSlide = ['add_text_box', 'add_image', 'update_speaker_notes', 'get_thumbnail',
    'duplicate_slide', 'delete_slide'].includes(op)
  return (
      <IntegrationSection
        provider="googleslides" label="Google Slides" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
        defaultOp="create_presentation"
        ops={[
          { value: 'create_presentation', label: 'Create Presentation' },
          { value: 'create_from_template', label: 'Create from Template' },
          { value: 'get_presentation', label: 'Get Presentation' },
          { value: 'list_slides', label: 'List Slides' },
          { value: 'add_slide', label: 'Add Slide' },
          { value: 'duplicate_slide', label: 'Duplicate Slide' },
          { value: 'delete_slide', label: 'Delete Slide' },
          { value: 'replace_all_text', label: 'Replace All Text' },
          { value: 'add_text_box', label: 'Add Text Box' },
          { value: 'add_image', label: 'Add Image' },
          { value: 'update_speaker_notes', label: 'Update Speaker Notes' },
          { value: 'get_thumbnail', label: 'Get Slide Thumbnail' },
          { value: 'delete_object', label: 'Delete Object' },
        ]}
        tokenPlaceholder="Google access token"
        hideManual
      >
        {needsDeck && (
          <TextField label="Presentation ID" field="slidesPresentationId" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="{{prev-node.output}}" />
        )}

        {(op === 'create_presentation' || op === 'create_from_template') && (
          <TextField label="Title" field="slidesTitle" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="Q3 review" />
        )}

        {op === 'create_from_template' && (<>
          <TextField label="Template presentation ID" field="slidesTemplateId" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="the deck to copy" />
          <AreaField label="Replacements" field="slidesReplacements" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder='{"{{client}}": "Acme", "{{date}}": "August 2026"}' />
        </>)}

        {op === 'add_slide' && (<>
          <SelectField label="Layout" field="slidesLayout" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback="TITLE_AND_BODY"
            options={[
              { value: 'TITLE_AND_BODY', label: 'Title and body' },
              { value: 'TITLE_ONLY', label: 'Title only' },
              { value: 'SECTION_HEADER', label: 'Section header' },
              { value: 'BLANK', label: 'Blank' },
            ]} />
          <TextField label="Heading" field="slidesHeading" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="{{llm-1.output}}" />
          <AreaField label="Body" field="slidesBody" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="{{llm-1.output}}" />
          <AreaField label="Speaker notes (optional)" field="slidesNotes" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="{{llm-1.output}}" />
          <NumField label="Position (optional)" field="slidesIndex" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback={0} />
        </>)}

        {needsSlide && (
          <TextField label="Slide ID" field="slidesSlideId" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="from List Slides" />
        )}

        {op === 'add_text_box' && (
          <AreaField label="Text" field="slidesBody" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="{{llm-1.output}}" />
        )}

        {op === 'add_image' && (
          <TextField label="Image URL" field="slidesImageUrl" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="https://… — must be publicly reachable" />
        )}

        {op === 'update_speaker_notes' && (
          <AreaField label="Speaker notes" field="slidesNotes" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="{{llm-1.output}}" />
        )}

        {op === 'replace_all_text' && (<>
          <TextField label="Find" field="slidesFind" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="{{client}}" />
          <TextField label="Replace with" field="slidesReplace" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="Acme Inc" />
        </>)}

        {op === 'delete_object' && (
          <TextField label="Object ID" field="slidesObjectId" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="shape or image objectId" />
        )}
      </IntegrationSection>
  )
}

export function GoogleFormsConfig({ data, nodeId, updateNodeData }: ProviderConfigProps) {
  const op = data.integrationOp ?? 'create_form'
  return (
      <IntegrationSection
        provider="googleforms" label="Google Forms" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
        defaultOp="create_form"
        ops={[
          { value: 'create_form', label: 'Create Form' },
          { value: 'get_form', label: 'Get Form' },
          { value: 'add_question', label: 'Add Question' },
          { value: 'update_form_info', label: 'Update Form Info' },
          { value: 'set_quiz_mode', label: 'Set Quiz Mode' },
          { value: 'delete_item', label: 'Delete Item' },
          { value: 'list_responses', label: 'List Responses' },
          { value: 'get_response', label: 'Get Response' },
          { value: 'set_publish_settings', label: 'Open or Close Responses' },
        ]}
        tokenPlaceholder="Google access token"
        hideManual
      >
        {op !== 'create_form' && (
          <TextField label="Form ID" field="formsFormId" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="{{prev-node.output}}" />
        )}

        {(op === 'create_form' || op === 'update_form_info') && (
          <TextField label={op === 'update_form_info' ? 'Title (optional)' : 'Title'} field="formsTitle"
            data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="Customer feedback" />
        )}

        {(op === 'create_form' || op === 'update_form_info' || op === 'add_question') && (
          <AreaField label={op === 'add_question' ? 'Helper text (optional)' : 'Description (optional)'}
            field="formsDescription" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="{{llm-1.output}}" />
        )}

        {op === 'add_question' && (<>
          <TextField label="Question" field="formsQuestion" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="How did you hear about us?" />
          <SelectField label="Answer type" field="formsQuestionType" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback="TEXT"
            options={[
              { value: 'TEXT', label: 'Short answer' },
              { value: 'PARAGRAPH', label: 'Paragraph' },
              { value: 'RADIO', label: 'Multiple choice' },
              { value: 'CHECKBOX', label: 'Checkboxes' },
              { value: 'DROPDOWN', label: 'Dropdown' },
              { value: 'SCALE', label: 'Linear scale' },
              { value: 'DATE', label: 'Date' },
              { value: 'TIME', label: 'Time' },
            ]} />
          <TextField label="Options" field="formsOptions" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="Search, A friend, Advert — or 1,5 for a scale" />
          <SelectField label="Required" field="formsRequired" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback="false"
            options={[{ value: 'false', label: 'Optional' }, { value: 'true', label: 'Required' }]} />
        </>)}

        {(op === 'add_question' || op === 'delete_item') && (
          <NumField label="Position" field="formsIndex" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback={0} />
        )}

        {op === 'set_quiz_mode' && (
          <SelectField label="Quiz mode" field="formsIsQuiz" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback="true"
            options={[{ value: 'true', label: 'On' }, { value: 'false', label: 'Off' }]} />
        )}

        {op === 'set_publish_settings' && (
          <SelectField label="Accepting responses" field="formsAccepting" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback="true"
            options={[{ value: 'true', label: 'Open — accepting responses' }, { value: 'false', label: 'Closed' }]} />
        )}

        {op === 'get_response' && (
          <TextField label="Response ID" field="formsResponseId" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="from List Responses" />
        )}

        {op === 'list_responses' && (
          <NumField label="Limit" field="formsLimit" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback={25} />
        )}
      </IntegrationSection>
  )
}

export function GoogleTasksConfig({ data, nodeId, updateNodeData }: ProviderConfigProps) {
  const op = data.integrationOp ?? 'list_tasks'
  const needsTask = ['get_task', 'update_task', 'complete_task', 'delete_task', 'move_task'].includes(op)
  return (
      <IntegrationSection
        provider="googletasks" label="Google Tasks" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
        defaultOp="list_tasks"
        ops={[
          { value: 'list_tasks', label: 'List Tasks' },
          { value: 'get_task', label: 'Get Task' },
          { value: 'create_task', label: 'Create Task' },
          { value: 'update_task', label: 'Update Task' },
          { value: 'complete_task', label: 'Complete Task' },
          { value: 'delete_task', label: 'Delete Task' },
          { value: 'move_task', label: 'Move Task' },
          { value: 'clear_completed', label: 'Clear Completed' },
          { value: 'list_task_lists', label: 'List Task Lists' },
          { value: 'get_task_list', label: 'Get Task List' },
          { value: 'create_task_list', label: 'Create Task List' },
          { value: 'update_task_list', label: 'Rename Task List' },
          { value: 'delete_task_list', label: 'Delete Task List' },
        ]}
        tokenPlaceholder="Google access token"
        hideManual
      >
        {op !== 'list_task_lists' && op !== 'create_task_list' && (
          <ResourceField label={op === 'delete_task_list' ? 'Task list' : 'Task list (optional)'}
            provider="googletasks" kind="tasklist" field="tasksListId" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="defaults to your primary list" />
        )}

        {needsTask && (
          <TextField label="Task ID" field="tasksTaskId" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="from List Tasks" />
        )}

        {['create_task', 'update_task', 'create_task_list', 'update_task_list'].includes(op) && (
          <TextField label={op === 'update_task' ? 'Title (optional)' : 'Title'} field="tasksTitle"
            data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{llm-1.output}}" />
        )}

        {(op === 'create_task' || op === 'update_task') && (<>
          <AreaField label="Notes (optional)" field="tasksNotes" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="{{llm-1.output}}" />
          <DateTimeField label="Due (optional)" field="tasksDue" data={data} nodeId={nodeId} updateNodeData={updateNodeData} />
        </>)}

        {op === 'update_task' && (
          <SelectField label="Status (optional)" field="tasksStatus" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback=""
            options={[
              { value: '', label: 'Leave unchanged' },
              { value: 'needsAction', label: 'Not done' },
              { value: 'completed', label: 'Completed' },
            ]} />
        )}

        {(op === 'create_task' || op === 'move_task') && (<>
          <TextField label="Parent task (optional)" field="tasksParent" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="task ID — makes this a subtask" />
          <TextField label="Position after (optional)" field="tasksPrevious" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="sibling task ID" />
        </>)}

        {op === 'move_task' && (
          <TextField label="Move to list (optional)" field="tasksDestinationList" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="another task list ID" />
        )}

        {op === 'list_tasks' && (<>
          <SelectField label="Completed tasks" field="tasksShowCompleted" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback="false"
            options={[{ value: 'false', label: 'Hide completed' }, { value: 'true', label: 'Include completed' }]} />
          <DateTimeField label="Due after (optional)" field="tasksDueMin" data={data} nodeId={nodeId} updateNodeData={updateNodeData} />
          <DateTimeField label="Due before (optional)" field="tasksDueMax" data={data} nodeId={nodeId} updateNodeData={updateNodeData} />
        </>)}

        {(op === 'list_tasks' || op === 'list_task_lists') && (
          <NumField label="Limit" field="tasksLimit" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback={25} />
        )}
      </IntegrationSection>
  )
}

export function GoogleChatConfig({ data, nodeId, updateNodeData }: ProviderConfigProps) {
  const op = data.integrationOp ?? 'send_message'
  const needsSpace = ['get_space', 'update_space', 'delete_space', 'send_message', 'reply_in_thread',
    'list_messages', 'list_members', 'add_member'].includes(op)
  const needsMessage = ['get_message', 'update_message', 'delete_message', 'add_reaction'].includes(op)
  return (
      <IntegrationSection
        provider="googlechat" label="Google Chat" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
        defaultOp="send_message"
        ops={[
          { value: 'send_message', label: 'Send Message' },
          { value: 'reply_in_thread', label: 'Reply in Thread' },
          { value: 'get_message', label: 'Get Message' },
          { value: 'update_message', label: 'Update Message' },
          { value: 'delete_message', label: 'Delete Message' },
          { value: 'list_messages', label: 'List Messages' },
          { value: 'add_reaction', label: 'Add Reaction' },
          { value: 'list_spaces', label: 'List Spaces' },
          { value: 'get_space', label: 'Get Space' },
          { value: 'create_space', label: 'Create Space' },
          { value: 'setup_space', label: 'Create Space with Members' },
          { value: 'update_space', label: 'Rename Space' },
          { value: 'delete_space', label: 'Delete Space' },
          { value: 'find_direct_message', label: 'Find Direct Message' },
          { value: 'list_members', label: 'List Members' },
          { value: 'add_member', label: 'Add Member' },
          { value: 'remove_member', label: 'Remove Member' },
        ]}
        tokenPlaceholder="Google access token"
        hideManual
      >
        {needsSpace && (
          <ResourceField label="Space" provider="googlechat" kind="space" field="chatSpace"
            data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="spaces/…" />
        )}

        {needsMessage && (
          <TextField label="Message" field="chatMessageId" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="spaces/…/messages/… from List Messages" />
        )}

        {['send_message', 'reply_in_thread', 'update_message'].includes(op) && (
          <AreaField label="Message text" field="chatText" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="{{llm-1.output}}" />
        )}

        {(op === 'send_message' || op === 'reply_in_thread') && (
          <TextField label={op === 'reply_in_thread' ? 'Thread' : 'Thread key (optional)'} field="chatThread"
            data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder={op === 'reply_in_thread' ? 'thread name, or any key you chose' : 'group replies under one key'} />
        )}

        {op === 'add_reaction' && (
          <TextField label="Emoji" field="chatEmoji" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="👍 — the emoji itself, not :thumbsup:" />
        )}

        {['create_space', 'setup_space', 'update_space'].includes(op) && (<>
          <TextField label="Space name" field="chatDisplayName" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="Launch war room" />
          {op !== 'update_space' && (
            <SelectField label="Type" field="chatSpaceType" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback="SPACE"
              options={[{ value: 'SPACE', label: 'Named space' }, { value: 'GROUP_CHAT', label: 'Group chat' }]} />
          )}
        </>)}

        {['setup_space', 'add_member', 'find_direct_message'].includes(op) && (
          <TextField label={op === 'setup_space' ? 'Members' : 'Member email'} field="chatMemberEmail"
            data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder={op === 'setup_space' ? 'jane@acme.com, sam@acme.com' : 'jane@acme.com'} />
        )}

        {op === 'remove_member' && (
          <TextField label="Membership" field="chatMembership" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="spaces/…/members/… from List Members" />
        )}

        {(op === 'list_spaces' || op === 'list_messages') && (
          <TextField label="Filter (optional)" field="chatFilter" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder={op === 'list_spaces' ? 'spaceType = "SPACE"' : 'createTime > "2026-08-01T00:00:00Z"'} />
        )}

        {['list_spaces', 'list_messages', 'list_members'].includes(op) && (
          <NumField label="Limit" field="chatLimit" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback={25} />
        )}
      </IntegrationSection>
  )
}

export function GoogleKeepConfig({ data, nodeId, updateNodeData }: ProviderConfigProps) {
  const op = data.integrationOp ?? 'create_note'
  return (
      <IntegrationSection
        provider="googlekeep" label="Google Keep" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
        defaultOp="create_note"
        ops={[
          { value: 'create_note', label: 'Create Note' },
          { value: 'get_note', label: 'Get Note' },
          { value: 'list_notes', label: 'List Notes' },
          { value: 'delete_note', label: 'Delete Note' },
          { value: 'share_note', label: 'Share Note' },
          { value: 'unshare_note', label: 'Unshare Note' },
        ]}
        tokenPlaceholder="Google access token"
        hideManual
      >
        {/* Keep is the one Google service a personal account cannot use at all,
            so say it here rather than letting Connect fail without explanation. */}
        <p className="-mt-1 text-[10px] leading-relaxed text-[var(--color-subtle)]">
          The Keep API is <span className="text-[var(--color-muted)]">Google Workspace only</span> — a
          personal @gmail.com account can't authorize it, and a Workspace admin has to enable it for
          the domain first.
        </p>

        {op !== 'create_note' && op !== 'list_notes' && (
          <TextField label="Note" field="keepNoteName" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="notes/… from List Notes" />
        )}

        {op === 'create_note' && (<>
          <TextField label="Title" field="keepTitle" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="{{llm-1.output}}" />
          <AreaField label="Text" field="keepText" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="{{llm-1.output}}" />
          <AreaField label="Checklist (optional)" field="keepListItems" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="One item per line — replaces the text body" />
        </>)}

        {(op === 'share_note' || op === 'unshare_note') && (
          <TextField label={op === 'share_note' ? 'Share with' : 'Permissions to remove'} field="keepEmail"
            data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder={op === 'share_note' ? 'jane@acme.com, sam@acme.com' : 'permission names from Get Note'} />
        )}

        {op === 'list_notes' && (<>
          <TextField label="Filter (optional)" field="keepFilter" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="trashed = false" />
          <NumField label="Limit" field="keepLimit" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback={25} />
        </>)}
      </IntegrationSection>
  )
}

export function GranolaConfig({ data, nodeId, updateNodeData }: ProviderConfigProps) {
  const op = data.integrationOp ?? 'list_notes'
  return (
      <IntegrationSection
        provider="granola" label="Granola" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
        defaultOp="list_notes"
        ops={[
          { value: 'list_notes', label: 'List Notes' },
          { value: 'get_note', label: 'Get Note' },
          { value: 'get_transcript', label: 'Get Transcript' },
        ]}
        tokenPlaceholder="grn_..."
        hideManual
      >
        {/* Granola's API is read-only, which is worth saying before someone
            hunts for a "create note" operation that does not exist. */}
        <p className="-mt-1 text-[10px] leading-relaxed text-[var(--color-subtle)]">
          Read-only — Granola exposes notes, summaries and transcripts, with no way to create or edit
          them. Only notes that already have an AI summary appear.
        </p>

        {(op === 'get_note' || op === 'get_transcript') && (
          <TextField label="Note ID" field="granolaNoteId" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="{{prev-node.output}}" />
        )}

        {op === 'list_notes' && (<>
          <DateTimeField label="Created after (optional)" field="granolaCreatedAfter" data={data}
            nodeId={nodeId} updateNodeData={updateNodeData} />
          <TextField label="Cursor (optional)" field="granolaCursor" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="from a previous run's response" />
          <NumField label="Limit" field="granolaLimit" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback={25} />
        </>)}
      </IntegrationSection>
  )
}

export function ResendConfig({ data, nodeId, updateNodeData }: ProviderConfigProps) {
  const op = data.integrationOp ?? 'send_email'
  const needsEmailId = ['get_email', 'reschedule_email', 'cancel_email', 'get_received_email'].includes(op)
  const needsDomainId = ['get_domain', 'verify_domain', 'delete_domain'].includes(op)
  const needsContact = ['get_contact', 'update_contact', 'delete_contact', 'list_contact_segments',
    'add_contact_to_segment', 'remove_contact_from_segment'].includes(op)
  const needsSegmentId = ['get_segment', 'delete_segment', 'list_segment_contacts', 'create_broadcast',
    'add_contact_to_segment', 'remove_contact_from_segment'].includes(op)
  const needsBroadcastId = ['get_broadcast', 'send_broadcast', 'delete_broadcast', 'get_broadcast_metrics'].includes(op)
  const needsTemplateId = ['get_template', 'publish_template', 'delete_template'].includes(op)
  const isList = ['list_sent_emails', 'list_received_emails', 'list_contacts', 'list_segment_contacts',
    'list_suppressions', 'list_logs'].includes(op)
  return (
      <IntegrationSection
        provider="resend" label="Resend" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
        defaultOp="send_email"
        ops={[
          { value: 'send_email', label: 'Send Email' },
          { value: 'send_batch', label: 'Send Batch' },
          { value: 'get_email', label: 'Get Email' },
          { value: 'list_sent_emails', label: 'List Sent Emails' },
          { value: 'list_received_emails', label: 'List Received Emails' },
          { value: 'get_received_email', label: 'Get Received Email' },
          { value: 'reschedule_email', label: 'Reschedule Email' },
          { value: 'cancel_email', label: 'Cancel Scheduled Email' },
          { value: 'list_domains', label: 'List Domains' },
          { value: 'get_domain', label: 'Get Domain' },
          { value: 'create_domain', label: 'Add Domain' },
          { value: 'verify_domain', label: 'Verify Domain' },
          { value: 'delete_domain', label: 'Delete Domain' },
          { value: 'create_contact', label: 'Create Contact' },
          { value: 'get_contact', label: 'Get Contact' },
          { value: 'update_contact', label: 'Update Contact' },
          { value: 'list_contacts', label: 'List Contacts' },
          { value: 'delete_contact', label: 'Delete Contact' },
          { value: 'add_contact_to_segment', label: 'Add Contact to Segment' },
          { value: 'remove_contact_from_segment', label: 'Remove Contact from Segment' },
          { value: 'list_contact_segments', label: "List a Contact's Segments" },
          { value: 'create_segment', label: 'Create Segment' },
          { value: 'list_segments', label: 'List Segments' },
          { value: 'get_segment', label: 'Get Segment' },
          { value: 'delete_segment', label: 'Delete Segment' },
          { value: 'list_segment_contacts', label: 'List Segment Contacts' },
          { value: 'create_broadcast', label: 'Create Broadcast' },
          { value: 'list_broadcasts', label: 'List Broadcasts' },
          { value: 'get_broadcast', label: 'Get Broadcast' },
          { value: 'send_broadcast', label: 'Send Broadcast' },
          { value: 'delete_broadcast', label: 'Delete Broadcast' },
          { value: 'get_broadcast_metrics', label: 'Broadcast Metrics' },
          { value: 'create_template', label: 'Create Template' },
          { value: 'list_templates', label: 'List Templates' },
          { value: 'get_template', label: 'Get Template' },
          { value: 'publish_template', label: 'Publish Template' },
          { value: 'delete_template', label: 'Delete Template' },
          { value: 'add_suppression', label: 'Add Suppression' },
          { value: 'list_suppressions', label: 'List Suppressions' },
          { value: 'remove_suppression', label: 'Remove Suppression' },
          { value: 'list_webhooks', label: 'List Webhooks' },
          { value: 'create_webhook', label: 'Create Webhook' },
          { value: 'delete_webhook', label: 'Delete Webhook' },
          { value: 'list_logs', label: 'List Logs' },
          { value: 'list_api_keys', label: 'List API Keys' },
        ]}
        tokenPlaceholder="re_..."
        hideManual
      >
        {op === 'send_email' && (<>
          <TextField label="From" field="resendFrom" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="Fernary <hello@yourdomain.com>" />
          <TextField label="To" field="resendTo" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="jane@acme.com, sam@acme.com" />
          <TextField label="Subject" field="resendSubject" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="{{llm-1.output}}" />
          <AreaField label="HTML body" field="resendHtml" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="{{llm-1.output}}" />
          <AreaField label="Plain-text body (optional)" field="resendText" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="Generated from the HTML if left blank" />
          <TextField label="Cc (optional)" field="resendCc" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="" />
          <TextField label="Bcc (optional)" field="resendBcc" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="" />
          <TextField label="Reply-to (optional)" field="resendReplyTo" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="" />
          <TextField label="Send at (optional)" field="resendScheduledAt" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="in 1 hour — or an ISO 8601 timestamp" />
          <TextField label="Template ID (optional)" field="resendTemplateId" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="replaces the bodies above" />
          <TextField label="Template variables (optional)" field="resendTemplateVars" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder='{"name": "Jane"}' />
          <TextField label="Tags (optional)" field="resendTags" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder='{"campaign": "launch"}' />
          <TextField label="Headers (optional)" field="resendHeaders" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder='{"X-Entity-Ref-ID": "123"}' />
        </>)}

        {op === 'send_batch' && (
          <AreaField label="Emails (JSON array)" field="resendBatch" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder='[{"from":"a@b.com","to":"c@d.com","subject":"Hi","html":"<p>Hi</p>"}]' />
        )}

        {needsEmailId && (
          <TextField label="Email ID" field="resendEmailId" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="{{prev-node.output}}" />
        )}
        {op === 'reschedule_email' && (
          <TextField label="New send time" field="resendScheduledAt" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="in 3 hours — or an ISO 8601 timestamp" />
        )}

        {op === 'create_domain' && (<>
          <TextField label="Domain" field="resendDomain" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="mail.yourdomain.com" />
          <TextField label="Region (optional)" field="resendRegion" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="us-east-1" />
        </>)}
        {needsDomainId && (
          <TextField label="Domain ID" field="resendDomainId" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="from List Domains" />
        )}

        {(op === 'create_contact' || op === 'update_contact' || needsContact) && (
          <TextField label={op === 'create_contact' ? 'Email' : 'Contact (email or ID)'} field="resendEmail"
            data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="jane@acme.com" />
        )}
        {(op === 'create_contact' || op === 'update_contact') && (<>
          <TextField label="First name (optional)" field="resendFirstName" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="Jane" />
          <TextField label="Last name (optional)" field="resendLastName" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="Doe" />
          <SelectField label="Subscription" field="resendUnsubscribed" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback=""
            options={[
              { value: '', label: 'Leave unchanged' },
              { value: 'false', label: 'Subscribed' },
              { value: 'true', label: 'Unsubscribed' },
            ]} />
          <TextField label="Properties (optional)" field="resendProperties" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder='{"plan": "pro"}' />
        </>)}

        {needsSegmentId && (
          <TextField label="Segment ID" field="resendSegmentId" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="from List Segments" />
        )}
        {(op === 'create_segment' || op === 'create_template' || op === 'create_broadcast') && (
          <TextField label="Name" field="resendName" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="August newsletter" />
        )}

        {op === 'create_broadcast' && (<>
          <TextField label="From" field="resendFrom" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="Fernary <hello@yourdomain.com>" />
          <TextField label="Subject" field="resendSubject" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="{{llm-1.output}}" />
          <AreaField label="HTML body" field="resendHtml" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="{{llm-1.output}}" />
          <TextField label="Reply-to (optional)" field="resendReplyTo" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="" />
        </>)}
        {needsBroadcastId && (
          <TextField label="Broadcast ID" field="resendBroadcastId" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="from List Broadcasts" />
        )}
        {op === 'send_broadcast' && (
          <TextField label="Send at (optional)" field="resendScheduledAt" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="leave blank to send now" />
        )}

        {op === 'create_template' && (<>
          <TextField label="Subject (optional)" field="resendSubject" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="" />
          <AreaField label="HTML" field="resendHtml" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="<p>Hello {{name}}</p>" />
        </>)}
        {needsTemplateId && (
          <TextField label="Template ID" field="resendTemplateId" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="from List Templates" />
        )}

        {(op === 'add_suppression' || op === 'remove_suppression') && (
          <TextField label="Email" field="resendEmail" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="jane@acme.com" />
        )}

        {op === 'create_webhook' && (<>
          <TextField label="Endpoint URL" field="resendUrl" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="https://example.com/hooks/resend" />
          <TextField label="Events (optional)" field="resendEvents" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="email.delivered, email.bounced" />
        </>)}
        {op === 'delete_webhook' && (
          <TextField label="Webhook ID" field="resendWebhookId" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="from List Webhooks" />
        )}

        {isList && (
          <NumField label="Limit" field="resendLimit" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback={25} />
        )}
      </IntegrationSection>
  )
}

export function SendGridConfig({ data, nodeId, updateNodeData }: ProviderConfigProps) {
  const op = data.integrationOp ?? 'send_email'
  const needsList = ['get_list', 'update_list', 'delete_list', 'remove_contacts_from_list'].includes(op)
  const needsContact = ['get_contact', 'delete_contact', 'remove_contacts_from_list'].includes(op)
  const needsSingleSend = ['get_single_send', 'schedule_single_send', 'delete_single_send'].includes(op)
  const needsEmail = ['upsert_contact', 'add_global_unsubscribe', 'delete_bounce', 'delete_global_unsubscribe'].includes(op)
  const namedCreate = ['create_list', 'update_list', 'create_segment', 'create_template',
    'create_single_send', 'create_custom_field'].includes(op)
  const isList = ['list_contacts', 'list_lists', 'list_single_sends', 'list_templates'].includes(op)
  return (
      <IntegrationSection
        provider="sendgrid" label="SendGrid" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
        defaultOp="send_email"
        ops={[
          { value: 'send_email', label: 'Send Email' },
          { value: 'upsert_contact', label: 'Create or Update Contact' },
          { value: 'get_import_status', label: 'Check Contact Import' },
          { value: 'search_contacts', label: 'Search Contacts (SGQL)' },
          { value: 'get_contact', label: 'Get Contact' },
          { value: 'list_contacts', label: 'List Contacts' },
          { value: 'delete_contact', label: 'Delete Contact' },
          { value: 'get_contact_count', label: 'Contact Count' },
          { value: 'list_lists', label: 'List Lists' },
          { value: 'create_list', label: 'Create List' },
          { value: 'get_list', label: 'Get List' },
          { value: 'update_list', label: 'Rename List' },
          { value: 'delete_list', label: 'Delete List' },
          { value: 'remove_contacts_from_list', label: 'Remove Contacts from List' },
          { value: 'list_segments', label: 'List Segments' },
          { value: 'get_segment', label: 'Get Segment' },
          { value: 'create_segment', label: 'Create Segment' },
          { value: 'delete_segment', label: 'Delete Segment' },
          { value: 'list_single_sends', label: 'List Single Sends' },
          { value: 'get_single_send', label: 'Get Single Send' },
          { value: 'create_single_send', label: 'Create Single Send' },
          { value: 'schedule_single_send', label: 'Schedule Single Send' },
          { value: 'delete_single_send', label: 'Delete Single Send' },
          { value: 'list_templates', label: 'List Templates' },
          { value: 'get_template', label: 'Get Template' },
          { value: 'create_template', label: 'Create Template' },
          { value: 'delete_template', label: 'Delete Template' },
          { value: 'list_bounces', label: 'List Bounces' },
          { value: 'delete_bounce', label: 'Delete Bounce' },
          { value: 'list_blocks', label: 'List Blocks' },
          { value: 'list_spam_reports', label: 'List Spam Reports' },
          { value: 'list_invalid_emails', label: 'List Invalid Emails' },
          { value: 'list_global_unsubscribes', label: 'List Unsubscribes' },
          { value: 'add_global_unsubscribe', label: 'Add Unsubscribe' },
          { value: 'delete_global_unsubscribe', label: 'Remove Unsubscribe' },
          { value: 'get_stats', label: 'Delivery Stats' },
          { value: 'list_verified_senders', label: 'List Verified Senders' },
          { value: 'list_custom_fields', label: 'List Custom Fields' },
          { value: 'create_custom_field', label: 'Create Custom Field' },
          { value: 'get_account', label: 'Account Profile' },
          { value: 'list_key_scopes', label: 'What Can This Key Do?' },
        ]}
        tokenPlaceholder="SG...."
        hideManual
      >
        {op === 'send_email' && (<>
          <TextField label="From" field="sendgridFrom" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="hello@yourdomain.com — must be a verified sender" />
          <TextField label="To" field="sendgridTo" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="jane@acme.com, sam@acme.com" />
          <TextField label="Subject" field="sendgridSubject" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="{{llm-1.output}}" />
          <AreaField label="HTML body" field="sendgridHtml" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="{{llm-1.output}}" />
          <AreaField label="Plain-text body (optional)" field="sendgridText" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="" />
          <TextField label="Cc (optional)" field="sendgridCc" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="" />
          <TextField label="Bcc (optional)" field="sendgridBcc" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="" />
          <TextField label="Reply-to (optional)" field="sendgridReplyTo" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="" />
          <TextField label="Dynamic template ID (optional)" field="sendgridTemplateId" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="d-… — supplies the subject and body" />
          <TextField label="Template data (optional)" field="sendgridTemplateData" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder='{"name": "Jane"}' />
          <TextField label="Send at (optional)" field="sendgridSendAt" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="unix seconds — at most 72 hours ahead" />
        </>)}

        {needsEmail && (
          <TextField label="Email" field="sendgridEmail" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="jane@acme.com" />
        )}
        {op === 'upsert_contact' && (<>
          <TextField label="First name (optional)" field="sendgridFirstName" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="Jane" />
          <TextField label="Last name (optional)" field="sendgridLastName" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="Doe" />
          <TextField label="Add to lists (optional)" field="sendgridListId" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="comma-separated list IDs" />
          <TextField label="Custom fields (optional)" field="sendgridCustomFields" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder='{"e1_T": "pro"} — keyed by field ID, not name' />
          <p className="-mt-1 text-[10px] leading-relaxed text-[var(--color-subtle)]">
            SendGrid queues contact upserts, so the contact isn't readable straight away. Don't chain a
            Get Contact after this — use Check Contact Import with the returned job ID.
          </p>
        </>)}

        {op === 'get_import_status' && (
          <TextField label="Job ID" field="sendgridJobId" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="{{prev-node.output}}" />
        )}

        {(op === 'search_contacts' || op === 'create_segment') && (
          <AreaField label="SGQL query" field="sendgridQuery" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="email LIKE '%@acme.com'" />
        )}

        {needsContact && (
          <TextField label={op === 'remove_contacts_from_list' ? 'Contact IDs' : 'Contact ID'}
            field="sendgridContactId" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="from Search Contacts" />
        )}
        {(needsList || op === 'create_segment') && (
          <TextField label={op === 'create_segment' ? 'Parent list IDs (optional)' : 'List ID'}
            field="sendgridListId" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="from List Lists" />
        )}
        {(op === 'get_segment' || op === 'delete_segment') && (
          <TextField label="Segment ID" field="sendgridSegmentId" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="from List Segments" />
        )}
        {needsSingleSend && (
          <TextField label="Single send ID" field="sendgridSingleSendId" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="from List Single Sends" />
        )}
        {(op === 'get_template' || op === 'delete_template') && (
          <TextField label="Template ID" field="sendgridTemplateId" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="from List Templates" />
        )}

        {namedCreate && (
          <TextField label="Name" field="sendgridName" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="August newsletter" />
        )}
        {op === 'create_single_send' && (<>
          <TextField label="Subject" field="sendgridSubject" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="{{llm-1.output}}" />
          <AreaField label="HTML body" field="sendgridHtml" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="{{llm-1.output}}" />
          <TextField label="Sender ID" field="sendgridFrom" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="from List Verified Senders" />
          <TextField label="Send to lists" field="sendgridListId" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="comma-separated list IDs" />
        </>)}
        {op === 'schedule_single_send' && (
          <TextField label="Send at" field="sendgridSendAt" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="now — or an ISO 8601 timestamp" />
        )}

        {op === 'create_custom_field' && (
          <SelectField label="Field type" field="sendgridFieldType" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback="Text"
            options={[{ value: 'Text', label: 'Text' }, { value: 'Number', label: 'Number' }, { value: 'Date', label: 'Date' }]} />
        )}

        {op === 'get_stats' && (<>
          <TextField label="Start date" field="sendgridStartDate" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="2026-08-01" />
          <TextField label="End date (optional)" field="sendgridEndDate" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="2026-08-31" />
          <SelectField label="Group by" field="sendgridAggregate" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback="day"
            options={[{ value: 'day', label: 'Day' }, { value: 'week', label: 'Week' }, { value: 'month', label: 'Month' }]} />
        </>)}

        {isList && (
          <NumField label="Limit" field="sendgridLimit" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback={25} />
        )}
      </IntegrationSection>
  )
}

export function KitConfig({ data, nodeId, updateNodeData }: ProviderConfigProps) {
  const op = data.integrationOp ?? 'create_subscriber'
  const needsSubscriber = ['get_subscriber', 'update_subscriber', 'unsubscribe',
    'get_subscriber_stats', 'list_subscriber_tags', 'untag_subscriber'].includes(op)
  const needsEmail = ['create_subscriber', 'add_subscriber_to_form', 'add_subscriber_to_sequence',
    'tag_subscriber', 'update_subscriber'].includes(op)
  const needsTag = ['rename_tag', 'tag_subscriber', 'untag_subscriber', 'list_tag_subscribers'].includes(op)
  const needsBroadcast = ['get_broadcast', 'update_broadcast', 'delete_broadcast',
    'get_broadcast_stats', 'get_broadcast_link_clicks'].includes(op)
  const named = ['create_tag', 'rename_tag', 'create_sequence', 'create_custom_field'].includes(op)
  const isList = ['list_subscribers', 'list_tags', 'list_forms', 'list_sequences', 'list_broadcasts',
    'list_custom_fields', 'list_purchases', 'list_webhooks', 'list_segments', 'list_email_templates',
    'list_tag_subscribers', 'list_form_subscribers', 'list_sequence_subscribers', 'list_subscriber_tags'].includes(op)
  return (
      <IntegrationSection
        provider="kit" label="Kit" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
        defaultOp="create_subscriber"
        ops={[
          { value: 'create_subscriber', label: 'Create Subscriber' },
          { value: 'list_subscribers', label: 'List / Find Subscribers' },
          { value: 'get_subscriber', label: 'Get Subscriber' },
          { value: 'update_subscriber', label: 'Update Subscriber' },
          { value: 'unsubscribe', label: 'Unsubscribe' },
          { value: 'get_subscriber_stats', label: 'Subscriber Stats' },
          { value: 'list_subscriber_tags', label: "Subscriber's Tags" },
          { value: 'list_tags', label: 'List Tags' },
          { value: 'create_tag', label: 'Create Tag' },
          { value: 'rename_tag', label: 'Rename Tag' },
          { value: 'tag_subscriber', label: 'Tag a Subscriber' },
          { value: 'untag_subscriber', label: 'Remove a Tag' },
          { value: 'list_tag_subscribers', label: 'Subscribers with a Tag' },
          { value: 'list_forms', label: 'List Forms' },
          { value: 'add_subscriber_to_form', label: 'Add Subscriber to Form' },
          { value: 'list_form_subscribers', label: 'Form Subscribers' },
          { value: 'list_sequences', label: 'List Sequences' },
          { value: 'get_sequence', label: 'Get Sequence' },
          { value: 'create_sequence', label: 'Create Sequence' },
          { value: 'add_subscriber_to_sequence', label: 'Add Subscriber to Sequence' },
          { value: 'list_sequence_subscribers', label: 'Sequence Subscribers' },
          { value: 'list_broadcasts', label: 'List Broadcasts' },
          { value: 'get_broadcast', label: 'Get Broadcast' },
          { value: 'create_broadcast', label: 'Create Broadcast' },
          { value: 'update_broadcast', label: 'Update Broadcast' },
          { value: 'delete_broadcast', label: 'Delete Broadcast' },
          { value: 'get_broadcast_stats', label: 'Broadcast Stats' },
          { value: 'get_broadcast_link_clicks', label: 'Broadcast Link Clicks' },
          { value: 'list_custom_fields', label: 'List Custom Fields' },
          { value: 'create_custom_field', label: 'Create Custom Field' },
          { value: 'delete_custom_field', label: 'Delete Custom Field' },
          { value: 'list_purchases', label: 'List Purchases' },
          { value: 'get_purchase', label: 'Get Purchase' },
          { value: 'create_purchase', label: 'Record a Purchase' },
          { value: 'list_webhooks', label: 'List Webhooks' },
          { value: 'create_webhook', label: 'Create Webhook' },
          { value: 'delete_webhook', label: 'Delete Webhook' },
          { value: 'list_segments', label: 'List Segments' },
          { value: 'list_email_templates', label: 'List Email Templates' },
          { value: 'get_account', label: 'Account' },
          { value: 'get_email_stats', label: 'Email Stats' },
          { value: 'get_growth_stats', label: 'Growth Stats' },
        ]}
        tokenPlaceholder="Kit V4 API key"
        hideManual
      >
        {needsEmail && (
          <TextField label={op === 'update_subscriber' ? 'New email (optional)' : 'Email'} field="kitEmail"
            data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="jane@acme.com" />
        )}
        {op === 'list_subscribers' && (
          <TextField label="Email (optional)" field="kitEmail" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="exact address — this is how you look a subscriber up" />
        )}
        {needsSubscriber && (
          <TextField label="Subscriber ID" field="kitSubscriberId" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="from List / Find Subscribers" />
        )}
        {(op === 'create_subscriber' || op === 'update_subscriber' || op === 'add_subscriber_to_form') && (<>
          <TextField label="First name (optional)" field="kitFirstName" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="Jane" />
          <TextField label="Custom fields (optional)" field="kitFields" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder='{"last_name": "Doe"} — the field must exist in Kit already' />
        </>)}
        {(op === 'create_subscriber' || op === 'list_subscribers') && (
          <SelectField label="State" field="kitState" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback=""
            options={[
              { value: '', label: op === 'list_subscribers' ? 'Any' : 'Default (active)' },
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
              { value: 'bounced', label: 'Bounced' },
              { value: 'cancelled', label: 'Cancelled' },
            ]} />
        )}
        {op === 'list_subscribers' && (
          <DateTimeField label="Created after (optional)" field="kitCreatedAfter" data={data} nodeId={nodeId} updateNodeData={updateNodeData} />
        )}

        {needsTag && (
          <TextField label="Tag ID" field="kitTagId" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="from List Tags" />
        )}
        {named && (
          <TextField label={op === 'create_custom_field' ? 'Label' : 'Name'} field="kitName"
            data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="Newsletter signups" />
        )}

        {(op === 'add_subscriber_to_form' || op === 'list_form_subscribers') && (
          <TextField label="Form ID" field="kitFormId" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="from List Forms" />
        )}
        {['get_sequence', 'add_subscriber_to_sequence', 'list_sequence_subscribers'].includes(op) && (
          <TextField label="Sequence ID" field="kitSequenceId" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="from List Sequences" />
        )}

        {needsBroadcast && (
          <TextField label="Broadcast ID" field="kitBroadcastId" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="from List Broadcasts" />
        )}
        {(op === 'create_broadcast' || op === 'update_broadcast') && (<>
          <TextField label={op === 'update_broadcast' ? 'Subject (optional)' : 'Subject'} field="kitSubject"
            data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{llm-1.output}}" />
          <AreaField label="Content" field="kitContent" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="{{llm-1.output}}" />
          <TextField label="Internal note (optional)" field="kitDescription" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="August issue" />
          <DateTimeField label="Send at (optional)" field="kitSendAt" data={data} nodeId={nodeId} updateNodeData={updateNodeData} />
          {op === 'create_broadcast' && (
            <TextField label="Only these tags (optional)" field="kitTagId" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
              placeholder="comma-separated tag IDs" />
          )}
          <p className="-mt-1 text-[10px] leading-relaxed text-[var(--color-subtle)]">
            Leaving "send at" blank keeps the broadcast as a draft in Kit rather than sending it.
          </p>
        </>)}

        {op === 'delete_custom_field' && (
          <TextField label="Field ID" field="kitFieldId" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="from List Custom Fields" />
        )}
        {op === 'get_purchase' && (
          <TextField label="Purchase ID" field="kitPurchaseId" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="from List Purchases" />
        )}
        {op === 'create_purchase' && (
          <AreaField label="Purchase (JSON)" field="kitPurchase" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder='{"email_address":"jane@acme.com","transaction_id":"t_1","currency":"USD","products":[{"name":"Course","pid":"p1","lid":"l1","unit_price":49.0,"quantity":1}]}' />
        )}

        {op === 'create_webhook' && (<>
          <TextField label="Target URL" field="kitUrl" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="https://example.com/hooks/kit" />
          <TextField label="Event" field="kitEvent" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="subscriber.subscriber_activate" />
        </>)}
        {op === 'delete_webhook' && (
          <TextField label="Webhook ID" field="kitWebhookId" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="from List Webhooks" />
        )}

        {isList && (
          <NumField label="Limit" field="kitLimit" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback={25} />
        )}
      </IntegrationSection>
  )
}

export function AirtableConfig({ data, nodeId, updateNodeData }: ProviderConfigProps) {
  const op = data.integrationOp ?? 'list_records'
  // Everything except account and base-level schema work needs a table.
  const tableOps = !['list_bases', 'get_base_schema', 'create_base', 'whoami',
    'list_webhooks', 'create_webhook', 'delete_webhook', 'refresh_webhook',
    'list_webhook_payloads', 'create_table', 'update_table', 'create_field', 'update_field'].includes(op)
  const needsRecord = ['get_record', 'update_record', 'delete_record', 'delete_records',
    'list_comments', 'create_comment', 'update_comment', 'delete_comment'].includes(op)
  const singleFields = op === 'create_record' || op === 'update_record'
  const batchRecords = ['create_records', 'update_records', 'upsert_records'].includes(op)
  const isWrite = singleFields || batchRecords
  const needsWebhook = ['delete_webhook', 'refresh_webhook', 'list_webhook_payloads'].includes(op)
  const schemaTable = ['update_table', 'create_field', 'update_field'].includes(op)
  return (
      <IntegrationSection
        provider="airtable" label="Airtable" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
        defaultOp="list_records"
        ops={[
          { value: 'list_records', label: 'List Records' },
          { value: 'get_record', label: 'Get Record' },
          { value: 'create_record', label: 'Create Record' },
          { value: 'create_records', label: 'Create Records (batch)' },
          { value: 'update_record', label: 'Update Record' },
          { value: 'update_records', label: 'Update Records (batch)' },
          { value: 'upsert_records', label: 'Upsert Records' },
          { value: 'delete_record', label: 'Delete Record' },
          { value: 'delete_records', label: 'Delete Records (batch)' },
          { value: 'list_comments', label: 'List Comments' },
          { value: 'create_comment', label: 'Add Comment' },
          { value: 'update_comment', label: 'Update Comment' },
          { value: 'delete_comment', label: 'Delete Comment' },
          { value: 'list_bases', label: 'List Bases' },
          { value: 'get_base_schema', label: 'Get Base Schema' },
          { value: 'create_base', label: 'Create Base' },
          { value: 'create_table', label: 'Create Table' },
          { value: 'update_table', label: 'Update Table' },
          { value: 'create_field', label: 'Create Field' },
          { value: 'update_field', label: 'Update Field' },
          { value: 'list_webhooks', label: 'List Webhooks' },
          { value: 'create_webhook', label: 'Create Webhook' },
          { value: 'refresh_webhook', label: 'Refresh Webhook' },
          { value: 'delete_webhook', label: 'Delete Webhook' },
          { value: 'list_webhook_payloads', label: 'Webhook Payloads' },
          { value: 'whoami', label: 'Who Am I' },
        ]}
        tokenPlaceholder="Airtable token"
        hideManual
      >
        {op !== 'list_bases' && op !== 'whoami' && op !== 'create_base' && (
          <ResourceField label="Base" provider="airtable" kind="base" field="airtableBaseId"
            data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="app…" />
        )}

        {tableOps && (
          <TextField label="Table" field="airtableTable" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="Tasks — the name exactly as in Airtable, or its table ID" />
        )}
        {schemaTable && (
          <TextField label="Table ID" field="airtableTableId" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="tbl… — schema changes need the ID, not the name" />
        )}

        {needsRecord && (
          <TextField label={op === 'delete_records' ? 'Record IDs' : 'Record ID'} field="airtableRecordId"
            data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder={op === 'delete_records' ? 'rec1, rec2 — max 10' : 'rec…'} />
        )}

        {op === 'list_records' && (<>
          <TextField label="Filter formula (optional)" field="airtableFormula" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder={'{Status}="Active"'} />
          <TextField label="View (optional)" field="airtableView" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="Grid view" />
          <TextField label="Fields (optional)" field="airtableFieldNames" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="Name, Status — comma-separated" />
          <TextField label="Sort by (optional)" field="airtableSortField" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="Created" />
          <SelectField label="Direction" field="airtableSortDirection" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} fallback="asc"
            options={[{ value: 'asc', label: 'Ascending' }, { value: 'desc', label: 'Descending' }]} />
          <TextField label="Offset (optional)" field="airtableOffset" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="from a previous run's response" />
          <NumField label="Max records" field="airtableLimit" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback={25} />
        </>)}

        {singleFields && (
          <AreaField label="Fields" field="airtableFields" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder='{"Name": "Acme", "Status": "Active"}' />
        )}
        {batchRecords && (<>
          <AreaField label="Records" field="airtableRecords" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder={op === 'create_records'
              ? '[{"fields": {"Name": "Acme"}}]'
              : '[{"id": "rec…", "fields": {"Status": "Done"}}]'} />
          <p className="-mt-1 text-[10px] leading-relaxed text-[var(--color-subtle)]">
            Airtable takes at most 10 records per request — use a Loop node for more.
          </p>
        </>)}
        {op === 'upsert_records' && (
          <TextField label="Match on" field="airtableMergeOn" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="Email — the field that decides update vs insert" />
        )}
        {isWrite && (
          <SelectField label="Coerce values" field="airtableTypecast" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} fallback="true"
            options={[
              { value: 'true', label: 'Yes — convert text to numbers, dates and select options' },
              { value: 'false', label: 'No — reject a value that is not already the right type' },
            ]} />
        )}

        {(op === 'create_comment' || op === 'update_comment') && (
          <AreaField label="Comment" field="airtableComment" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="{{llm-1.output}}" />
        )}
        {(op === 'update_comment' || op === 'delete_comment') && (
          <TextField label="Comment ID" field="airtableCommentId" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="from List Comments" />
        )}

        {['create_base', 'create_table', 'update_table', 'create_field', 'update_field'].includes(op) && (
          <TextField label={['update_table', 'update_field'].includes(op) ? 'Name (optional)' : 'Name'}
            field="airtableName" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="Tasks" />
        )}
        {['create_table', 'update_table', 'update_field'].includes(op) && (
          <TextField label="Description (optional)" field="airtableDescription" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="" />
        )}
        {op === 'create_base' && (<>
          <TextField label="Workspace ID" field="airtableWorkspaceId" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="wsp…" />
          <AreaField label="Tables" field="airtableTables" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder='[{"name": "Tasks", "fields": [{"name": "Name", "type": "singleLineText"}]}]' />
        </>)}
        {op === 'create_table' && (
          <AreaField label="Fields" field="airtableTableFields" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder='[{"name": "Name", "type": "singleLineText"}]' />
        )}
        {op === 'create_field' && (<>
          <TextField label="Field type" field="airtableFieldType" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="singleLineText, number, singleSelect, date…" />
          <AreaField label="Options (optional)" field="airtableFieldOptions" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder='{"choices": [{"name": "Active"}]} — shape depends on the type' />
        </>)}
        {op === 'update_field' && (
          <TextField label="Field ID" field="airtableFieldId" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="fld…" />
        )}

        {op === 'create_webhook' && (
          <TextField label="Notification URL" field="airtableUrl" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="https://example.com/hooks/airtable" />
        )}
        {needsWebhook && (
          <TextField label="Webhook ID" field="airtableWebhookId" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="from List Webhooks" />
        )}
        {op === 'list_webhook_payloads' && (
          <TextField label="Cursor (optional)" field="airtableCursor" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="from a previous run" />
        )}
        {op === 'create_webhook' && (
          <p className="-mt-1 text-[10px] leading-relaxed text-[var(--color-subtle)]">
            Airtable webhooks expire after 7 days. Schedule a Refresh Webhook run to keep one alive.
          </p>
        )}

        {op === 'list_comments' && (
          <NumField label="Limit" field="airtableLimit" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback={25} />
        )}
      </IntegrationSection>
  )
}

export function ClickUpConfig({ data, nodeId, updateNodeData }: ProviderConfigProps) {
  const op = data.integrationOp ?? 'list_tasks'
  const workspaceOps = ['list_spaces', 'search_tasks', 'list_time_entries', 'create_time_entry',
    'get_running_timer', 'start_timer', 'stop_timer', 'list_goals', 'create_goal',
    'list_webhooks', 'create_webhook'].includes(op)
  const needsSpace = ['get_space', 'list_folders', 'list_lists', 'create_list',
    'list_space_tags', 'list_views'].includes(op)
  const needsList = ['get_list', 'list_tasks', 'create_task', 'list_custom_fields',
    'list_list_members', 'search_tasks', 'create_webhook', 'list_views'].includes(op)
  const needsTask = ['get_task', 'update_task', 'delete_task', 'list_comments', 'create_comment',
    'create_checklist', 'add_tag_to_task', 'remove_tag_from_task', 'set_custom_field_value',
    'remove_custom_field_value', 'add_dependency', 'delete_dependency', 'link_tasks', 'unlink_tasks',
    'create_time_entry', 'start_timer', 'list_attachments', 'list_task_members'].includes(op)
  const taskFields = op === 'create_task' || op === 'update_task'
  const named = ['create_list', 'create_task', 'update_task', 'create_checklist',
    'create_checklist_item', 'update_checklist_item', 'create_goal'].includes(op)
  return (
      <IntegrationSection
        provider="clickup" label="ClickUp" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
        defaultOp="list_tasks"
        ops={[
          { value: 'list_tasks', label: 'List Tasks' },
          { value: 'search_tasks', label: 'Search Tasks (across lists)' },
          { value: 'get_task', label: 'Get Task' },
          { value: 'create_task', label: 'Create Task' },
          { value: 'update_task', label: 'Update Task' },
          { value: 'delete_task', label: 'Delete Task' },
          { value: 'list_comments', label: 'List Comments' },
          { value: 'create_comment', label: 'Add Comment' },
          { value: 'update_comment', label: 'Update Comment' },
          { value: 'delete_comment', label: 'Delete Comment' },
          { value: 'create_checklist', label: 'Create Checklist' },
          { value: 'create_checklist_item', label: 'Add Checklist Item' },
          { value: 'update_checklist_item', label: 'Update Checklist Item' },
          { value: 'delete_checklist', label: 'Delete Checklist' },
          { value: 'list_space_tags', label: 'List Tags' },
          { value: 'add_tag_to_task', label: 'Add Tag to Task' },
          { value: 'remove_tag_from_task', label: 'Remove Tag from Task' },
          { value: 'list_custom_fields', label: 'List Custom Fields' },
          { value: 'set_custom_field_value', label: 'Set Custom Field' },
          { value: 'remove_custom_field_value', label: 'Clear Custom Field' },
          { value: 'add_dependency', label: 'Add Dependency' },
          { value: 'delete_dependency', label: 'Remove Dependency' },
          { value: 'link_tasks', label: 'Link Tasks' },
          { value: 'unlink_tasks', label: 'Unlink Tasks' },
          { value: 'list_time_entries', label: 'List Time Entries' },
          { value: 'create_time_entry', label: 'Log Time' },
          { value: 'get_running_timer', label: 'Running Timer' },
          { value: 'start_timer', label: 'Start Timer' },
          { value: 'stop_timer', label: 'Stop Timer' },
          { value: 'list_workspaces', label: 'List Workspaces' },
          { value: 'list_spaces', label: 'List Spaces' },
          { value: 'get_space', label: 'Get Space' },
          { value: 'list_folders', label: 'List Folders' },
          { value: 'list_lists', label: 'List Lists' },
          { value: 'get_list', label: 'Get List' },
          { value: 'create_list', label: 'Create List' },
          { value: 'list_attachments', label: 'Task Attachments' },
          { value: 'list_goals', label: 'List Goals' },
          { value: 'create_goal', label: 'Create Goal' },
          { value: 'list_list_members', label: 'List Members' },
          { value: 'list_task_members', label: 'Task Members' },
          { value: 'list_views', label: 'List Views' },
          { value: 'list_webhooks', label: 'List Webhooks' },
          { value: 'create_webhook', label: 'Create Webhook' },
          { value: 'delete_webhook', label: 'Delete Webhook' },
          { value: 'get_authorized_user', label: 'Authorized User' },
        ]}
        tokenPlaceholder="pk_..."
        hideManual
      >
        {(workspaceOps || op === 'get_task' || taskFields) && (
          <ResourceField label={workspaceOps ? 'Workspace' : 'Workspace (optional)'}
            provider="clickup" kind="workspace" field="clickupWorkspaceId"
            data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="from List Workspaces" />
        )}

        {needsSpace && (
          <TextField label={op === 'list_lists' || op === 'create_list' ? 'Space ID (if no folder)' : 'Space ID'}
            field="clickupSpaceId" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="from List Spaces" />
        )}
        {['list_lists', 'create_list', 'list_views'].includes(op) && (
          <TextField label="Folder ID (optional)" field="clickupFolderId" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="omit for lists that sit directly in the space" />
        )}
        {needsList && (
          <TextField label={op === 'search_tasks' ? 'List IDs (optional)' : 'List ID'} field="clickupListId"
            data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder={op === 'search_tasks' ? 'comma-separated to narrow the search' : 'from List Lists'} />
        )}
        {needsTask && (
          <TextField label="Task ID" field="clickupTaskId" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="from List Tasks" />
        )}

        {named && (
          <TextField label={op === 'update_task' || op === 'update_checklist_item' ? 'Name (optional)' : 'Name'}
            field="clickupName" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="{{llm-1.output}}" />
        )}

        {taskFields && (<>
          <AreaField label="Description (optional)" field="clickupDescription" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="{{llm-1.output}}" />
          <TextField label="Status (optional)" field="clickupStatus" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="must be a status that exists in the target list" />
          <SelectField label="Priority (optional)" field="clickupPriority" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} fallback=""
            options={[
              { value: '', label: 'Leave unset' },
              { value: '1', label: 'Urgent' },
              { value: '2', label: 'High' },
              { value: '3', label: 'Normal' },
              { value: '4', label: 'Low' },
            ]} />
          <TextField label="Due date (optional)" field="clickupDueDate" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="unix timestamp in milliseconds" />
          <TextField label="Time estimate (optional)" field="clickupTimeEstimate" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="milliseconds" />
          <TextField label="Assignees (optional)" field="clickupAssignees" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="numeric user IDs, comma-separated — not emails" />
          <TextField label="Parent task (optional)" field="clickupParent" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="task ID — makes this a subtask" />
          {op === 'create_task' && (
            <TextField label="Tags (optional)" field="clickupTagName" data={data} nodeId={nodeId}
              updateNodeData={updateNodeData} placeholder="comma-separated" />
          )}
        </>)}

        {(op === 'add_tag_to_task' || op === 'remove_tag_from_task') && (
          <TextField label="Tag name" field="clickupTagName" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="from List Tags" />
        )}

        {(op === 'list_tasks' || op === 'search_tasks') && (<>
          <TextField label="Statuses (optional)" field="clickupStatuses" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="to do, in progress — comma-separated" />
          <TextField label="Assignees (optional)" field="clickupAssignees" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="numeric user IDs, comma-separated" />
          <SelectField label="Closed tasks" field="clickupIncludeClosed" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} fallback="false"
            options={[{ value: 'false', label: 'Exclude closed' }, { value: 'true', label: 'Include closed' }]} />
          {op === 'list_tasks' && (
            <SelectField label="Subtasks" field="clickupSubtasks" data={data} nodeId={nodeId}
              updateNodeData={updateNodeData} fallback="false"
              options={[{ value: 'false', label: 'Top-level only' }, { value: 'true', label: 'Include subtasks' }]} />
          )}
          <TextField label="Order by (optional)" field="clickupOrderBy" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="created, updated, due_date" />
        </>)}

        {['create_comment', 'update_comment', 'create_time_entry', 'start_timer'].includes(op) && (
          <AreaField label={op.includes('timer') || op === 'create_time_entry' ? 'Description (optional)' : 'Comment'}
            field="clickupComment" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="{{llm-1.output}}" />
        )}
        {(op === 'update_comment' || op === 'delete_comment') && (
          <TextField label="Comment ID" field="clickupCommentId" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="from List Comments" />
        )}

        {['create_checklist_item', 'update_checklist_item', 'delete_checklist'].includes(op) && (
          <TextField label="Checklist ID" field="clickupChecklistId" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="from the task" />
        )}
        {op === 'update_checklist_item' && (<>
          <TextField label="Item ID" field="clickupChecklistItemId" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="" />
          <SelectField label="Resolved" field="clickupResolved" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} fallback=""
            options={[
              { value: '', label: 'Leave unchanged' },
              { value: 'true', label: 'Resolved' },
              { value: 'false', label: 'Not resolved' },
            ]} />
        </>)}

        {(op === 'set_custom_field_value' || op === 'remove_custom_field_value') && (
          <TextField label="Field ID" field="clickupFieldId" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="from List Custom Fields" />
        )}
        {op === 'set_custom_field_value' && (
          <TextField label="Value" field="clickupFieldValue" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="plain text, or JSON for a typed field" />
        )}

        {(op === 'add_dependency' || op === 'delete_dependency') && (<>
          <TextField label="Waits for (optional)" field="clickupDependsOn" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="task ID this one depends on" />
          <TextField label="Blocks (optional)" field="clickupDependencyOf" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="task ID that waits for this one" />
        </>)}
        {(op === 'link_tasks' || op === 'unlink_tasks') && (
          <TextField label="Other task ID" field="clickupLinksTo" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="" />
        )}

        {op === 'create_time_entry' && (<>
          <TextField label="Duration" field="clickupDuration" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="milliseconds — 3600000 is one hour" />
          <TextField label="Start (optional)" field="clickupStartDate" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="unix timestamp in milliseconds" />
        </>)}
        {op === 'list_time_entries' && (<>
          <TextField label="From (optional)" field="clickupStartDate" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="unix milliseconds" />
          <TextField label="To (optional)" field="clickupEndDate" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="unix milliseconds" />
        </>)}

        {op === 'create_goal' && (
          <TextField label="Due date (optional)" field="clickupDueDate" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="unix milliseconds" />
        )}

        {op === 'create_webhook' && (<>
          <TextField label="Endpoint URL" field="clickupUrl" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="https://example.com/hooks/clickup" />
          <TextField label="Events (optional)" field="clickupEvents" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="taskCreated, taskUpdated" />
        </>)}
        {op === 'delete_webhook' && (
          <TextField label="Webhook ID" field="clickupWebhookId" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="from List Webhooks" />
        )}

        {['get_task', 'update_task', 'delete_task'].includes(op) && (
          <SelectField label="ID type" field="clickupCustomTaskIds" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} fallback="false"
            options={[
              { value: 'false', label: "ClickUp's own task ID" },
              { value: 'true', label: 'A custom task ID (needs the workspace above)' },
            ]} />
        )}
      </IntegrationSection>
  )
}

export function TypeformConfig({ data, nodeId, updateNodeData }: ProviderConfigProps) {
  const op = data.integrationOp ?? 'list_responses'
  const needsForm = !['list_forms', 'list_workspaces', 'get_workspace', 'create_workspace',
    'delete_workspace', 'list_themes', 'get_theme', 'delete_theme', 'list_images',
    'get_current_user'].includes(op)
  const responseFilters = ['list_responses', 'get_response_text'].includes(op)
  return (
      <IntegrationSection
        provider="typeform" label="Typeform" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
        defaultOp="list_responses"
        ops={[
          { value: 'list_responses', label: 'List Responses (raw)' },
          { value: 'get_response_text', label: 'Read Responses as Q&A' },
          { value: 'delete_responses', label: 'Delete Responses' },
          { value: 'get_insights', label: 'Form Insights' },
          { value: 'list_forms', label: 'List Forms' },
          { value: 'get_form', label: 'Get Form' },
          { value: 'create_form', label: 'Create Form' },
          { value: 'update_form', label: 'Replace Form' },
          { value: 'delete_form', label: 'Delete Form' },
          { value: 'get_form_messages', label: 'Form Messages' },
          { value: 'list_workspaces', label: 'List Workspaces' },
          { value: 'get_workspace', label: 'Get Workspace' },
          { value: 'create_workspace', label: 'Create Workspace' },
          { value: 'delete_workspace', label: 'Delete Workspace' },
          { value: 'list_themes', label: 'List Themes' },
          { value: 'get_theme', label: 'Get Theme' },
          { value: 'delete_theme', label: 'Delete Theme' },
          { value: 'list_images', label: 'List Images' },
          { value: 'list_webhooks', label: 'List Webhooks' },
          { value: 'create_webhook', label: 'Create Webhook' },
          { value: 'delete_webhook', label: 'Delete Webhook' },
          { value: 'get_current_user', label: 'Current User' },
        ]}
        tokenPlaceholder="Typeform token"
        hideManual
      >
        {needsForm && (
          <TextField label="Form ID" field="typeformFormId" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="from List Forms" />
        )}

        {op === 'get_response_text' && (
          <p className="-mt-1 text-[10px] leading-relaxed text-[var(--color-subtle)]">
            Returns readable "question: answer" lines. Raw responses reference questions by field ID,
            so use this when the point is to summarise or route on what someone said.
          </p>
        )}

        {responseFilters && (<>
          <DateTimeField label="Since (optional)" field="typeformSince" data={data} nodeId={nodeId} updateNodeData={updateNodeData} />
          <DateTimeField label="Until (optional)" field="typeformUntil" data={data} nodeId={nodeId} updateNodeData={updateNodeData} />
          <TextField label="After token (optional)" field="typeformAfter" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="cursor — pick up where the last run stopped" />
          <SelectField label="Completed only" field="typeformCompleted" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} fallback=""
            options={[
              { value: '', label: 'All responses' },
              { value: 'true', label: 'Completed only' },
              { value: 'false', label: 'Partial only' },
            ]} />
          <TextField label="Search answers (optional)" field="typeformQuery" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="free text" />
          <NumField label="Limit" field="typeformLimit" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback={25} />
        </>)}

        {op === 'delete_responses' && (
          <TextField label="Response tokens" field="typeformResponseIds" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="comma-separated" />
        )}

        {(op === 'create_form' || op === 'create_workspace') && (
          <TextField label={op === 'create_workspace' ? 'Workspace name' : 'Title'} field="typeformTitle"
            data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="Customer feedback" />
        )}
        {(op === 'create_form' || op === 'update_form') && (
          <AreaField label={op === 'update_form' ? 'Form definition (required)' : 'Form definition (optional)'}
            field="typeformDefinition" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder='{"title":"Feedback","fields":[{"title":"How did we do?","type":"rating"}]}' />
        )}
        {op === 'update_form' && (
          <p className="-mt-1 text-[10px] leading-relaxed text-[var(--color-subtle)]">
            This replaces the whole form. Fetch it with Get Form first, change what you need, and send
            the full definition back — anything omitted is removed.
          </p>
        )}

        {(op === 'list_forms' || op === 'get_workspace' || op === 'delete_workspace') && (
          <TextField label={op === 'list_forms' ? 'Workspace ID (optional)' : 'Workspace ID'}
            field="typeformWorkspaceId" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="from List Workspaces" />
        )}
        {op === 'list_forms' && (<>
          <TextField label="Search (optional)" field="typeformSearch" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="filter by form name" />
          <NumField label="Limit" field="typeformLimit" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback={25} />
        </>)}
        {(op === 'get_theme' || op === 'delete_theme') && (
          <TextField label="Theme ID" field="typeformThemeId" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="from List Themes" />
        )}

        {op === 'create_webhook' && (<>
          <TextField label="Webhook URL" field="typeformUrl" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="https://example.com/hooks/typeform" />
          <TextField label="Signing secret (optional)" field="typeformSecret" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="lets the receiver verify the payload" />
        </>)}
        {(op === 'create_webhook' || op === 'delete_webhook') && (
          <TextField label="Tag (optional)" field="typeformTag" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="fernary — reusing a tag replaces that webhook" />
        )}
      </IntegrationSection>
  )
}

export function CalendlyConfig({ data, nodeId, updateNodeData }: ProviderConfigProps) {
  const op = data.integrationOp ?? 'list_scheduled_events'
  const scoped = ['list_event_types', 'list_scheduled_events', 'list_webhooks', 'create_webhook'].includes(op)
  const needsEventType = ['get_event_type', 'list_available_times', 'create_booking',
    'create_scheduling_link'].includes(op)
  const needsEvent = ['get_scheduled_event', 'cancel_event', 'list_invitees', 'get_invitee'].includes(op)
  const window = ['list_available_times', 'list_busy_times'].includes(op)
  return (
      <IntegrationSection
        provider="calendly" label="Calendly" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
        defaultOp="list_scheduled_events"
        ops={[
          { value: 'list_scheduled_events', label: 'List Scheduled Events' },
          { value: 'get_scheduled_event', label: 'Get Scheduled Event' },
          { value: 'cancel_event', label: 'Cancel Event' },
          { value: 'list_event_types', label: 'List Event Types' },
          { value: 'get_event_type', label: 'Get Event Type' },
          { value: 'list_available_times', label: 'List Available Times' },
          { value: 'create_booking', label: 'Book a Meeting' },
          { value: 'create_scheduling_link', label: 'Create Single-Use Link' },
          { value: 'list_invitees', label: 'List Invitees' },
          { value: 'get_invitee', label: 'Get Invitee' },
          { value: 'mark_no_show', label: 'Mark No-Show' },
          { value: 'undo_no_show', label: 'Undo No-Show' },
          { value: 'list_availability_schedules', label: 'Availability Schedules' },
          { value: 'list_busy_times', label: 'Busy Times' },
          { value: 'list_memberships', label: 'List Members' },
          { value: 'invite_to_organization', label: 'Invite to Organization' },
          { value: 'list_invitations', label: 'List Invitations' },
          { value: 'remove_member', label: 'Remove Member' },
          { value: 'list_routing_forms', label: 'List Routing Forms' },
          { value: 'list_routing_form_submissions', label: 'Routing Form Submissions' },
          { value: 'list_webhooks', label: 'List Webhooks' },
          { value: 'create_webhook', label: 'Create Webhook' },
          { value: 'delete_webhook', label: 'Delete Webhook' },
          { value: 'delete_invitee_data', label: 'Delete Invitee Data (GDPR)' },
          { value: 'get_current_user', label: 'Current User' },
          { value: 'get_user', label: 'Get User' },
        ]}
        tokenPlaceholder="Calendly token"
        hideManual
      >
        {scoped && (
          <SelectField label="Whose records" field="calendlyScope" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} fallback="user"
            options={[
              { value: 'user', label: 'Just the connected account' },
              { value: 'organization', label: 'The whole organization' },
            ]} />
        )}

        {needsEventType && (
          <TextField label="Event type URI" field="calendlyEventType" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="https://api.calendly.com/event_types/…" />
        )}
        {needsEvent && (
          <TextField label="Event URI" field="calendlyEvent" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="https://api.calendly.com/scheduled_events/…" />
        )}

        {op === 'create_booking' && (<>
          <p className="-mt-1 text-[10px] leading-relaxed text-[var(--color-subtle)]">
            Books the meeting outright — no Calendly page for the invitee. Needs a{' '}
            <span className="text-[var(--color-muted)]">paid Calendly plan</span>, and the start time must
            be one that List Available Times returned.
          </p>
          <DateTimeField label="Start time" field="calendlyStartTime" data={data} nodeId={nodeId} updateNodeData={updateNodeData} />
          <TextField label="Invitee email" field="calendlyInviteeEmail" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="jane@acme.com" />
          <TextField label="Invitee name" field="calendlyInviteeName" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="Jane Doe" />
          <TextField label="Timezone" field="calendlyTimezone" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="Europe/Dublin" />
          <TextField label="Guests (optional)" field="calendlyGuests" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="comma-separated emails" />
          <AreaField label="Question answers (optional)" field="calendlyAnswers" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder='[{"question":"Company","answer":"Acme","position":0}]' />
        </>)}

        {window && (<>
          <DateTimeField label="From" field="calendlyStartTime" data={data} nodeId={nodeId} updateNodeData={updateNodeData} />
          <DateTimeField label="To" field="calendlyEndTime" data={data} nodeId={nodeId} updateNodeData={updateNodeData} />
          <p className="-mt-1 text-[10px] leading-relaxed text-[var(--color-subtle)]">
            Calendly refuses a window longer than 7 days.
          </p>
        </>)}

        {op === 'list_scheduled_events' && (<>
          <SelectField label="Status (optional)" field="calendlyStatus" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} fallback=""
            options={[
              { value: '', label: 'Any' },
              { value: 'active', label: 'Active' },
              { value: 'canceled', label: 'Canceled' },
            ]} />
          <DateTimeField label="From (optional)" field="calendlyStartTime" data={data} nodeId={nodeId} updateNodeData={updateNodeData} />
          <DateTimeField label="To (optional)" field="calendlyEndTime" data={data} nodeId={nodeId} updateNodeData={updateNodeData} />
        </>)}

        {op === 'cancel_event' && (
          <TextField label="Reason (optional)" field="calendlyReason" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="shown to the invitee" />
        )}

        {(op === 'get_invitee' || op === 'mark_no_show') && (
          <TextField label="Invitee URI" field="calendlyInvitee" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="from List Invitees" />
        )}
        {op === 'undo_no_show' && (
          <TextField label="No-show URI" field="calendlyNoShow" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="returned by Mark No-Show" />
        )}
        {op === 'list_invitees' && (
          <TextField label="Email filter (optional)" field="calendlyEmail" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="jane@acme.com" />
        )}

        {(op === 'invite_to_organization' || op === 'delete_invitee_data') && (
          <TextField label={op === 'delete_invitee_data' ? 'Emails to erase' : 'Email'} field="calendlyEmail"
            data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder={op === 'delete_invitee_data' ? 'comma-separated' : 'jane@acme.com'} />
        )}
        {op === 'delete_invitee_data' && (
          <p className="-mt-1 text-[10px] leading-relaxed text-[var(--color-fail)]">
            Irreversible. Calendly erases these invitees' data permanently.
          </p>
        )}
        {op === 'remove_member' && (
          <TextField label="Membership URI" field="calendlyMembership" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="from List Members" />
        )}
        {op === 'list_routing_form_submissions' && (
          <TextField label="Routing form URI" field="calendlyRoutingForm" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="from List Routing Forms" />
        )}
        {op === 'get_user' && (
          <TextField label="User URI" field="calendlyUser" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="https://api.calendly.com/users/…" />
        )}

        {op === 'create_webhook' && (<>
          <TextField label="Callback URL" field="calendlyUrl" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="https://example.com/hooks/calendly" />
          <TextField label="Events (optional)" field="calendlyEvents" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="invitee.created, invitee.canceled" />
        </>)}
        {op === 'delete_webhook' && (
          <TextField label="Webhook URI" field="calendlyWebhookId" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="from List Webhooks" />
        )}

        {['list_event_types', 'list_scheduled_events', 'list_invitees', 'list_memberships',
          'list_routing_forms', 'list_routing_form_submissions', 'list_webhooks'].includes(op) && (
          <NumField label="Limit" field="calendlyLimit" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback={25} />
        )}
      </IntegrationSection>
  )
}
