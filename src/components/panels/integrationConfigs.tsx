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

type ResourceProvider = 'vercel' | 'airtable' | 'clickup' | 'monday' | 'asana' | 'supabase' | 'googlesearchconsole' | 'notion' | 'linear' | 'github' | 'gitlab' | 'gmail' | 'stripe' | 'googlecalendar' | 'googledrive' | 'outlook' | 'slack' | 'jira' | 'confluence' | 'bitbucket' | 'googlemeet' | 'googleslides' | 'googleforms' | 'googletasks' | 'googlechat' | 'googlekeep'
type ResourceKind = 'deployment' | 'domain' | 'envvar' | 'database' | 'page' | 'team' | 'project' | 'repo' | 'price' | 'calendar' | 'folder' | 'channel' | 'user' | 'label' | 'space' | 'board' | 'tasklist' | 'base' | 'workspace' | 'property' | 'group' | 'column' | 'section' | 'task'

function ResourceField({ label, provider, kind, field, parentField, parentFields, optionalParent, clears, data, nodeId, updateNodeData, placeholder }: FieldProps & {
  provider: ResourceProvider
  kind: ResourceKind
  parentField?: string
  /**
   * The parent is a filter rather than a requirement, so a blank one means
   * "list what the account can see" instead of "wait". A personal Vercel
   * account has no team, and without this its project picker would sit waiting
   * for a team that will never be chosen.
   */
  optionalParent?: boolean
  /**
   * Fields whose value belongs to the old parent and is meaningless once this
   * one changes. A project id from the previous team is not a smaller problem
   * than an empty one — it points at something real in the wrong place.
   */
  clears?: string[]
  /**
   * For resources nested two levels deep, where one field cannot name the
   * container: a Vercel deployment belongs to a project, which belongs to a
   * team. The values are joined with "/" into the single `parent` the resources
   * route accepts, matching GitHub's existing "owner/repo" convention.
   *
   * A missing LAST segment means "not chosen yet", which keeps the picker
   * waiting. Earlier segments may legitimately be empty — a personal Vercel
   * account has no team, so "/my-project" is a complete parent.
   */
  parentFields?: string[]
}) {
  const read = (name: string) => (typeof data[name] === 'string' ? data[name] as string : '')
  let parent: string | undefined
  if (parentFields) {
    const parts = parentFields.map(read)
    parent = parts[parts.length - 1] === '' ? '' : parts.join('/')
  } else if (parentField) {
    const value = read(parentField)
    // undefined asks for the unscoped list; '' means "waiting on a choice".
    parent = value === '' && optionalParent ? undefined : value
  }
  return (
    <FormField label={label} htmlFor={`cfg-${nodeId}-${field}`}>
      <ResourcePicker provider={provider} kind={kind} id={`cfg-${nodeId}-${field}`} placeholder={placeholder}
        parent={parent}
        value={typeof data[field] === 'string' ? (data[field] as string) : ''}
        onChange={(val) => updateNodeData(nodeId, {
          [field]: val,
          ...Object.fromEntries((clears ?? []).map((name) => [name, ''])),
        })} />
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
  provider: 'github' | 'gitlab' | 'monday' | 'asana' | 'gmail' | 'stripe' | 'shopify' | 'googlecalendar' | 'outlook' | 'slack' | 'googledrive' | 'googledocs' | 'googlesheets' | 'jira' | 'confluence' | 'bitbucket' | 'granola' | 'resend' | 'sendgrid' | 'kit' | 'airtable' | 'clickup' | 'typeform' | 'calendly' | 'dropbox' | 'netlify' | 'vercel' | 'supabase' | 'gumroad' | 'googlesearchconsole' | 'googlecontacts' | 'hubspot' | 'front' | 'googlemeet' | 'googleslides' | 'googleforms' | 'googletasks' | 'googlechat' | 'googlekeep'
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
          { value: 'get_repo_details', label: 'Repository Details' },
          { value: 'list_repo_tree', label: 'List Repository Structure' },
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
        {(op === 'list_commits' || op === 'list_repo_tree' || op === 'get_file') && (
          <TextField label="Branch/ref (optional)" field="githubRef" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="main" />
        )}
        {op === 'list_repo_tree' && (<>
          <TextField label="Directory prefix (optional)" field="githubPath" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="src/components" />
          <NumField label="Maximum entries" field="githubTreeLimit" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback={1000} />
        </>)}
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
          <ResourceField label={op === 'list_child_pages' ? 'Parent page' : 'Page'} provider="confluence" kind="page"
            field="confluencePageId" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{prev-node.output}}" />
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
          <ResourceField label="Parent page (optional)" provider="confluence" kind="page" field="confluenceParentId"
            data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="page ID to nest under" />
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

export function MondayConfig({ data, nodeId, updateNodeData }: ProviderConfigProps) {
  const op = data.integrationOp ?? 'list_items'
  const needsBoard = ['get_board', 'list_items', 'create_item', 'update_item'].includes(op)
  const needsItem = ['get_item', 'update_item', 'move_item_to_group', 'archive_item',
    'delete_item', 'create_update', 'list_updates'].includes(op)
  const needsGroup = ['create_item', 'move_item_to_group'].includes(op)
  return (
    <IntegrationSection
      provider="monday" label="monday.com" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
      defaultOp="list_items" hideManual tokenPlaceholder="OAuth access token"
      ops={[
        { value: 'list_boards', label: 'List Boards' },
        { value: 'get_board', label: 'Get Board' },
        { value: 'list_items', label: 'List Items' },
        { value: 'get_item', label: 'Get Item' },
        { value: 'create_item', label: 'Create Item' },
        { value: 'update_item', label: 'Update Item Columns' },
        { value: 'move_item_to_group', label: 'Move Item to Group' },
        { value: 'archive_item', label: 'Archive Item' },
        { value: 'delete_item', label: 'Delete Item' },
        { value: 'create_update', label: 'Add Update' },
        { value: 'list_updates', label: 'List Updates' },
        { value: 'list_users', label: 'List Users' },
      ]}
    >
      {needsBoard && (
        <ResourceField label="Board" provider="monday" kind="board" field="mondayBoardId"
          data={data} nodeId={nodeId} updateNodeData={updateNodeData} />
      )}
      {needsItem && (
        <TextField label="Item ID" field="mondayItemId" data={data} nodeId={nodeId}
          updateNodeData={updateNodeData} placeholder="from List Items or a trigger" />
      )}
      {needsGroup && (
        <ResourceField label={op === 'create_item' ? 'Group (optional)' : 'Group'} provider="monday" kind="group"
          field="mondayGroupId" parentField="mondayBoardId" data={data} nodeId={nodeId}
          updateNodeData={updateNodeData} />
      )}
      {op === 'create_item' && (
        <TextField label="Item name" field="mondayItemName" data={data} nodeId={nodeId}
          updateNodeData={updateNodeData} placeholder="{{llm-1.output}}" />
      )}
      {(op === 'create_item' || op === 'update_item') && (
        <AreaField label={op === 'create_item' ? 'Column values (optional JSON)' : 'Column values (JSON)'}
          field="mondayColumnValues" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
          placeholder={'{"status":{"label":"Done"},"date":{"date":"2026-08-06"}}'} />
      )}
      {op === 'create_update' && (
        <AreaField label="Update" field="mondayUpdateBody" data={data} nodeId={nodeId}
          updateNodeData={updateNodeData} placeholder="{{llm-1.output}}" />
      )}
      {op === 'list_items' && (
        <TextField label="Cursor (optional)" field="mondayCursor" data={data} nodeId={nodeId}
          updateNodeData={updateNodeData} placeholder="from a previous List Items response" />
      )}
      {['list_boards', 'list_items', 'list_updates', 'list_users'].includes(op) && (
        <NumField label="Limit" field="mondayLimit" data={data} nodeId={nodeId}
          updateNodeData={updateNodeData} fallback={25} />
      )}
      {(op === 'create_item' || op === 'update_item') && (
        <p className="-mt-1 text-[10px] leading-relaxed text-[var(--color-subtle)]">
          Use column IDs rather than their display titles. Open Get Board to see each board column and its ID.
        </p>
      )}
    </IntegrationSection>
  )
}

export function AsanaConfig({ data, nodeId, updateNodeData }: ProviderConfigProps) {
  const op = data.integrationOp ?? 'list_tasks'
  const needsWorkspace = ['list_projects', 'create_task'].includes(op)
  const needsProject = ['list_sections', 'list_tasks', 'create_task', 'add_task_to_project'].includes(op)
  const taskOps = ['get_task', 'update_task', 'delete_task', 'add_comment', 'list_comments',
    'add_task_to_project'].includes(op)
  const editing = ['create_task', 'create_subtask', 'update_task'].includes(op)
  return (
    <IntegrationSection
      provider="asana" label="Asana" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
      defaultOp="list_tasks" hideManual tokenPlaceholder="OAuth access token"
      ops={[
        { value: 'list_workspaces', label: 'List Workspaces' },
        { value: 'list_projects', label: 'List Projects' },
        { value: 'list_sections', label: 'List Sections' },
        { value: 'list_tasks', label: 'List Tasks' },
        { value: 'get_task', label: 'Get Task' },
        { value: 'create_task', label: 'Create Task' },
        { value: 'create_subtask', label: 'Create Subtask' },
        { value: 'update_task', label: 'Update Task' },
        { value: 'delete_task', label: 'Delete Task' },
        { value: 'add_comment', label: 'Add Comment' },
        { value: 'list_comments', label: 'List Comments' },
        { value: 'add_task_to_project', label: 'Add Task to Project' },
      ]}
    >
      {needsWorkspace && (
        <ResourceField label="Workspace" provider="asana" kind="workspace" field="asanaWorkspaceId"
          data={data} nodeId={nodeId} updateNodeData={updateNodeData} />
      )}
      {needsProject && (
        <ResourceField label="Project" provider="asana" kind="project" field="asanaProjectId"
          data={data} nodeId={nodeId} updateNodeData={updateNodeData} />
      )}
      {taskOps && (
        <ResourceField label="Task" provider="asana" kind="task" field="asanaTaskId"
          parentField="asanaProjectId" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
          placeholder="select a project above, or enter an ID manually" />
      )}
      {op === 'create_subtask' && (
        <ResourceField label="Parent task" provider="asana" kind="task" field="asanaParentTaskId"
          parentField="asanaProjectId" data={data} nodeId={nodeId} updateNodeData={updateNodeData} />
      )}
      {op === 'create_task' && (
        <ResourceField label="Section (optional)" provider="asana" kind="section" field="asanaSectionId"
          parentField="asanaProjectId" data={data} nodeId={nodeId} updateNodeData={updateNodeData} />
      )}
      {op === 'add_task_to_project' && (
        <ResourceField label="Section (optional)" provider="asana" kind="section" field="asanaSectionId"
          parentField="asanaProjectId" data={data} nodeId={nodeId} updateNodeData={updateNodeData} />
      )}
      {editing && (<>
        <TextField label={op === 'update_task' ? 'Name (optional)' : 'Task name'} field="asanaName"
          data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{llm-1.output}}" />
        <AreaField label="Notes (optional)" field="asanaNotes" data={data} nodeId={nodeId}
          updateNodeData={updateNodeData} placeholder="{{llm-1.output}}" />
        <TextField label="Assignee (optional)" field="asanaAssignee" data={data} nodeId={nodeId}
          updateNodeData={updateNodeData} placeholder="user ID or me" />
        <TextField label="Due date (optional)" field="asanaDueOn" data={data} nodeId={nodeId}
          updateNodeData={updateNodeData} placeholder="YYYY-MM-DD" />
      </>)}
      {op === 'update_task' && (
        <SelectField label="Completion" field="asanaCompleted" data={data} nodeId={nodeId}
          updateNodeData={updateNodeData} fallback="" options={[
            { value: '', label: 'Leave unchanged' },
            { value: 'true', label: 'Completed' },
            { value: 'false', label: 'Incomplete' },
          ]} />
      )}
      {op === 'add_comment' && (
        <AreaField label="Comment" field="asanaComment" data={data} nodeId={nodeId}
          updateNodeData={updateNodeData} placeholder="{{llm-1.output}}" />
      )}
      {['list_workspaces', 'list_projects', 'list_sections', 'list_tasks', 'list_comments'].includes(op) && (
        <NumField label="Limit" field="asanaLimit" data={data} nodeId={nodeId}
          updateNodeData={updateNodeData} fallback={50} />
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

export function DropboxConfig({ data, nodeId, updateNodeData }: ProviderConfigProps) {
  const op = data.integrationOp ?? 'list_folder'
  const needsPath = !['list_folder_continue', 'revoke_shared_link', 'list_shared_links',
    'list_file_requests', 'get_current_account', 'get_space_usage'].includes(op)
  const sharing = ['add_file_member', 'list_file_members'].includes(op)
  return (
      <IntegrationSection
        provider="dropbox" label="Dropbox" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
        defaultOp="list_folder"
        ops={[
          { value: 'list_folder', label: 'List Folder' },
          { value: 'list_folder_continue', label: 'List Folder (next page)' },
          { value: 'search', label: 'Search' },
          { value: 'get_metadata', label: 'Get Metadata' },
          { value: 'download', label: 'Read File (text)' },
          { value: 'upload', label: 'Write File' },
          { value: 'get_temporary_link', label: 'Get Temporary Link' },
          { value: 'create_folder', label: 'Create Folder' },
          { value: 'move', label: 'Move' },
          { value: 'copy', label: 'Copy' },
          { value: 'delete', label: 'Delete' },
          { value: 'list_revisions', label: 'List Revisions' },
          { value: 'restore', label: 'Restore Revision' },
          { value: 'create_shared_link', label: 'Create Shared Link' },
          { value: 'list_shared_links', label: 'List Shared Links' },
          { value: 'revoke_shared_link', label: 'Revoke Shared Link' },
          { value: 'add_file_member', label: 'Share File with People' },
          { value: 'list_file_members', label: 'List File Members' },
          { value: 'share_folder', label: 'Share Folder' },
          { value: 'list_file_requests', label: 'List File Requests' },
          { value: 'create_file_request', label: 'Create File Request' },
          { value: 'get_current_account', label: 'Account Info' },
          { value: 'get_space_usage', label: 'Space Usage' },
        ]}
        tokenPlaceholder="Dropbox token"
        hideManual
      >
        {needsPath && (
          <TextField label={op === 'create_file_request' ? 'Destination folder' : 'Path'}
            field="dropboxPath" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder={op === 'list_folder' ? '/Reports — leave empty for your Dropbox root' : '/Reports/q3.txt'} />
        )}
        {needsPath && (
          <p className="-mt-1 text-[10px] leading-relaxed text-[var(--color-subtle)]">
            Paths start at your Dropbox root with a slash, like <span className="font-mono">/Reports/q3.txt</span>.
          </p>
        )}

        {(op === 'move' || op === 'copy') && (
          <TextField label="Destination path" field="dropboxToPath" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="/Archive/q3.txt" />
        )}

        {op === 'download' && (
          <p className="-mt-1 text-[10px] leading-relaxed text-[var(--color-subtle)]">
            Returns the file's text, so it suits .txt, .md, .csv and .json. For a PDF or an image use
            Get Temporary Link and an HTTP Request node instead.
          </p>
        )}

        {op === 'upload' && (<>
          <AreaField label="Content" field="dropboxContent" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="{{llm-1.output}}" />
          <SelectField label="If the file exists" field="dropboxOverwrite" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} fallback="false"
            options={[
              { value: 'false', label: 'Keep both — Dropbox renames the new one' },
              { value: 'true', label: 'Overwrite it' },
            ]} />
        </>)}

        {op === 'list_folder' && (
          <SelectField label="Subfolders" field="dropboxRecursive" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} fallback="false"
            options={[
              { value: 'false', label: 'This folder only' },
              { value: 'true', label: 'Include subfolders' },
            ]} />
        )}
        {op === 'list_folder_continue' && (
          <TextField label="Cursor" field="dropboxCursor" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="{{prev-node.output}} — the cursor from List Folder" />
        )}
        {op === 'search' && (
          <TextField label="Query" field="dropboxQuery" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="invoice" />
        )}
        {op === 'restore' && (
          <TextField label="Revision" field="dropboxRev" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="from List Revisions" />
        )}
        {op === 'revoke_shared_link' && (
          <TextField label="Shared link URL" field="dropboxUrl" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="https://www.dropbox.com/s/…" />
        )}
        {op === 'create_shared_link' && (
          <SelectField label="Who can open it" field="dropboxVisibility" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} fallback=""
            options={[
              { value: '', label: "Dropbox's default for the account" },
              { value: 'public', label: 'Anyone with the link' },
              { value: 'team_only', label: 'Team only (paid plans)' },
              { value: 'password', label: 'Password protected (paid plans)' },
            ]} />
        )}

        {sharing && op === 'add_file_member' && (<>
          <TextField label="Share with" field="dropboxEmail" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="jane@acme.com, sam@acme.com" />
          <SelectField label="Access" field="dropboxAccessLevel" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} fallback="viewer"
            options={[{ value: 'viewer', label: 'Can view' }, { value: 'editor', label: 'Can edit' }]} />
          <TextField label="Message (optional)" field="dropboxMessage" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="sent with the invitation" />
        </>)}

        {op === 'create_file_request' && (
          <TextField label="Title" field="dropboxTitle" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="Send me your invoices" />
        )}

        {['list_folder', 'search', 'list_revisions', 'list_file_members', 'list_file_requests',
          'list_folder_continue'].includes(op) && (
          <NumField label="Limit" field="dropboxLimit" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback={100} />
        )}
      </IntegrationSection>
  )
}

