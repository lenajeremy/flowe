import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { FloweIcon } from '@/components/FloweIcon'
import { UserMenu } from '@/components/ui/UserMenu'
import {
  listDataStores, createDataStore, deleteDataStore, clearDataStore,
  listDataEntries, putDataEntry, deleteDataEntry,
  type DataStore, type EntriesResponse, type StoreKind, type StoreScope,
} from '@/lib/dataApi'

const KIND_LABEL: Record<StoreKind, string> = { kv: 'Key–Value', collection: 'Collection', text: 'Text' }
const SCOPE_LABEL: Record<StoreScope, string> = { run: 'Run', workflow: 'Workflow', account: 'Account' }
const SCOPE_ORDER: StoreScope[] = ['account', 'workflow', 'run']

function coerceValue(input: string): unknown {
  const t = input.trim()
  if (t === '') return ''
  try { return JSON.parse(t) } catch { return input }
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-md border border-[var(--color-chip-border)] bg-[var(--color-chip)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-muted)]">
      {children}
    </span>
  )
}

// ── KV editor ────────────────────────────────────────────────
function KVEditor({ store, entries, reload }: { store: DataStore; entries: Extract<EntriesResponse, { kind: 'kv' }>['entries']; reload: () => void }) {
  const [key, setKey] = useState('')
  const [value, setValue] = useState('')

  async function set() {
    if (!key.trim()) return
    try {
      await putDataEntry(store.id, { key: key.trim(), value: coerceValue(value) })
      setKey(''); setValue(''); reload()
    } catch (e) { toast.error(String((e as Error).message)) }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <input value={key} onChange={(e) => setKey(e.target.value)} placeholder="key"
          className="h-9 w-40 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[12px] outline-none focus:border-[var(--color-accent)]" />
        <input value={value} onChange={(e) => setValue(e.target.value)} placeholder='value (e.g. 5 or "text")'
          onKeyDown={(e) => { if (e.key === 'Enter') void set() }}
          className="h-9 flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[12px] outline-none focus:border-[var(--color-accent)]" />
        <button onClick={() => void set()} className="pressable h-9 rounded-lg bg-[var(--color-text)] px-3 text-[12px] font-medium text-[var(--color-canvas)]">Set</button>
      </div>
      {entries.length === 0 ? (
        <p className="py-8 text-center text-[12px] text-[var(--color-muted)]">No keys yet.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--color-border)]">
          {entries.map((e, i) => (
            <div key={e.id} className={`flex items-center gap-3 px-3 py-2 ${i > 0 ? 'border-t border-[var(--color-border)]' : ''}`}>
              <span className="w-40 truncate font-mono text-[12px] text-[var(--color-text)]">{e.key}</span>
              <span className="flex-1 truncate font-mono text-[12px] text-[var(--color-muted)]">{JSON.stringify(e.value)}</span>
              <button onClick={() => void deleteDataEntry(store.id, e.key).then(reload)} className="text-[var(--color-subtle)] hover:text-[var(--color-fail)]" title="Delete">✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Collection editor ────────────────────────────────────────
function CollectionEditor({ store, entries, reload }: { store: DataStore; entries: Extract<EntriesResponse, { kind: 'collection' }>['entries']; reload: () => void }) {
  const [draft, setDraft] = useState('')

  async function add() {
    let record: unknown
    try { record = JSON.parse(draft) } catch { toast.error('Record must be valid JSON'); return }
    try { await putDataEntry(store.id, { record }); setDraft(''); reload() }
    catch (e) { toast.error(String((e as Error).message)) }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={3} placeholder='{"sku": "A123", "qty": 2}'
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3 font-mono text-[12px] outline-none focus:border-[var(--color-accent)]" />
        <button onClick={() => void add()} className="pressable h-9 w-max rounded-lg bg-[var(--color-text)] px-3 text-[12px] font-medium text-[var(--color-canvas)]">Add record</button>
      </div>
      {entries.length === 0 ? (
        <p className="py-8 text-center text-[12px] text-[var(--color-muted)]">No records yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {entries.map((e) => (
            <div key={e.id} className="flex items-start gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
              <pre className="flex-1 overflow-x-auto font-mono text-[11.5px] text-[var(--color-text)]">{JSON.stringify(e.record, null, 2)}</pre>
              <button onClick={() => void deleteDataEntry(store.id, e.id).then(reload)} className="text-[var(--color-subtle)] hover:text-[var(--color-fail)]" title="Delete">✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Text editor ──────────────────────────────────────────────
function TextEditor({ store, value, reload }: { store: DataStore; value: string; reload: () => void }) {
  const [text, setText] = useState(value)
  useEffect(() => { setText(value) }, [value])

  async function save() {
    try { await putDataEntry(store.id, { value: text }); toast.success('Saved'); reload() }
    catch (e) { toast.error(String((e as Error).message)) }
  }

  return (
    <div className="flex flex-col gap-3">
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={12}
        className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3 font-mono text-[12px] outline-none focus:border-[var(--color-accent)]" />
      <button onClick={() => void save()} className="pressable h-9 w-max rounded-lg bg-[var(--color-text)] px-3 text-[12px] font-medium text-[var(--color-canvas)]">Save</button>
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
  const [form, setForm] = useState<{ name: string; kind: StoreKind; scope: StoreScope }>({ name: '', kind: 'kv', scope: 'account' })

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
      const store = await createDataStore({
        name: form.name.trim(), kind: form.kind, scope: form.scope,
        workflow_id: form.scope === 'account' ? undefined : '',
      })
      await reloadStores()
      setSelectedId(store.id); setShowNew(false); setForm({ name: '', kind: 'kv', scope: 'account' })
    } catch (e) { toast.error(String((e as Error).message)) }
  }

  const grouped = useMemo(() => {
    const g: Record<StoreScope, DataStore[]> = { account: [], workflow: [], run: [] }
    for (const s of stores) g[s.scope]?.push(s)
    for (const k of SCOPE_ORDER) g[k].sort((a, b) => a.name.localeCompare(b.name))
    return g
  }, [stores])

  return (
    <div className="min-h-screen bg-[var(--color-canvas)] font-[var(--font-sans)] text-[var(--color-text)]">
      <div className="mx-auto max-w-[1280px] px-8 py-12">
        {/* Header */}
        <div className="mb-7 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="pressable flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-border2)]" title="Home">
              <FloweIcon size={18} />
            </button>
            <h1 className="text-[26px] font-semibold tracking-[-0.01em]">Data</h1>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/workflows')} className="pressable h-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[13px] font-medium hover:border-[var(--color-border2)]">Workflows</button>
            <UserMenu />
          </div>
        </div>

        <p className="mb-6 max-w-[640px] text-[13px] leading-relaxed text-[var(--color-muted)]">
          Stores your workflows read and write — counters, records, running text. This is also where you can see and edit what Flowe AI has saved.
        </p>

        {loading ? (
          <p className="py-24 text-center text-[13px] text-[var(--color-muted)]">Loading…</p>
        ) : (
          <div className="flex gap-6">
            {/* Store list */}
            <div className="w-[280px] shrink-0">
              <button onClick={() => setShowNew((v) => !v)} className="pressable mb-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-text)] text-[13px] font-semibold text-[var(--color-canvas)]">
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M5.5 1v9M1 5.5h9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
                New store
              </button>

              {showNew && (
                <div className="mb-3 flex flex-col gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
                  <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Store name"
                    className="h-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-canvas)] px-3 text-[12px] outline-none focus:border-[var(--color-accent)]" />
                  <select value={form.kind} onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value as StoreKind }))}
                    className="h-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-canvas)] px-2 text-[12px] outline-none">
                    <option value="kv">Key–Value</option><option value="collection">Collection (table)</option><option value="text">Text</option>
                  </select>
                  <select value={form.scope} onChange={(e) => setForm((f) => ({ ...f, scope: e.target.value as StoreScope }))}
                    className="h-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-canvas)] px-2 text-[12px] outline-none">
                    <option value="account">Account · all workflows</option>
                  </select>
                  <p className="text-[10px] text-[var(--color-subtle)]">Workflow/run-scoped stores are created from a Data node inside a workflow.</p>
                  <div className="flex gap-2">
                    <button onClick={() => void create()} className="pressable h-8 flex-1 rounded-lg bg-[var(--color-accent)] text-[12px] font-medium text-white">Create</button>
                    <button onClick={() => setShowNew(false)} className="h-8 rounded-lg border border-[var(--color-border)] px-3 text-[12px] text-[var(--color-muted)]">Cancel</button>
                  </div>
                </div>
              )}

              {stores.length === 0 ? (
                <p className="mt-4 text-[12px] text-[var(--color-muted)]">No stores yet.</p>
              ) : (
                SCOPE_ORDER.filter((sc) => grouped[sc].length > 0).map((sc) => (
                  <div key={sc} className="mb-4">
                    <p className="micro mb-1.5 px-1 text-[var(--color-subtle)]">{SCOPE_LABEL[sc]}</p>
                    <div className="flex flex-col gap-1">
                      {grouped[sc].map((s) => (
                        <button key={s.id} onClick={() => { setEntries(null); setSelectedId(s.id) }}
                          className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors ${selectedId === s.id ? 'border-[var(--color-accent)] bg-[var(--color-hover)]' : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-border2)]'}`}>
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
                <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-[var(--color-border2)] text-[13px] text-[var(--color-muted)]">
                  Select a store to view its data.
                </div>
              ) : (
                <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h2 className="text-[16px] font-semibold">{selected.name}</h2>
                      <Badge>{KIND_LABEL[selected.kind]}</Badge>
                      <Badge>{SCOPE_LABEL[selected.scope]}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      {selected.kind !== 'text' && (
                        <button onClick={() => void clearDataStore(selected.id).then(reloadEntries).catch((e) => toast.error(String((e as Error).message)))}
                          className="text-[12px] text-[var(--color-muted)] hover:text-[var(--color-text)]">Clear</button>
                      )}
                      <button onClick={() => { if (confirm(`Delete store "${selected.name}"? This removes all its data.`)) void deleteDataStore(selected.id).then(() => { setSelectedId(null); void reloadStores() }).catch((e) => toast.error(String((e as Error).message))) }}
                        className="text-[12px] text-[var(--color-fail)]/70 hover:text-[var(--color-fail)]">Delete store</button>
                    </div>
                  </div>

                  {selected.scope === 'run' ? (
                    <p className="py-8 text-center text-[12px] text-[var(--color-muted)]">Run-scoped — data lives only during a run and isn’t persisted here.</p>
                  ) : entries === null ? (
                    <p className="py-8 text-center text-[12px] text-[var(--color-muted)]">Loading…</p>
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
