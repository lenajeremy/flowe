import { Fragment, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { FloweIcon } from '@/components/FloweIcon'
import { UserMenu } from '@/components/ui/UserMenu'
import { NODE_ICONS } from '@/lib/nodeIcons'
import { JsonView } from '@/components/ui/JsonView'
import {
  listDataStores, createDataStore, deleteDataStore, clearDataStore,
  listDataEntries, putDataEntry, deleteDataEntry,
  type DataStore, type EntriesResponse, type KVEntry, type RecordEntry, type StoreKind, type StoreScope,
} from '@/lib/dataApi'
import posthog from '@/lib/posthog'

const KIND_LABEL: Record<StoreKind, string> = { kv: 'Key–Value', collection: 'Collection', text: 'Text' }
const SCOPE_LABEL: Record<StoreScope, string> = { run: 'Run', workflow: 'Workflow', account: 'Account' }
const SCOPE_HINT: Record<StoreScope, string> = {
  account: 'Shared across all your workflows',
  workflow: 'One workflow, persists across runs',
  run: 'Scratch space for a single run',
}
const SCOPE_ORDER: StoreScope[] = ['account', 'workflow', 'run']

function coerceValue(input: string): unknown {
  const t = input.trim()
  if (t === '') return ''
  try { return JSON.parse(t) } catch { return input }
}

function cell(v: unknown): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'string') return v
  return JSON.stringify(v)
}

// Pretty raw form of a value — what JsonView renders and what the inline
// editor starts from. Plain strings stay bare (no JSON quotes) for editing
// comfort; everything else is pretty JSON.
function prettyRaw(v: unknown): string {
  if (typeof v === 'string') return v
  return JSON.stringify(v, null, 2) ?? ''
}

// ── Value inspector: clean JSON render ⇄ inline editor ───────
function ValueInspector({ value, onSave, parseAs }: {
  value: unknown
  onSave: (next: unknown) => Promise<void>
  parseAs: 'any' | 'object' // collections require a JSON object
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)

  const raw = prettyRaw(value)

  async function save() {
    let next: unknown
    if (parseAs === 'object') {
      try {
        next = JSON.parse(draft)
        if (next === null || typeof next !== 'object' || Array.isArray(next)) throw new Error()
      } catch { toast.error('Must be a JSON object — e.g. {"qty": 2}'); return }
    } else {
      next = coerceValue(draft)
    }
    setSaving(true)
    try {
      await onSave(next)
      setEditing(false)
    } catch (e) { toast.error(String((e as Error).message)) }
    finally { setSaving(false) }
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={Math.min(14, Math.max(3, draft.split('\n').length + 1))}
          autoFocus
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void save(); if (e.key === 'Escape') setEditing(false) }}
          className="w-full rounded-lg border border-[var(--color-accent)] bg-[var(--color-canvas)] p-3 font-mono text-[12px] leading-relaxed outline-none"
          spellCheck={false}
        />
        <div className="flex items-center gap-2">
          <button onClick={() => void save()} disabled={saving}
            className="pressable h-7 rounded-lg bg-[var(--color-accent)] px-2.5 text-[11px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40">
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button onClick={() => setEditing(false)}
            className="h-7 rounded-lg border border-[var(--color-border)] px-2.5 text-[11px] text-[var(--color-muted)] hover:text-[var(--color-text)]">
            Cancel
          </button>
          <span className="text-[10px] text-[var(--color-subtle)]">⌘↵ to save · esc to cancel</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="max-h-[320px] overflow-y-auto rounded-lg bg-[var(--color-canvas)] p-3">
        <JsonView raw={typeof value === 'string' ? value : JSON.stringify(value, null, 2)} className="text-[12px] leading-relaxed" />
      </div>
      <button
        onClick={() => { setDraft(raw); setEditing(true) }}
        className="w-max text-[11px] font-medium text-[var(--color-accent)] transition-opacity hover:opacity-80"
      >
        Edit value
      </button>
    </div>
  )
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-md border border-[var(--color-chip-border)] bg-[var(--color-chip)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-muted)]">
      {children}
    </span>
  )
}

function DeleteX({ onClick, title }: { onClick: () => void; title: string }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick() }}
      title={title}
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[var(--color-subtle)] opacity-0 transition-opacity hover:bg-[var(--color-fail)]/10 hover:text-[var(--color-fail)] group-hover/row:opacity-100"
    >
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
        <path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    </button>
  )
}