export function NetlifyConfig({ data, nodeId, updateNodeData }: ProviderConfigProps) {
  const op = data.integrationOp ?? 'list_sites'
  const siteOps = op.includes('site') || op.includes('deploy') || op.includes('build') ||
    op.includes('form') || op.includes('hook') || op.includes('env') || op.includes('key') ||
    op.includes('dns') && op.includes('site')
  const envOp = op.includes('env_var')
  const accountSlugOp = ['list_account_sites', 'list_members', 'get_member'].includes(op)
  const deployOp = ['get_deploy', 'cancel_deploy', 'lock_deploy', 'unlock_deploy',
    'restore_deploy', 'publish_deploy'].includes(op)
  return (
      <IntegrationSection
        provider="netlify" label="Netlify" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
        defaultOp="list_sites"
        ops={[
          { value: 'list_sites', label: 'List Sites' },
          { value: 'list_account_sites', label: 'List Account Sites' },
          { value: 'get_site', label: 'Get Site' },
          { value: 'create_site', label: 'Create Site' },
          { value: 'update_site', label: 'Update Site' },
          { value: 'delete_site', label: 'Delete Site' },
          { value: 'enable_site', label: 'Enable Site' },
          { value: 'disable_site', label: 'Disable Site' },
          { value: 'list_deploys', label: 'List Deploys' },
          { value: 'get_deploy', label: 'Get Deploy' },
          { value: 'create_deploy', label: 'Create Deploy' },
          { value: 'cancel_deploy', label: 'Cancel Deploy' },
          { value: 'restore_deploy', label: 'Restore Deploy' },
          { value: 'rollback_site', label: 'Rollback Site' },
          { value: 'lock_deploy', label: 'Lock Deploy' },
          { value: 'unlock_deploy', label: 'Unlock Deploy' },
          { value: 'delete_deploy', label: 'Delete Deploy' },
          { value: 'list_builds', label: 'List Builds' },
          { value: 'get_build', label: 'Get Build' },
          { value: 'start_build', label: 'Start Build' },
          { value: 'get_account_build_status', label: 'Get Account Build Status' },
          { value: 'list_env_vars', label: 'List Env Vars' },
          { value: 'list_site_env_vars', label: 'List Site Env Vars' },
          { value: 'get_env_var', label: 'Get Env Var' },
          { value: 'create_env_vars', label: 'Create Env Vars' },
          { value: 'update_env_var', label: 'Update Env Var' },
          { value: 'set_env_var_value', label: 'Set Env Var Value' },
          { value: 'delete_env_var', label: 'Delete Env Var' },
          { value: 'delete_env_var_value', label: 'Delete Env Var Value' },
          { value: 'list_forms', label: 'List Forms' },
          { value: 'delete_form', label: 'Delete Form' },
          { value: 'list_site_submissions', label: 'List Site Submissions' },
          { value: 'list_form_submissions', label: 'List Form Submissions' },
          { value: 'get_submission', label: 'Get Submission' },
          { value: 'delete_submission', label: 'Delete Submission' },
          { value: 'list_dns_zones', label: 'List DNS Zones' },
          { value: 'get_dns_zone', label: 'Get DNS Zone' },
          { value: 'create_dns_zone', label: 'Create DNS Zone' },
          { value: 'delete_dns_zone', label: 'Delete DNS Zone' },
          { value: 'list_dns_records', label: 'List DNS Records' },
          { value: 'get_dns_record', label: 'Get DNS Record' },
          { value: 'create_dns_record', label: 'Create DNS Record' },
          { value: 'delete_dns_record', label: 'Delete DNS Record' },
          { value: 'get_site_dns', label: 'Get Site DNS' },
          { value: 'configure_site_dns', label: 'Configure Site DNS' },
          { value: 'list_build_hooks', label: 'List Build Hooks' },
          { value: 'get_build_hook', label: 'Get Build Hook' },
          { value: 'create_build_hook', label: 'Create Build Hook' },
          { value: 'update_build_hook', label: 'Update Build Hook' },
          { value: 'delete_build_hook', label: 'Delete Build Hook' },
          { value: 'list_hooks', label: 'List Hooks' },
          { value: 'get_hook', label: 'Get Hook' },
          { value: 'create_hook', label: 'Create Hook' },
          { value: 'update_hook', label: 'Update Hook' },
          { value: 'delete_hook', label: 'Delete Hook' },
          { value: 'enable_hook', label: 'Enable Hook' },
          { value: 'list_hook_types', label: 'List Hook Types' },
          { value: 'list_deploy_keys', label: 'List Deploy Keys' },
          { value: 'get_deploy_key', label: 'Get Deploy Key' },
          { value: 'create_deploy_key', label: 'Create Deploy Key' },
          { value: 'delete_deploy_key', label: 'Delete Deploy Key' },
          { value: 'get_current_user', label: 'Get Current User' },
          { value: 'list_accounts', label: 'List Accounts' },
          { value: 'get_account', label: 'Get Account' },
          { value: 'list_account_members', label: 'List Account Members' },
          { value: 'list_audit_events', label: 'List Audit Events' },
        ]}
        tokenPlaceholder="Netlify token"
        hideManual
      >
        {siteOps && !accountSlugOp && (
          <TextField label="Site ID" field="netlifySiteId" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="from List Sites" />
        )}
        {accountSlugOp && (
          <TextField label="Account slug" field="netlifyAccountSlug" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="the team's URL name — not its ID" />
        )}
        {envOp && (
          <TextField label="Account ID (optional)" field="netlifyAccountId" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="resolved from the site when left blank" />
        )}
        {envOp && (
          <p className="-mt-1 text-[10px] leading-relaxed text-[var(--color-subtle)]">
            Environment variables are stored on the team. With a Site ID set, the variable belongs to
            that site; leave it blank and it becomes a{' '}
            <span className="text-[var(--color-muted)]">team-wide</span> variable instead — Netlify
            won't warn you.
          </p>
        )}

        {deployOp && (
          <TextField label="Deploy ID" field="netlifyDeployId" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="from List Deploys" />
        )}
        {op === 'rollback_site' && (
          <p className="-mt-1 text-[10px] leading-relaxed text-[var(--color-subtle)]">
            Rolls back to the previous deploy. Netlify chooses which one — this takes no deploy ID.
          </p>
        )}

        {envOp && (<>
          <TextField label="Variable name" field="netlifyEnvKey" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="API_URL" />
          <TextField label="Value" field="netlifyEnvValue" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="{{prev-node.output}}" />
          <SelectField label="Context" field="netlifyEnvContext" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} fallback="all"
            options={[
              { value: 'all', label: 'All contexts' },
              { value: 'production', label: 'Production' },
              { value: 'deploy-preview', label: 'Deploy previews' },
              { value: 'branch-deploy', label: 'Branch deploys' },
              { value: 'dev', label: 'Local dev' },
            ]} />
        </>)}
        {op === 'update_env_var' && (
          <p className="-mt-1 text-[10px] leading-relaxed text-[var(--color-fail)]">
            This replaces every context for the variable. Any context you don't include is removed —
            use Set Env Var Value to change just one.
          </p>
        )}

        {op === 'create_deploy' && (<>
          <AreaField label="Files manifest" field="netlifyDeployFiles" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder='{"/index.html": "<sha1 of the file>"}' />
          <p className="-mt-1 text-[10px] leading-relaxed text-[var(--color-fail)]">
            Netlify publishes exactly what this lists, so an incomplete manifest deletes the rest of
            the site. Unless you're generating SHA1s yourself, use Start Build instead.
          </p>
        </>)}
        {op === 'start_build' && (
          <TextField label="Branch (optional)" field="netlifyBranch" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="main" />
        )}
        {(op === 'create_deploy' || op === 'start_build') && (
          <p className="-mt-1 text-[10px] leading-relaxed text-[var(--color-subtle)]">
            Deploys are limited to 3 a minute and 100 a day — don't loop this over many sites.
          </p>
        )}

        {(op === 'create_site' || op === 'update_site') && (<>
          <TextField label="Name" field="netlifyName" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="my-site" />
          <TextField label="Custom domain (optional)" field="netlifyCustomDomain" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="www.example.com" />
          <AreaField label="Extra settings (optional)" field="netlifySiteConfig" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder='{"processing_settings": {"skip": true}}' />
        </>)}

        {op.includes('form') && op !== 'list_forms' && (
          <TextField label="Form ID" field="netlifyFormId" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="from List Forms" />
        )}
        {op.includes('submission') && !op.startsWith('list') && (
          <TextField label="Submission ID" field="netlifySubmissionId" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="" />
        )}

        {op.includes('dns_record') && (<>
          <TextField label="Zone ID" field="netlifyZoneId" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="from List DNS Zones" />
          {op === 'create_dns_record' && (<>
            <TextField label="Hostname" field="netlifyName" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
              placeholder="www.example.com" />
            <TextField label="Type" field="netlifyRecordType" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
              placeholder="A, CNAME, TXT, MX" />
            <TextField label="Value" field="netlifyRecordValue" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
              placeholder="" />
            <NumField label="TTL (optional)" field="netlifyTtl" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback={3600} />
          </>)}
          {op === 'delete_dns_record' && (
            <TextField label="Record ID" field="netlifyRecordId" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
              placeholder="from List DNS Records" />
          )}
        </>)}

        {op === 'create_hook' && (<>
          <TextField label="Event" field="netlifyEvent" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="deploy_succeeded" />
          <TextField label="Type" field="netlifyHookType" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="email, slack, url" />
          <AreaField label="Hook data" field="netlifyHookData" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder='{"url": "https://example.com/hook"}' />
        </>)}
        {(op === 'get_hook' || op === 'delete_hook' || op === 'update_hook') && (
          <TextField label="Hook ID" field="netlifyHookId" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="from List Hooks" />
        )}

        {op.startsWith('list') && (<>
          <NumField label="Page (optional)" field="netlifyPage" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback={1} />
          <NumField label="Per page (optional)" field="netlifyPerPage" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback={50} />
        </>)}
      </IntegrationSection>
  )
}

export function VercelConfig({ data, nodeId, updateNodeData }: ProviderConfigProps) {
  const op = data.integrationOp ?? 'list_deployments'

  // Which fields an op actually reads. Grouped rather than tested inline so the
  // JSX below stays a list of fields instead of a list of conditions.
  const needsProject = [
    'get_runtime_logs', 'get_project', 'update_project', 'promote_deployment',
    'rollback_deployment', 'list_env_vars', 'get_env_var_value', 'create_env_var',
    'update_env_var', 'delete_env_var', 'list_project_domains', 'add_project_domain',
    'verify_project_domain', 'remove_project_domain',
  ].includes(op)
  const needsDeployment = [
    'get_deployment', 'get_deployment_events', 'get_runtime_logs', 'redeploy',
    'cancel_deployment', 'delete_deployment', 'list_deployment_aliases',
    'assign_alias', 'promote_deployment', 'rollback_deployment',
  ].includes(op)
  const envOp = op.includes('env_var')
  const envWriteOp = ['create_env_var', 'update_env_var'].includes(op)
  const domainOp = ['get_domain', 'add_project_domain', 'verify_project_domain',
    'remove_project_domain'].includes(op)
  const changesProduction = ['promote_deployment', 'rollback_deployment'].includes(op)

  return (
      <IntegrationSection
        provider="vercel" label="Vercel" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
        defaultOp="list_deployments"
        ops={[
          { value: 'list_deployments', label: 'List Deployments' },
          { value: 'get_deployment', label: 'Get Deployment' },
          { value: 'get_deployment_events', label: 'Get Build Logs' },
          { value: 'get_runtime_logs', label: 'Get Runtime Logs' },
          { value: 'redeploy', label: 'Redeploy' },
          { value: 'cancel_deployment', label: 'Cancel Deployment' },
          { value: 'delete_deployment', label: 'Delete Deployment' },
          { value: 'list_deployment_aliases', label: 'List Deployment Aliases' },
          { value: 'assign_alias', label: 'Assign Alias' },
          { value: 'list_projects', label: 'List Projects' },
          { value: 'get_project', label: 'Get Project' },
          { value: 'update_project', label: 'Update Project' },
          { value: 'promote_deployment', label: 'Promote to Production' },
          { value: 'rollback_deployment', label: 'Roll Back Production' },
          { value: 'list_env_vars', label: 'List Env Vars' },
          { value: 'get_env_var_value', label: 'Get Env Var Value' },
          { value: 'create_env_var', label: 'Create Env Var' },
          { value: 'update_env_var', label: 'Update Env Var' },
          { value: 'delete_env_var', label: 'Delete Env Var' },
          { value: 'list_domains', label: 'List Domains' },
          { value: 'get_domain', label: 'Get Domain' },
          { value: 'list_project_domains', label: 'List Project Domains' },
          { value: 'add_project_domain', label: 'Add Project Domain' },
          { value: 'verify_project_domain', label: 'Verify Project Domain' },
          { value: 'remove_project_domain', label: 'Remove Project Domain' },
          { value: 'list_teams', label: 'List Teams' },
          { value: 'get_current_user', label: 'Get Current User' },
        ]}
        tokenPlaceholder="Vercel token"
        hideManual
      >
        {/* Team first, and on every op, because a missing team is the failure
            people actually hit: the request silently runs against the token
            owner's personal scope and a team project comes back 404. */}
        {op !== 'get_current_user' && (<>
          <ResourceField label="Team (optional)" provider="vercel" kind="team" field="vercelTeamId"
            clears={['vercelProjectId', 'vercelDeploymentId', 'vercelEnvVarId']}
            data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="team_… for a personal account, leave blank" />
          <p className="-mt-1 text-[10px] leading-relaxed text-[var(--color-subtle)]">
            Leave blank only for a personal account. For anything owned by a team this is
            required, and without it Vercel answers{' '}
            <span className="text-[var(--color-muted)]">404</span> as though the project did
            not exist.
          </p>
        </>)}

        {needsProject && (
          <ResourceField label="Project" provider="vercel" kind="project" field="vercelProjectId"
            parentField="vercelTeamId" optionalParent
            clears={['vercelDeploymentId', 'vercelEnvVarId']} data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="project name or ID" />
        )}
        {op === 'list_deployments' && (
          <ResourceField label="Project (optional)" provider="vercel" kind="project" field="vercelProjectId"
            parentField="vercelTeamId" optionalParent
            clears={['vercelDeploymentId', 'vercelEnvVarId']} data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="all projects when blank" />
        )}

        {/* The project comes first even for operations that never send it: a
            deployment list can only be fetched per project, so offering the
            deployment first would show an empty dropdown. get_deployment and
            friends ignore the saved project — it is here to narrow the picker. */}
        {needsDeployment && !needsProject && (
          <ResourceField label="Project" provider="vercel" kind="project" field="vercelProjectId"
            parentField="vercelTeamId" optionalParent
            clears={['vercelDeploymentId', 'vercelEnvVarId']} data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="pick one to list its deployments" />
        )}
        {needsDeployment && (
          <ResourceField label="Deployment" provider="vercel" kind="deployment" field="vercelDeploymentId"
            parentFields={['vercelTeamId', 'vercelProjectId']}
            data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="dpl_… or a deployment URL" />
        )}
        {changesProduction && (
          <p className="-mt-1 text-[10px] leading-relaxed text-[var(--color-fail)]">
            This changes what production serves, immediately. Put a Human Approval step in
            front of it unless the workflow is meant to ship unattended.
          </p>
        )}
        {op === 'redeploy' && (
          <p className="-mt-1 text-[10px] leading-relaxed text-[var(--color-subtle)]">
            Copies every setting from that deployment and forces a fresh build, so it never
            silently returns the existing one.
          </p>
        )}
        {op === 'get_deployment_events' && (<>
          <TextField label="Build ID (optional)" field="vercelBuildId" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="narrows to one build" />
          <p className="-mt-1 text-[10px] leading-relaxed text-[var(--color-subtle)]">
            Build logs, kept from the end — a failed build is mostly install noise followed by
            the error. For per-request logs use Get Runtime Logs.
          </p>
        </>)}

        {op === 'list_deployments' && (<>
          <SelectField label="Environment" field="vercelTarget" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} fallback=""
            options={[
              { value: '', label: 'Any' },
              { value: 'production', label: 'Production' },
              { value: 'preview', label: 'Preview' },
              { value: 'development', label: 'Development' },
            ]} />
          <SelectField label="State" field="vercelState" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} fallback=""
            options={[
              { value: '', label: 'Any' },
              { value: 'READY', label: 'Ready' },
              { value: 'ERROR', label: 'Error' },
              { value: 'BUILDING', label: 'Building' },
              { value: 'QUEUED', label: 'Queued' },
              { value: 'INITIALIZING', label: 'Initializing' },
              { value: 'CANCELED', label: 'Canceled' },
              { value: 'BLOCKED', label: 'Blocked' },
            ]} />
          <TextField label="Branch (optional)" field="vercelBranch" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="main" />
        </>)}

        {op === 'redeploy' && (
          <SelectField label="Environment (optional)" field="vercelTarget" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} fallback=""
            options={[
              { value: '', label: 'Same as the original' },
              { value: 'production', label: 'Production' },
              { value: 'preview', label: 'Preview' },
            ]} />
        )}

        {op === 'assign_alias' && (
          <TextField label="Alias" field="vercelAlias" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="staging.example.com" />
        )}

        {envOp && op !== 'list_env_vars' && (
          <ResourceField label="Variable" provider="vercel" kind="envvar" field="vercelEnvVarId"
            parentFields={['vercelTeamId', 'vercelProjectId']}
            data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="from List Env Vars — the ID, not the name" />
        )}
        {op === 'get_env_var_value' && (
          <p className="-mt-1 text-[10px] leading-relaxed text-[var(--color-fail)]">
            Returns the decrypted secret into the run output, where it is stored with the run.
            List Env Vars returns values encrypted and is enough for most checks.
          </p>
        )}
        {envWriteOp && (<>
          <TextField label={op === 'create_env_var' ? 'Name' : 'Name (optional)'} field="vercelEnvKey"
            data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="API_URL" />
          <TextField label={op === 'create_env_var' ? 'Value' : 'Value (optional)'} field="vercelEnvValue"
            data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{prev-node.output}}" />
          <SelectField label="Applies to" field="vercelEnvTarget" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} fallback={op === 'create_env_var' ? 'production' : ''}
            options={[
              ...(op === 'update_env_var' ? [{ value: '', label: 'Leave unchanged' }] : []),
              { value: 'production', label: 'Production' },
              { value: 'preview', label: 'Preview' },
              { value: 'development', label: 'Development' },
              { value: 'production,preview', label: 'Production + Preview' },
              { value: 'production,preview,development', label: 'All environments' },
            ]} />
          <SelectField label="Type" field="vercelEnvType" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} fallback="encrypted"
            options={[
              { value: 'encrypted', label: 'Encrypted' },
              { value: 'plain', label: 'Plain' },
              { value: 'sensitive', label: 'Sensitive (write-only)' },
            ]} />
        </>)}
        {op === 'update_env_var' && (
          <p className="-mt-1 text-[10px] leading-relaxed text-[var(--color-subtle)]">
            Only the fields you fill in are sent, so anything left blank keeps its current value.
          </p>
        )}

        {domainOp && (
          <ResourceField label="Domain" provider="vercel" kind="domain" field="vercelDomain"
            parentField="vercelTeamId" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="www.example.com" />
        )}
        {op === 'add_project_domain' && (<>
          <TextField label="Git branch (optional)" field="vercelGitBranch" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="locks the domain to one branch" />
          <TextField label="Redirect to (optional)" field="vercelRedirect" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="example.com" />
        </>)}

        {op === 'update_project' && (
          <AreaField label="Settings" field="vercelProjectConfig" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder='{"framework": "nextjs", "buildCommand": "pnpm build"}' />
        )}

        {op === 'list_projects' && (
          <TextField label="Search (optional)" field="vercelSearch" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="filter by name" />
        )}

        {(op.startsWith('list') || op === 'get_deployment_events') && (
          <NumField label="Limit" field="vercelLimit" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} fallback={op === 'get_deployment_events' ? 100 : 20} />
        )}
      </IntegrationSection>
  )
}