// ── KV editor ────────────────────────────────────────────────
function KVEditor({ store, entries, reload }: { store: DataStore; entries: KVEntry[]; reload: () => void }) {
  const [key, setKey] = useState('')
  const [value, setValue] = useState('')
  const [openKey, setOpenKey] = useState<string | null>(null)

  async function set() {
    if (!key.trim()) return
    try {
      await putDataEntry(store.id, { key: key.trim(), value: coerceValue(value) })
      posthog.capture('data_entry_saved', { store_kind: store.kind, entry_type: 'key_value' })
      setKey(''); setValue(''); reload()
    } catch (e) { toast.error(String((e as Error).message)) }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <input value={key} onChange={(e) => setKey(e.target.value)} placeholder="new key"
          className="h-9 w-44 rounded-lg border border-[var(--color-border)] bg-[var(--color-canvas)] px-3 font-mono text-[12px] outline-none transition-colors placeholder:font-sans placeholder:text-[var(--color-placeholder)] focus:border-[var(--color-accent)]" />
        <input value={value} onChange={(e) => setValue(e.target.value)} placeholder='value — 5, true, "text", {"a": 1}'
          onKeyDown={(e) => { if (e.key === 'Enter') void set() }}
          className="h-9 flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-canvas)] px-3 font-mono text-[12px] outline-none transition-colors placeholder:font-sans placeholder:text-[var(--color-placeholder)] focus:border-[var(--color-accent)]" />
        <button onClick={() => void set()} className="pressable h-9 rounded-lg bg-[var(--color-text)] px-3.5 text-[12px] font-medium text-[var(--color-canvas)] hover:opacity-90">Set</button>
      </div>
      {entries.length === 0 ? (
        <p className="py-10 text-center text-[12px] text-[var(--color-muted)]">
          No keys yet — set your first value above, or let a workflow's Data node write one.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--color-border)]">
          <div className="flex items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface2)] px-3 py-1.5">
            <span className="micro w-44 text-[var(--color-subtle)]">Key</span>
            <span className="micro flex-1 text-[var(--color-subtle)]">Value</span>
          </div>
          {entries.map((e, i) => {
            const open = openKey === e.key
            return (
              <div key={e.id} className={i > 0 ? 'border-t border-[var(--color-border)]' : ''}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setOpenKey(open ? null : e.key)}
                  onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); setOpenKey(open ? null : e.key) } }}
                  className={`group/row flex w-full cursor-pointer items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-[var(--color-hover)] ${open ? 'bg-[var(--color-hover)]' : ''}`}
                >
                  <svg width="9" height="9" viewBox="0 0 10 10" fill="none"
                    className={`shrink-0 text-[var(--color-subtle)] transition-transform ${open ? 'rotate-90' : ''}`}>
                    <path d="M3 2l4 3-4 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="w-40 truncate font-mono text-[12px] text-[var(--color-text)]">{e.key}</span>
                  <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-[var(--color-muted)]">{JSON.stringify(e.value)}</span>
                  <DeleteX title={`Delete ${e.key}`} onClick={() => void deleteDataEntry(store.id, e.key).then(reload).catch((err) => toast.error(String((err as Error).message)))} />
                </div>
                {open && (
                  <div className="border-t border-[var(--color-border)] bg-[var(--color-surface2)]/50 px-3 py-3 pl-8">
                    <ValueInspector
                      value={e.value}
                      parseAs="any"
                      onSave={async (next) => { await putDataEntry(store.id, { key: e.key, value: next }); reload() }}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Collection editor (grid with inferred columns) ───────────
function CollectionEditor({ store, entries, reload }: { store: DataStore; entries: RecordEntry[]; reload: () => void }) {
  const [draft, setDraft] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)

  // Columns = union of record keys in first-seen order.
  const columns = useMemo(() => {
    const cols: string[] = []
    for (const e of entries) {
      const r = e.record
      if (r && typeof r === 'object' && !Array.isArray(r)) {
        for (const k of Object.keys(r)) if (!cols.includes(k)) cols.push(k)
      }
    }
    return cols
  }, [entries])

  async function add() {
    let record: unknown
    try { record = JSON.parse(draft) } catch { toast.error('Record must be valid JSON — e.g. {"sku": "A123", "qty": 2}'); return }
    try { await putDataEntry(store.id, { record }); posthog.capture('data_entry_saved', { store_kind: store.kind, entry_type: 'record' }); setDraft(''); reload() }
    catch (e) { toast.error(String((e as Error).message)) }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-2">
        <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={2} placeholder='{"sku": "A123", "qty": 2}'
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void add() }}
          className="min-h-[38px] flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-canvas)] px-3 py-2 font-mono text-[12px] outline-none transition-colors placeholder:text-[var(--color-placeholder)] focus:border-[var(--color-accent)]" />
        <button onClick={() => void add()} className="pressable h-9 rounded-lg bg-[var(--color-text)] px-3.5 text-[12px] font-medium text-[var(--color-canvas)] hover:opacity-90">Add record</button>
      </div>

      {entries.length === 0 ? (
        <p className="py-10 text-center text-[12px] text-[var(--color-muted)]">
          No records yet — add one above, or let a workflow's Data node append them.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--color-border)]">
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface2)]">
                {columns.map((c) => (
                  <th key={c} className="micro whitespace-nowrap px-3 py-1.5 text-left font-medium text-[var(--color-subtle)]">{c}</th>
                ))}
                <th className="w-8" aria-label="actions" />
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => {
                const r = (e.record && typeof e.record === 'object' && !Array.isArray(e.record) ? e.record : {}) as Record<string, unknown>
                const open = openId === e.id
                return (
                  <Fragment key={e.id}>
                    <tr
                      onClick={() => setOpenId(open ? null : e.id)}
                      className={`group/row cursor-pointer border-t border-[var(--color-border)] first:border-t-0 hover:bg-[var(--color-hover)] ${open ? 'bg-[var(--color-hover)]' : ''}`}
                    >
                      {columns.map((c, ci) => (
                        <td key={c} className="max-w-[240px] truncate px-3 py-2 font-mono text-[var(--color-text)]" title={cell(r[c])}>
                          {ci === 0 && (
                            <svg width="9" height="9" viewBox="0 0 10 10" fill="none"
                              className={`mr-1.5 inline-block text-[var(--color-subtle)] transition-transform ${open ? 'rotate-90' : ''}`}>
                              <path d="M3 2l4 3-4 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                          {r[c] === undefined ? <span className="text-[var(--color-subtle)]">—</span> : cell(r[c])}
                        </td>
                      ))}
                      <td className="px-1.5 py-2">
                        <DeleteX title="Delete record" onClick={() => void deleteDataEntry(store.id, e.id).then(reload).catch((err) => toast.error(String((err as Error).message)))} />
                      </td>
                    </tr>
                    {open && (
                      <tr className="border-t border-[var(--color-border)] bg-[var(--color-surface2)]/50">
                        <td colSpan={columns.length + 1} className="px-3 py-3 pl-8">
                          <ValueInspector
                            value={e.record}
                            parseAs="object"
                            onSave={async (next) => { await putDataEntry(store.id, { id: e.id, record: next }); reload() }}
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      {entries.length > 0 && (
        <p className="text-[10.5px] text-[var(--color-subtle)]">{entries.length} record{entries.length === 1 ? '' : 's'}</p>
      )}
    </div>
  )
}

// ── Text editor ──────────────────────────────────────────────
function TextEditor({ store, value, reload }: { store: DataStore; value: string; reload: () => void }) {
  const [text, setText] = useState(value)
  useEffect(() => { setText(value) }, [value])
  const dirty = text !== value

  async function save() {
    try { await putDataEntry(store.id, { value: text }); posthog.capture('data_entry_saved', { store_kind: store.kind, entry_type: 'text' }); toast.success('Saved'); reload() }
    catch (e) { toast.error(String((e as Error).message)) }
  }

  return (
    <div className="flex flex-col gap-3">
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={12} placeholder="Empty — workflows can append to this, or write here directly."
        className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-canvas)] p-3 font-mono text-[12px] leading-relaxed outline-none transition-colors placeholder:text-[var(--color-placeholder)] focus:border-[var(--color-accent)]" />
      <div className="flex items-center gap-3">
        <button onClick={() => void save()} disabled={!dirty}
          className="pressable h-9 w-max rounded-lg bg-[var(--color-text)] px-3.5 text-[12px] font-medium text-[var(--color-canvas)] transition-opacity hover:opacity-90 disabled:opacity-40">
          Save changes
        </button>
        {dirty && <span className="text-[11px] text-[var(--color-muted)]">Unsaved changes</span>}
      </div>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────
export function DataPage() {
  const navigate = useNavigate()
  const [stores, setStores] = useState<DataStore[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [entries, setEntries] = useState<EntriesResponse | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState<{ name: string; kind: StoreKind }>({ name: '', kind: 'kv' })
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const selected = stores.find((s) => s.id === selectedId) ?? null

  function reloadStores() {
    return listDataStores().then((s) => setStores(s)).catch((e) => toast.error(String((e as Error).message)))
  }
  useEffect(() => { void reloadStores().finally(() => setLoading(false)) }, [])

  function reloadEntries() {
    if (!selectedId) return
    listDataEntries(selectedId).then(setEntries).catch(() => setEntries(null))
  }
  useEffect(() => {
    if (!selectedId) return
    let cancelled = false
    listDataEntries(selectedId)
      .then((e) => { if (!cancelled) setEntries(e) })
      .catch(() => { if (!cancelled) setEntries(null) })
    return () => { cancelled = true }
  }, [selectedId])

  async function create() {
    if (!form.name.trim()) return
    try {
      const store = await createDataStore({ name: form.name.trim(), kind: form.kind, scope: 'account' })
      posthog.capture('data_store_created', { store_kind: form.kind, scope: 'account' })
      await reloadStores()
      setEntries(null); setSelectedId(store.id)
      setShowNew(false); setForm({ name: '', kind: 'kv' })
    } catch (e) { toast.error(String((e as Error).message)) }
  }

  async function removeSelected() {
    if (!selected) return
    try {
      await deleteDataStore(selected.id)
      setConfirmingDelete(false); setSelectedId(null); setEntries(null)
      void reloadStores()
    } catch (e) { toast.error(String((e as Error).message)) }
  }

  const grouped = useMemo(() => {
    const g: Record<StoreScope, DataStore[]> = { account: [], workflow: [], run: [] }
    for (const s of stores) g[s.scope]?.push(s)
    for (const k of SCOPE_ORDER) g[k].sort((a, b) => a.name.localeCompare(b.name))
    return g
  }, [stores])

  return (
    <div className="min-h-screen bg-[var(--color-canvas)] font-sans text-[var(--color-text)]">
      <div className="mx-auto max-w-[1280px] px-8 py-12">
        {/* Header */}
        <div className="mb-7 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="pressable flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-border2)]" title="Home">
              <FloweIcon size={18} />
            </button>
            <h1 className="text-[26px] font-semibold tracking-[-0.01em]">Data</h1>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/workflows')}
              className="flex items-center gap-1.5 text-[13px] font-medium text-[var(--color-muted)] transition-colors hover:text-[var(--color-text)]"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
                <rect x="1" y="1" width="5" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.2" />
                <rect x="8" y="1" width="5" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.2" />
                <rect x="1" y="8" width="5" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.2" />
                <rect x="8" y="8" width="5" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.2" />
              </svg>
              Workflows
            </button>
            <span className="h-5 w-px bg-[var(--color-border)]" />
            <UserMenu />
          </div>
        </div>

        <p className="mb-6 max-w-[640px] text-[13px] leading-relaxed text-[var(--color-muted)]">
          Everything your workflows remember — counters, records, running notes. Anything Fernary AI saves shows up here too.
        </p>

        {loading ? (
          <p className="py-24 text-center text-[13px] text-[var(--color-muted)]">Loading…</p>
        ) : (
          <div className="flex gap-6">
            {/* Store list */}
            <div className="w-[280px] shrink-0">
              <button onClick={() => setShowNew((v) => !v)} className="pressable mb-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-text)] text-[13px] font-semibold text-[var(--color-canvas)] hover:opacity-90">
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M5.5 1v9M1 5.5h9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
                New store
              </button>

              {showNew && (
                <div className="mb-3 flex flex-col gap-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
                  <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Store name" autoFocus
                    onKeyDown={(e) => { if (e.key === 'Enter') void create() }}
                    className="h-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-canvas)] px-3 text-[12px] outline-none transition-colors placeholder:text-[var(--color-placeholder)] focus:border-[var(--color-accent)]" />
                  <div className="flex overflow-hidden rounded-lg border border-[var(--color-border)]">
                    {(Object.keys(KIND_LABEL) as StoreKind[]).map((k) => (
                      <button key={k} onClick={() => setForm((f) => ({ ...f, kind: k }))}
                        className={`h-8 flex-1 text-[11px] font-medium transition-colors ${form.kind === k ? 'bg-[var(--color-accent)] text-white' : 'bg-[var(--color-canvas)] text-[var(--color-muted)] hover:text-[var(--color-text)]'}`}>
                        {KIND_LABEL[k]}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] leading-relaxed text-[var(--color-subtle)]">
                    Account-scoped — shared across all your workflows. Workflow and run stores are created from a Data node on the canvas.
                  </p>
                  <div className="flex gap-2">
                    <button onClick={() => void create()} disabled={!form.name.trim()} className="pressable h-8 flex-1 rounded-lg bg-[var(--color-accent)] text-[12px] font-medium text-white transition-opacity disabled:opacity-40">Create store</button>
                    <button onClick={() => setShowNew(false)} className="h-8 rounded-lg border border-[var(--color-border)] px-3 text-[12px] text-[var(--color-muted)] hover:text-[var(--color-text)]">Cancel</button>
                  </div>
                </div>
              )}

              {stores.length === 0 && !showNew ? (
                <div className="mt-2 flex flex-col items-center gap-2 rounded-xl border border-dashed border-[var(--color-border2)] px-4 py-8 text-center">
                  <span className="h-6 w-6 text-[var(--na-data)] [&>svg]:h-full [&>svg]:w-full">{NODE_ICONS.data}</span>
                  <p className="text-[12px] leading-relaxed text-[var(--color-muted)]">
                    No stores yet. Create one here, or drop a Data node into a workflow.
                  </p>
                </div>
              ) : (
                SCOPE_ORDER.filter((sc) => grouped[sc].length > 0).map((sc) => (
                  <div key={sc} className="mb-4">
                    <p className="micro mb-1.5 px-1 text-[var(--color-subtle)]" title={SCOPE_HINT[sc]}>{SCOPE_LABEL[sc]}</p>
                    <div className="flex flex-col gap-1">
                      {grouped[sc].map((s) => (
                        <button key={s.id} onClick={() => { setEntries(null); setConfirmingDelete(false); setSelectedId(s.id) }}
                          className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left transition-colors ${selectedId === s.id ? 'border-[var(--color-accent)] bg-[var(--color-hover)]' : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-border2)]'}`}>
                          <span className="truncate text-[13px] font-medium text-[var(--color-text)]">{s.name}</span>
                          <Badge>{KIND_LABEL[s.kind]}</Badge>
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Detail */}
            <div className="min-w-0 flex-1">
              {!selected ? (
                <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--color-border2)] text-[13px] text-[var(--color-muted)]">
                  <span className="h-7 w-7 text-[var(--na-data)] opacity-60 [&>svg]:h-full [&>svg]:w-full">{NODE_ICONS.data}</span>
                  {stores.length === 0 ? 'Create a store to get started.' : 'Select a store to view its data.'}
                </div>
              ) : (
                <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <h2 className="truncate text-[16px] font-semibold">{selected.name}</h2>
                      <Badge>{KIND_LABEL[selected.kind]}</Badge>
                      <span title={SCOPE_HINT[selected.scope]}><Badge>{SCOPE_LABEL[selected.scope]}</Badge></span>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      {selected.kind !== 'text' && (
                        <button onClick={() => void clearDataStore(selected.id).then(reloadEntries).catch((e) => toast.error(String((e as Error).message)))}
                          className="text-[12px] text-[var(--color-muted)] transition-colors hover:text-[var(--color-text)]">Clear data</button>
                      )}
                      {confirmingDelete ? (
                        <span className="flex items-center gap-2">
                          <button onClick={() => void removeSelected()} className="rounded-md bg-[var(--color-fail)] px-2 py-1 text-[11px] font-medium text-white">Delete store + data</button>
                          <button onClick={() => setConfirmingDelete(false)} className="text-[12px] text-[var(--color-muted)] hover:text-[var(--color-text)]">Keep</button>
                        </span>
                      ) : (
                        <button onClick={() => setConfirmingDelete(true)} className="text-[12px] text-[var(--color-fail)]/70 transition-colors hover:text-[var(--color-fail)]">Delete store</button>
                      )}
                    </div>
                  </div>

                  {selected.scope === 'run' ? (
                    <p className="py-10 text-center text-[12px] text-[var(--color-muted)]">Run-scoped — data lives only inside a single run and isn't persisted here.</p>
                  ) : entries === null ? (
                    <p className="py-10 text-center text-[12px] text-[var(--color-muted)]">Loading…</p>
                  ) : entries.kind === 'kv' ? (
                    <KVEditor store={selected} entries={entries.entries} reload={reloadEntries} />
                  ) : entries.kind === 'collection' ? (
                    <CollectionEditor store={selected} entries={entries.entries} reload={reloadEntries} />
                  ) : (
                    <TextEditor store={selected} value={entries.value} reload={reloadEntries} />
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