export function SupabaseConfig({ data, nodeId, updateNodeData }: ProviderConfigProps) {
  const op = data.integrationOp ?? 'list_projects'
  const projectOps = !['list_projects', 'create_project', 'list_regions',
    'list_organizations', 'get_organization'].includes(op)
  const isSql = op === 'run_sql' || op === 'run_sql_read_only'
  const fnOps = op.includes('function')
  return (
      <IntegrationSection
        provider="supabase" label="Supabase" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
        defaultOp="list_projects"
        ops={[
          { value: 'list_projects', label: 'List Projects' },
          { value: 'get_project', label: 'Get Project' },
          { value: 'get_project_health', label: 'Get Project Health' },
          { value: 'list_regions', label: 'List Regions' },
          { value: 'create_project', label: 'Create Project' },
          { value: 'delete_project', label: 'Delete Project' },
          { value: 'pause_project', label: 'Pause Project' },
          { value: 'restore_project', label: 'Restore Project' },
          { value: 'restart_project', label: 'Restart Project' },
          { value: 'list_api_keys', label: 'List API Keys' },
          { value: 'create_api_key', label: 'Create API Key' },
          { value: 'delete_api_key', label: 'Delete API Key' },
          { value: 'list_organizations', label: 'List Organizations' },
          { value: 'get_organization', label: 'Get Organization' },
          { value: 'list_organization_projects', label: 'List Organization Projects' },
          { value: 'list_organization_members', label: 'List Organization Members' },
          { value: 'run_sql_read_only', label: 'Run SQL Read Only' },
          { value: 'run_sql', label: 'Run SQL' },
          { value: 'get_database_metadata', label: 'Get Database Metadata' },
          { value: 'list_migrations', label: 'List Migrations' },
          { value: 'apply_migration', label: 'Apply Migration' },
          { value: 'rollback_migrations', label: 'Rollback Migrations' },
          { value: 'list_backups', label: 'List Backups' },
          { value: 'restore_pitr', label: 'Restore PITR' },
          { value: 'list_functions', label: 'List Functions' },
          { value: 'get_function', label: 'Get Function' },
          { value: 'get_function_body', label: 'Get Function Body' },
          { value: 'create_function', label: 'Create Function' },
          { value: 'update_function', label: 'Update Function' },
          { value: 'deploy_function', label: 'Deploy Function' },
          { value: 'delete_function', label: 'Delete Function' },
          { value: 'list_secrets', label: 'List Secrets' },
          { value: 'create_secrets', label: 'Create Secrets' },
          { value: 'delete_secrets', label: 'Delete Secrets' },
          { value: 'get_auth_config', label: 'Get Auth Config' },
          { value: 'update_auth_config', label: 'Update Auth Config' },
          { value: 'list_storage_buckets', label: 'List Storage Buckets' },
          { value: 'list_branches', label: 'List Branches' },
          { value: 'get_branch', label: 'Get Branch' },
          { value: 'create_branch', label: 'Create Branch' },
          { value: 'delete_branch', label: 'Delete Branch' },
          { value: 'merge_branch', label: 'Merge Branch' },
          { value: 'reset_branch', label: 'Reset Branch' },
          { value: 'get_custom_hostname', label: 'Get Custom Hostname' },
          { value: 'set_custom_hostname', label: 'Set Custom Hostname' },
          { value: 'verify_custom_hostname', label: 'Verify Custom Hostname' },
          { value: 'activate_custom_hostname', label: 'Activate Custom Hostname' },
          { value: 'delete_custom_hostname', label: 'Delete Custom Hostname' },
          { value: 'get_network_restrictions', label: 'Get Network Restrictions' },
          { value: 'apply_network_restrictions', label: 'Apply Network Restrictions' },
          { value: 'list_network_bans', label: 'List Network Bans' },
          { value: 'delete_network_bans', label: 'Delete Network Bans' },
          { value: 'get_postgrest_config', label: 'Get PostgREST Config' },
          { value: 'update_postgrest_config', label: 'Update PostgREST Config' },
          { value: 'generate_types', label: 'Generate Types' },
          { value: 'list_snippets', label: 'List Snippets' },
          { value: 'get_snippet', label: 'Get Snippet' },
        ]}
        tokenPlaceholder="sbp_..."
        hideManual
      >
        <p className="-mt-1 text-[10px] leading-relaxed text-[var(--color-subtle)]">
          This is Supabase's management API — projects, functions, config. Reading rows from your
          tables isn't part of it; that lives on your project's own PostgREST host.
        </p>

        {projectOps && (
          <ResourceField label="Project" provider="supabase" kind="project" field="supabaseProjectRef"
            data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="the 20-character project ref" />
        )}

        {isSql && (<>
          <AreaField label="SQL" field="supabaseSql" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="select id, email from auth.users where created_at > $1" />
          <TextField label="Parameters (optional)" field="supabaseSqlParams" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder='["2026-08-01"] — bound to $1, $2 …' />
          <p className="-mt-1 text-[10px] leading-relaxed text-[var(--color-subtle)]">
            Put values in parameters rather than building the statement with{' '}
            <span className="font-mono">{'{{'}templates{'}}'}</span> — text substituted straight into SQL
            is injectable.
          </p>
        </>)}
        {op === 'run_sql' && (<>
          <SelectField label="Allow writes" field="supabaseAllowWrite" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} fallback="false"
            options={[
              { value: 'false', label: 'No — block this operation' },
              { value: 'true', label: 'Yes — I intend to modify the database' },
            ]} />
          <p className="-mt-1 text-[10px] leading-relaxed text-[var(--color-fail)]">
            This runs as the database owner on the live project. DROP, DELETE and ALTER all succeed, and
            nothing is recorded in migration history. Use Run SQL Read-Only unless you mean to write.
          </p>
        </>)}

        {op === 'create_project' && (<>
          <TextField label="Name" field="supabaseName" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="my-project" />
          <TextField label="Organization slug" field="supabaseOrgSlug" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="from List Organizations" />
          <TextField label="Database password" field="supabaseDbPass" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="a strong password — you cannot retrieve it later" />
          <TextField label="Region (optional)" field="supabaseRegion" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="eu-west-1 — see List Regions" />
        </>)}
        {op === 'delete_project' && (
          <p className="-mt-1 text-[10px] leading-relaxed text-[var(--color-fail)]">
            Deleting a project destroys its database and cannot be undone.
          </p>
        )}

        {fnOps && op !== 'list_functions' && (
          <TextField label="Function slug" field="supabaseFunctionSlug" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="from List Functions" />
        )}
        {(op === 'create_function' || op === 'update_function' || op === 'deploy_function') && (<>
          <TextField label="Entrypoint (optional)" field="supabaseEntrypoint" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="index.ts" />
          <AreaField label="Source" field="supabaseFunctionBody" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="{{llm-1.output}}" />
        </>)}

        {op.includes('secret') && op !== 'list_secrets' && (
          <AreaField label="Secrets" field="supabaseSecrets" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder='{"STRIPE_KEY": "sk_live_…"} — or a JSON array of {name, value}' />
        )}

        {op.includes('api_key') && op !== 'list_api_keys' && (
          <TextField label="API key ID" field="supabaseApiKeyId" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="from List API Keys" />
        )}
        {op === 'get_organization' && (
          <TextField label="Organization slug" field="supabaseOrgSlug" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="from List Organizations" />
        )}
        {op.includes('branch') && op !== 'list_branches' && (
          <TextField label="Branch" field="supabaseBranchRef" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="branch ref or name" />
        )}
        {op === 'update_auth_config' && (
          <AreaField label="Auth config" field="supabaseAuthConfig" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder='{"site_url": "https://example.com"}' />
        )}
      </IntegrationSection>
  )
}

export function GumroadConfig({ data, nodeId, updateNodeData }: ProviderConfigProps) {
  const op = data.integrationOp ?? 'list_sales'
  const productScoped = op.includes('product') || op.includes('variant') || op.includes('offer_code') ||
    op.includes('custom_field') || op === 'list_subscribers' || op.includes('license')
  const money = ['create_product', 'update_product'].includes(op)
  const saleOp = ['get_sale', 'mark_as_shipped', 'refund_sale'].includes(op)
  const licenceOp = op.includes('license')
  return (
      <IntegrationSection
        provider="gumroad" label="Gumroad" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
        defaultOp="list_sales"
        ops={[
          { value: 'get_user', label: 'Get User' },
          { value: 'list_products', label: 'List Products' },
          { value: 'get_product', label: 'Get Product' },
          { value: 'create_product', label: 'Create Product' },
          { value: 'update_product', label: 'Update Product' },
          { value: 'delete_product', label: 'Delete Product' },
          { value: 'enable_product', label: 'Enable Product' },
          { value: 'disable_product', label: 'Disable Product' },
          { value: 'list_variant_categories', label: 'List Variant Categories' },
          { value: 'create_variant_category', label: 'Create Variant Category' },
          { value: 'list_variants', label: 'List Variants' },
          { value: 'create_variant', label: 'Create Variant' },
          { value: 'list_offer_codes', label: 'List Offer Codes' },
          { value: 'get_offer_code', label: 'Get Offer Code' },
          { value: 'create_offer_code', label: 'Create Offer Code' },
          { value: 'update_offer_code', label: 'Update Offer Code' },
          { value: 'delete_offer_code', label: 'Delete Offer Code' },
          { value: 'list_custom_fields', label: 'List Custom Fields' },
          { value: 'create_custom_field', label: 'Create Custom Field' },
          { value: 'delete_custom_field', label: 'Delete Custom Field' },
          { value: 'list_sales', label: 'List Sales' },
          { value: 'get_sale', label: 'Get Sale' },
          { value: 'mark_as_shipped', label: 'Mark As Shipped' },
          { value: 'refund_sale', label: 'Refund Sale' },
          { value: 'list_subscribers', label: 'List Subscribers' },
          { value: 'get_subscriber', label: 'Get Subscriber' },
          { value: 'verify_license', label: 'Verify License' },
          { value: 'enable_license', label: 'Enable License' },
          { value: 'list_webhooks', label: 'List Webhooks' },
          { value: 'create_webhook', label: 'Create Webhook' },
          { value: 'delete_webhook', label: 'Delete Webhook' },
          { value: 'disable_license', label: 'Disable License' },
          { value: 'decrement_license_uses', label: 'Decrement License Uses' },
        ]}
        tokenPlaceholder="Gumroad token"
        hideManual
      >
        {productScoped && (
          <TextField label="Product ID" field="gumroadProductId" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="from List Products" />
        )}
        {op === 'list_sales' && (
          <TextField label="Product ID (optional)" field="gumroadProductId" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="narrow to one product" />
        )}

        {money && (<>
          <TextField label={op === 'update_product' ? 'Name (optional)' : 'Name'} field="gumroadName"
            data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="My course" />
          <AreaField label="Description (optional)" field="gumroadDescription" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="{{llm-1.output}}" />
          <TextField label={op === 'update_product' ? 'Price in cents (optional)' : 'Price in cents'}
            field="gumroadPrice" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="1000 = $10.00" />
          <p className="-mt-1 text-[10px] leading-relaxed text-[var(--color-subtle)]">
            Prices are in <span className="text-[var(--color-muted)]">cents</span>. Entering 10 sells
            this for ten cents, not ten dollars.
          </p>
        </>)}
        {op === 'create_product' && (<>
          <TextField label="File URL (optional)" field="gumroadUrl" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="https://…" />
          <TextField label="Custom permalink (optional)" field="gumroadCustomPermalink" data={data}
            nodeId={nodeId} updateNodeData={updateNodeData} placeholder="my-course" />
        </>)}

        {saleOp && (
          <TextField label="Sale ID" field="gumroadSaleId" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="from List Sales" />
        )}
        {op === 'refund_sale' && (<>
          <TextField label="Amount in cents (optional)" field="gumroadAmount" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="leave blank to refund in full" />
          <p className="-mt-1 text-[10px] leading-relaxed text-[var(--color-fail)]">
            Refunds move real money and cannot be undone from here.
          </p>
        </>)}
        {op === 'mark_as_shipped' && (
          <TextField label="Tracking URL (optional)" field="gumroadTrackingUrl" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="https://…" />
        )}
        {op === 'list_sales' && (<>
          <TextField label="After (optional)" field="gumroadAfter" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="2026-08-01" />
          <TextField label="Before (optional)" field="gumroadBefore" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="2026-08-31" />
          <TextField label="Buyer email (optional)" field="gumroadEmail" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="jane@acme.com" />
          <TextField label="Page key (optional)" field="gumroadPageKey" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="from a previous run's response" />
        </>)}

        {licenceOp && (<>
          <TextField label="Licence key" field="gumroadLicenseKey" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="{{prev-node.output}}" />
          {op === 'verify_license' && (<>
            <SelectField label="Count this as a use" field="gumroadIncrementUses" data={data} nodeId={nodeId}
              updateNodeData={updateNodeData} fallback="false"
              options={[
                { value: 'false', label: 'No — just check it' },
                { value: 'true', label: 'Yes — this is a real activation' },
              ]} />
          </>)}
        </>)}

        {op === 'create_variant_category' && (
          <TextField label="Title" field="gumroadTitle" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="Tier" />
        )}
        {op === 'create_variant' && (<>
          <TextField label="Category ID" field="gumroadCategoryId" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="from List Variant Categories" />
          <TextField label="Name" field="gumroadName" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="Pro" />
          <TextField label="Surcharge in cents (optional)" field="gumroadPriceDifference" data={data}
            nodeId={nodeId} updateNodeData={updateNodeData} placeholder="500 = $5.00 more" />
        </>)}

        {op === 'create_offer_code' && (<>
          <TextField label="Code" field="gumroadCode" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="LAUNCH20" />
          <TextField label="Amount off" field="gumroadAmountOff" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="cents, or a percentage if you pick percent below" />
          <SelectField label="Discount type" field="gumroadOfferType" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} fallback="cents"
            options={[
              { value: 'cents', label: 'Fixed amount off (cents)' },
              { value: 'percent', label: 'Percentage off' },
            ]} />
        </>)}
        {(op === 'create_offer_code' || op === 'update_offer_code') && (
          <TextField label="Max uses (optional)" field="gumroadMaxPurchases" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="100" />
        )}
        {['get_offer_code', 'update_offer_code', 'delete_offer_code'].includes(op) && (
          <TextField label="Offer code ID" field="gumroadOfferCodeId" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="from List Offer Codes" />
        )}

        {op === 'create_custom_field' && (<>
          <TextField label="Field name" field="gumroadName" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="Company" />
          <SelectField label="Required" field="gumroadRequired" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} fallback="false"
            options={[{ value: 'false', label: 'Optional' }, { value: 'true', label: 'Required' }]} />
        </>)}
        {op === 'delete_custom_field' && (
          <TextField label="Field name" field="gumroadName" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="custom fields are addressed by name, not an ID" />
        )}

        {op === 'get_subscriber' && (
          <TextField label="Subscriber ID" field="gumroadSubscriberId" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="from List Subscribers" />
        )}
        {(op === 'list_subscribers' || op === 'list_sales') && op === 'list_subscribers' && (
          <TextField label="Email (optional)" field="gumroadEmail" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="jane@acme.com" />
        )}

        {(op === 'create_webhook' || op === 'list_webhooks') && (
          <SelectField label="Resource" field="gumroadResourceName" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} fallback="sale"
            options={[
              { value: 'sale', label: 'Sale' },
              { value: 'refund', label: 'Refund' },
              { value: 'dispute', label: 'Dispute' },
              { value: 'cancellation', label: 'Cancellation' },
              { value: 'subscription_updated', label: 'Subscription updated' },
            ]} />
        )}
        {op === 'create_webhook' && (
          <TextField label="Post URL" field="gumroadUrl" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="https://example.com/hooks/gumroad" />
        )}
        {op === 'delete_webhook' && (
          <TextField label="Webhook ID" field="gumroadWebhookId" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="from List Webhooks" />
        )}
      </IntegrationSection>
  )
}

export function GoogleSearchConsoleConfig({ data, nodeId, updateNodeData }: ProviderConfigProps) {
  const op = data.integrationOp ?? 'query_search_analytics'
  const sitemapOp = op.includes('sitemap')
  return (
      <IntegrationSection
        provider="googlesearchconsole" label="Search Console" data={data} nodeId={nodeId}
        updateNodeData={updateNodeData} defaultOp="query_search_analytics"
        ops={[
          { value: 'list_sites', label: 'List Sites' },
          { value: 'get_site', label: 'Get Site' },
          { value: 'add_site', label: 'Add Site' },
          { value: 'delete_site', label: 'Delete Site' },
          { value: 'list_sitemaps', label: 'List Sitemaps' },
          { value: 'get_sitemap', label: 'Get Sitemap' },
          { value: 'submit_sitemap', label: 'Submit Sitemap' },
          { value: 'delete_sitemap', label: 'Delete Sitemap' },
          { value: 'query_search_analytics', label: 'Query Search Analytics' },
          { value: 'inspect_url', label: 'Inspect URL' },
        ]}
        tokenPlaceholder="Google access token"
        hideManual
      >
        {op !== 'list_sites' && (
          <ResourceField label="Property" provider="googlesearchconsole" kind="property"
            field="gscSiteUrl" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="https://example.com/ or sc-domain:example.com" />
        )}

        {op === 'query_search_analytics' && (<>
          <TextField label="Start date" field="gscStartDate" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="2026-07-01" />
          <TextField label="End date" field="gscEndDate" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="2026-07-31" />
          <p className="-mt-1 text-[10px] leading-relaxed text-[var(--color-subtle)]">
            Dates are Pacific time and the data lags about two days, so a range ending yesterday will
            usually come back empty.
          </p>
          <TextField label="Group by" field="gscDimensions" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="query, page, country, device, date" />
          <p className="-mt-1 text-[10px] leading-relaxed text-[var(--color-subtle)]">
            Leave this blank and you get one totals row rather than a breakdown.
          </p>
          <SelectField label="Search type" field="gscSearchType" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} fallback=""
            options={[
              { value: '', label: 'All types' },
              { value: 'web', label: 'Web' },
              { value: 'image', label: 'Image' },
              { value: 'video', label: 'Video' },
              { value: 'news', label: 'News' },
              { value: 'discover', label: 'Discover' },
            ]} />
          <AreaField label="Filters (optional)" field="gscFilterExpression" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder={'query contains pricing\ncountry equals gbr'} />
          <SelectField label="Data freshness" field="gscDataState" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} fallback=""
            options={[
              { value: '', label: 'Final data only' },
              { value: 'all', label: 'Include fresh but incomplete data' },
            ]} />
          <NumField label="Rows" field="gscRowLimit" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback={100} />
          <NumField label="Start row (optional)" field="gscStartRow" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback={0} />
        </>)}

        {sitemapOp && op !== 'list_sitemaps' && (
          <TextField label="Sitemap URL" field="gscFeedPath" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="https://example.com/sitemap.xml" />
        )}

        {op === 'inspect_url' && (<>
          <TextField label="Page to inspect" field="gscInspectionUrl" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="https://example.com/pricing" />
          <TextField label="Language (optional)" field="gscLanguageCode" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="en-GB" />
        </>)}

        {op === 'add_site' && (
          <p className="-mt-1 text-[10px] leading-relaxed text-[var(--color-subtle)]">
            Adding a property doesn't verify it. Until it's verified in Search Console it returns no data.
          </p>
        )}
      </IntegrationSection>
  )
}

export function GoogleContactsConfig({ data, nodeId, updateNodeData }: ProviderConfigProps) {
  const op = data.integrationOp ?? 'list_contacts'
  const needsPerson = ['get_contact', 'update_contact', 'delete_contact', 'batch_delete_contacts',
    'copy_other_contact'].includes(op)
  const writesPerson = op === 'create_contact' || op === 'update_contact'
  const groupOp = op.includes('group')
  const searches = op === 'search_contacts' || op === 'search_other_contacts'
  return (
      <IntegrationSection
        provider="googlecontacts" label="Google Contacts" data={data} nodeId={nodeId}
        updateNodeData={updateNodeData} defaultOp="list_contacts"
        ops={[
          { value: 'get_my_profile', label: 'Get My Profile' },
          { value: 'list_contacts', label: 'List Contacts' },
          { value: 'get_contact', label: 'Get Contact' },
          { value: 'search_contacts', label: 'Search Contacts' },
          { value: 'list_other_contacts', label: 'List Other Contacts' },
          { value: 'search_other_contacts', label: 'Search Other Contacts' },
          { value: 'create_contact', label: 'Create Contact' },
          { value: 'update_contact', label: 'Update Contact' },
          { value: 'delete_contact', label: 'Delete Contact' },
          { value: 'batch_delete_contacts', label: 'Batch Delete Contacts' },
          { value: 'copy_other_contact', label: 'Copy Other Contact' },
          { value: 'list_contact_groups', label: 'List Contact Groups' },
          { value: 'get_contact_group', label: 'Get Contact Group' },
          { value: 'create_contact_group', label: 'Create Contact Group' },
          { value: 'update_contact_group', label: 'Update Contact Group' },
          { value: 'delete_contact_group', label: 'Delete Contact Group' },
          { value: 'modify_group_members', label: 'Modify Group Members' },
        ]}
        tokenPlaceholder="Google access token"
        hideManual
      >
        {needsPerson && (
          <TextField label={op === 'batch_delete_contacts' ? 'Contacts' : 'Contact'}
            field="contactsResourceName" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder={op === 'batch_delete_contacts' ? 'people/c1, people/c2' : 'people/c123'} />
        )}

        {writesPerson && (<>
          <TextField label="First name" field="contactsGivenName" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="Jane" />
          <TextField label="Last name" field="contactsFamilyName" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="Doe" />
          <TextField label="Email" field="contactsEmail" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="jane@acme.com — comma-separated for several" />
          <TextField label="Phone" field="contactsPhone" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="+353…" />
          <TextField label="Company (optional)" field="contactsOrganization" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="Acme" />
          <TextField label="Job title (optional)" field="contactsJobTitle" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="Head of Ops" />
          <TextField label="Address (optional)" field="contactsAddress" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="" />
          <AreaField label="Notes (optional)" field="contactsNotes" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="{{llm-1.output}}" />
        </>)}
        {op === 'update_contact' && (
          <p className="-mt-1 text-[10px] leading-relaxed text-[var(--color-subtle)]">
            Only the fields you fill in are changed; anything left blank is untouched. If someone else
            edited this contact since, Google rejects the write rather than overwriting them.
          </p>
        )}

        {searches && (
          <TextField label="Query" field="contactsQuery" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="jane" />
        )}
        {op === 'search_contacts' && (
          <p className="-mt-1 text-[10px] leading-relaxed text-[var(--color-subtle)]">
            A contact created moments ago may not be searchable yet — Google indexes it asynchronously.
          </p>
        )}

        {groupOp && op !== 'list_contact_groups' && op !== 'create_contact_group' && (
          <TextField label="Group" field="contactsGroupId" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="contactGroups/… from List Contact Groups" />
        )}
        {(op === 'create_contact_group' || op === 'update_contact_group') && (
          <TextField label="Group name" field="contactsGroupName" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="Customers" />
        )}
        {op === 'modify_group_members' && (<>
          <TextField label="Add contacts" field="contactsAddMembers" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="people/c1, people/c2" />
          <TextField label="Remove contacts" field="contactsRemoveMembers" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="people/c3" />
        </>)}

        {['list_contacts', 'get_contact', 'get_my_profile'].includes(op) && (
          <TextField label="Fields (optional)" field="contactsFields" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="names,emailAddresses,phoneNumbers — a sensible default applies" />
        )}
        {op === 'list_contacts' && (<>
          <SelectField label="Sort by" field="contactsSortOrder" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} fallback=""
            options={[
              { value: '', label: "Google's default order" },
              { value: 'LAST_MODIFIED_DESCENDING', label: 'Recently changed first' },
              { value: 'FIRST_NAME_ASCENDING', label: 'First name A–Z' },
              { value: 'LAST_NAME_ASCENDING', label: 'Last name A–Z' },
            ]} />
          <TextField label="Page token (optional)" field="contactsPageToken" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="from a previous run" />
        </>)}
        {op.startsWith('list') || searches ? (
          <NumField label="Limit" field="contactsLimit" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback={50} />
        ) : null}
      </IntegrationSection>
  )
}

export function HubSpotConfig({ data, nodeId, updateNodeData }: ProviderConfigProps) {
  const op = data.integrationOp ?? 'search_objects'
  const needsId = ['get_object', 'update_object', 'delete_object', 'list_associations',
    'associate_objects', 'disassociate_objects', 'add_to_list', 'remove_from_list'].includes(op)
  const writesProps = op === 'create_object' || op === 'update_object'
  const isBatch = op.startsWith('batch_')
  const assoc = op.includes('associat')
  const listOp = op.includes('list') && op.includes('_list')
  return (
      <IntegrationSection
        provider="hubspot" label="HubSpot" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
        defaultOp="search_objects"
        ops={[
          { value: 'list_objects', label: 'List Objects' },
          { value: 'get_object', label: 'Get Object' },
          { value: 'search_objects', label: 'Search Objects' },
          { value: 'create_object', label: 'Create Object' },
          { value: 'update_object', label: 'Update Object' },
          { value: 'delete_object', label: 'Delete Object' },
          { value: 'batch_create_objects', label: 'Batch Create Objects' },
          { value: 'list_associations', label: 'List Associations' },
          { value: 'associate_objects', label: 'Associate Objects' },
          { value: 'disassociate_objects', label: 'Disassociate Objects' },
          { value: 'list_properties', label: 'List Properties' },
          { value: 'get_property', label: 'Get Property' },
          { value: 'create_property', label: 'Create Property' },
          { value: 'list_pipelines', label: 'List Pipelines' },
          { value: 'list_owners', label: 'List Owners' },
          { value: 'search_lists', label: 'Search Lists' },
          { value: 'get_list', label: 'Get List' },
          { value: 'list_memberships', label: 'List Memberships' },
          { value: 'add_to_list', label: 'Add To List' },
          { value: 'batch_update_objects', label: 'Batch Update Objects' },
          { value: 'batch_read_objects', label: 'Batch Read Objects' },
          { value: 'batch_archive_objects', label: 'Batch Archive Objects' },
          { value: 'remove_from_list', label: 'Remove From List' },
        ]}
        tokenPlaceholder="HubSpot token"
        hideManual
      >
        {!['list_owners', 'search_lists', 'get_list', 'list_memberships', 'add_to_list',
           'remove_from_list'].includes(op) && (
          <SelectField label="Object type" field="hubspotObjectType" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} fallback="contacts"
            options={[
              { value: 'contacts', label: 'Contacts' },
              { value: 'companies', label: 'Companies' },
              { value: 'deals', label: 'Deals' },
              { value: 'tickets', label: 'Tickets' },
              { value: 'line_items', label: 'Line items' },
              { value: 'products', label: 'Products' },
              { value: 'quotes', label: 'Quotes' },
              { value: 'notes', label: 'Notes' },
              { value: 'tasks', label: 'Tasks' },
              { value: 'calls', label: 'Calls' },
              { value: 'emails', label: 'Emails' },
              { value: 'meetings', label: 'Meetings' },
            ]} />
        )}

        {needsId && (
          <TextField label={op === 'add_to_list' || op === 'remove_from_list' ? 'Record IDs' : 'Record ID'}
            field="hubspotObjectId" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder={op === 'add_to_list' ? '123, 456' : '{{prev-node.output}}'} />
        )}
        {(op === 'get_object' || op === 'update_object') && (
          <TextField label="Look up by (optional)" field="hubspotIdProperty" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="email — to use an address instead of an ID" />
        )}

        {writesProps && (<>
          <AreaField label="Properties" field="hubspotPropertyValues" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder={'{"email": "jane@acme.com", "firstname": "Jane"}'} />
          <p className="-mt-1 text-[10px] leading-relaxed text-[var(--color-subtle)]">
            Keys are HubSpot's internal names — <span className="font-mono">firstname</span>, not "First
            Name". Run List Properties to see them.
          </p>
        </>)}
        {op === 'create_object' && (
          <AreaField label="Associations (optional)" field="hubspotAssociations" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="JSON array, as HubSpot documents them" />
        )}

        {op === 'search_objects' && (<>
          <TextField label="Search text (optional)" field="hubspotQuery" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="acme" />
          <AreaField label="Filters (optional)" field="hubspotFilters" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData}
            placeholder={'[{"filters":[{"propertyName":"email","operator":"EQ","value":"jane@acme.com"}]}]'} />
          <TextField label="Sort by (optional)" field="hubspotSortProperty" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="createdate" />
          <SelectField label="Direction" field="hubspotSortDirection" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} fallback="desc"
            options={[{ value: 'desc', label: 'Newest first' }, { value: 'asc', label: 'Oldest first' }]} />
        </>)}

        {['list_objects', 'get_object', 'search_objects', 'batch_read_objects'].includes(op) && (<>
          <TextField label="Properties to return" field="hubspotProperties" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="email, firstname, lastname, company" />
          <p className="-mt-1 text-[10px] leading-relaxed text-[var(--color-subtle)]">
            HubSpot returns only a small default set. Anything you don't name here comes back missing
            rather than as an error.
          </p>
        </>)}

        {isBatch && (<>
          <AreaField label="Inputs" field="hubspotBatchInputs" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData}
            placeholder={op === 'batch_create_objects'
              ? '[{"properties": {"email": "a@b.com"}}]'
              : '[{"id": "123"}]'} />
          <p className="-mt-1 text-[10px] leading-relaxed text-[var(--color-subtle)]">
            Up to 100 records per request.
          </p>
        </>)}

        {assoc && (<>
          <TextField label="Associate with type" field="hubspotToObjectType" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="companies" />
          {op !== 'list_associations' && (
            <TextField label="Associate with ID" field="hubspotToObjectId" data={data} nodeId={nodeId}
              updateNodeData={updateNodeData} placeholder="" />
          )}
        </>)}

        {(op === 'get_property' || op === 'create_property') && (
          <TextField label="Property name" field="hubspotPropertyName" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="internal name, e.g. lifecyclestage" />
        )}
        {op === 'create_property' && (<>
          <TextField label="Label" field="hubspotLabel" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="Lifecycle stage" />
          <TextField label="Type" field="hubspotPropertyType" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="string, number, date, enumeration, bool" />
          <TextField label="Field type" field="hubspotFieldType" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="text, textarea, select, checkbox, number" />
          <TextField label="Group (optional)" field="hubspotGroupName" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="contactinformation" />
        </>)}

        {(listOp || ['get_list', 'list_memberships', 'add_to_list', 'remove_from_list'].includes(op)) && (
          <TextField label="List ID" field="hubspotListId" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="from Search Lists" />
        )}
        {(op === 'add_to_list' || op === 'remove_from_list') && (
          <p className="-mt-1 text-[10px] leading-relaxed text-[var(--color-subtle)]">
            Static lists only — HubSpot computes membership of an active list itself and rejects manual
            changes.
          </p>
        )}
        {op === 'search_lists' && (
          <TextField label="Name contains (optional)" field="hubspotQuery" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="newsletter" />
        )}

        {op === 'list_objects' && (<>
          <TextField label="After (optional)" field="hubspotAfter" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="paging cursor from a previous run" />
          <SelectField label="Archived" field="hubspotArchived" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} fallback="false"
            options={[{ value: 'false', label: 'Active records' }, { value: 'true', label: 'Archived records' }]} />
        </>)}
        {op === 'delete_object' && (
          <p className="-mt-1 text-[10px] leading-relaxed text-[var(--color-subtle)]">
            HubSpot archives rather than destroys, so this can be restored in HubSpot afterwards.
          </p>
        )}

        {['list_objects', 'search_objects', 'list_owners', 'search_lists', 'list_memberships'].includes(op) && (
          <NumField label="Limit" field="hubspotLimit" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback={25} />
        )}
      </IntegrationSection>
  )
}

export function FrontConfig({ data, nodeId, updateNodeData }: ProviderConfigProps) {
  const op = data.integrationOp ?? 'list_conversations'
  const needsConv = ['get_conversation', 'update_conversation', 'assign_conversation',
    'list_conversation_messages', 'reply_to_conversation', 'create_draft', 'add_comment',
    'list_comments', 'add_tags', 'remove_tags', 'link_conversation'].includes(op)
  const needsContact = ['get_contact', 'update_contact', 'delete_contact', 'add_contact_handle'].includes(op)
  const writesBody = ['send_message', 'reply_to_conversation', 'create_draft', 'add_comment'].includes(op)
  return (
      <IntegrationSection
        provider="front" label="Front" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
        defaultOp="list_conversations"
        ops={[
          { value: 'list_conversations', label: 'List Conversations' },
          { value: 'search_conversations', label: 'Search Conversations' },
          { value: 'get_conversation', label: 'Get Conversation' },
          { value: 'update_conversation', label: 'Update Conversation' },
          { value: 'assign_conversation', label: 'Assign Conversation' },
          { value: 'list_conversation_messages', label: 'List Conversation Messages' },
          { value: 'send_message', label: 'Send Message' },
          { value: 'reply_to_conversation', label: 'Reply To Conversation' },
          { value: 'create_draft', label: 'Create Draft' },
          { value: 'add_comment', label: 'Add Comment' },
          { value: 'list_comments', label: 'List Comments' },
          { value: 'list_tags', label: 'List Tags' },
          { value: 'add_tags', label: 'Add Tags' },
          { value: 'remove_tags', label: 'Remove Tags' },
          { value: 'create_tag', label: 'Create Tag' },
          { value: 'list_contacts', label: 'List Contacts' },
          { value: 'get_contact', label: 'Get Contact' },
          { value: 'create_contact', label: 'Create Contact' },
          { value: 'update_contact', label: 'Update Contact' },
          { value: 'delete_contact', label: 'Delete Contact' },
          { value: 'add_contact_handle', label: 'Add Contact Handle' },
          { value: 'list_inboxes', label: 'List Inboxes' },
          { value: 'list_channels', label: 'List Channels' },
          { value: 'list_teammates', label: 'List Teammates' },
          { value: 'get_teammate', label: 'Get Teammate' },
          { value: 'list_teams', label: 'List Teams' },
          { value: 'list_accounts', label: 'List Accounts' },
          { value: 'list_events', label: 'List Events' },
          { value: 'list_links', label: 'List Links' },
          { value: 'create_link', label: 'Create Link' },
          { value: 'link_conversation', label: 'Link Conversation' },
        ]}
        tokenPlaceholder="Front token"
        hideManual
      >
        {needsConv && (
          <TextField label="Conversation ID" field="frontConversationId" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="cnv_… from List Conversations" />
        )}

        {op === 'add_comment' && (
          <p className="-mt-1 text-[10px] leading-relaxed text-[var(--color-fail)]">
            A comment is internal — only teammates see it. To actually answer the customer, use Reply to
            Conversation instead.
          </p>
        )}
        {op === 'reply_to_conversation' && (
          <p className="-mt-1 text-[10px] leading-relaxed text-[var(--color-subtle)]">
            This is delivered to the customer. For an internal note, use Add Comment.
          </p>
        )}

        {op === 'send_message' && (<>
          <TextField label="Channel ID" field="frontChannelId" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="cha_… from List Channels" />
          <TextField label="To" field="frontTo" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="jane@acme.com — comma-separated" />
          <TextField label="Subject" field="frontSubject" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="{{llm-1.output}}" />
          <TextField label="Cc (optional)" field="frontCc" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="" />
          <TextField label="Bcc (optional)" field="frontBcc" data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="" />
        </>)}
        {writesBody && (
          <AreaField label={op === 'add_comment' ? 'Comment' : 'Body'} field="frontBody"
            data={data} nodeId={nodeId} updateNodeData={updateNodeData} placeholder="{{llm-1.output}}" />
        )}
        {writesBody && (
          <TextField label={op === 'create_draft' ? 'Author (teammate ID)' : 'Send as (optional)'}
            field="frontAuthorId" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="tea_… from List Teammates" />
        )}

        {op === 'update_conversation' && (<>
          <SelectField label="Status" field="frontStatus" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} fallback=""
            options={[
              { value: '', label: 'Leave unchanged' },
              { value: 'open', label: 'Open' },
              { value: 'archived', label: 'Archived' },
              { value: 'spam', label: 'Spam' },
              { value: 'deleted', label: 'Deleted' },
            ]} />
          <TextField label="Move to inbox (optional)" field="frontInboxId" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="inb_…" />
        </>)}
        {(op === 'update_conversation' || op === 'assign_conversation') && (
          <TextField label="Assignee (optional)" field="frontAssigneeId" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="tea_… — leave blank to unassign" />
        )}

        {(op === 'add_tags' || op === 'remove_tags') && (
          <TextField label="Tag IDs" field="frontTagId" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="tag_… — comma-separated" />
        )}
        {op === 'create_tag' && (
          <TextField label="Tag name" field="frontName" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="Escalated" />
        )}

        {(op === 'list_conversations' || op === 'search_conversations' || op === 'list_events') && (
          <TextField label={op === 'list_events' ? 'Event types (optional)' : 'Search query'}
            field="frontQuery" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder={op === 'list_events' ? 'assign, archive' : 'is:open tag:urgent'} />
        )}
        {op === 'list_conversations' && (<>
          <TextField label="Inbox (optional)" field="frontInboxId" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="inb_… — scopes the listing" />
          <TextField label="Tag (optional)" field="frontTagId" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="tag_… — scopes the listing" />
        </>)}

        {needsContact && (
          <TextField label="Contact ID" field="frontContactId" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="crd_… from List Contacts" />
        )}
        {(op === 'create_contact' || op === 'update_contact') && (<>
          <TextField label="Name" field="frontName" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="Jane Doe" />
          <TextField label="Description (optional)" field="frontDescription" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="" />
        </>)}
        {(op === 'create_contact' || op === 'add_contact_handle') && (<>
          <TextField label="Handle" field="frontHandle" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="jane@acme.com" />
          <SelectField label="Handle type" field="frontHandleSource" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} fallback="email"
            options={[
              { value: 'email', label: 'Email' },
              { value: 'phone', label: 'Phone' },
              { value: 'twitter', label: 'Twitter' },
              { value: 'intercom', label: 'Intercom' },
              { value: 'custom', label: 'Custom' },
            ]} />
        </>)}

        {op === 'get_teammate' && (
          <TextField label="Teammate ID" field="frontTeammateId" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="tea_…" />
        )}
        {op === 'create_link' && (<>
          <TextField label="URL" field="frontUrl" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="https://example.com/ticket/42" />
          <TextField label="Name (optional)" field="frontName" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="Ticket 42" />
        </>)}
        {op === 'link_conversation' && (
          <TextField label="Link IDs" field="frontLinkId" data={data} nodeId={nodeId} updateNodeData={updateNodeData}
            placeholder="top_… — comma-separated" />
        )}

        {op.startsWith('list') || op.startsWith('search') ? (<>
          <TextField label="Page token (optional)" field="frontPageToken" data={data} nodeId={nodeId}
            updateNodeData={updateNodeData} placeholder="from a previous run" />
          <NumField label="Limit" field="frontLimit" data={data} nodeId={nodeId} updateNodeData={updateNodeData} fallback={25} />
        </>) : null}
      </IntegrationSection>
  )
}
