import { API } from '@/lib/config'
import { apiFetch } from '@/lib/http'

export type StoreKind = 'kv' | 'collection' | 'text'
export type StoreScope = 'run' | 'workflow' | 'account'

export interface DataStore {
  id: string
  name: string
  kind: StoreKind
  scope: StoreScope
  workflow_id: string
  schema: unknown
  created_at: string
}

export interface KVEntry { id: string; key: string; value: unknown; updated_at: string }
export interface RecordEntry { id: string; record: unknown; created_at: string }

export type EntriesResponse =
  | { kind: 'kv'; entries: KVEntry[] }
  | { kind: 'collection'; entries: RecordEntry[] }
  | { kind: 'text'; value: string }

async function readError(res: Response): Promise<string> {
  const body = (await res.json().catch(() => ({}))) as { error?: string }
  return body.error ?? `Request failed (${res.status})`
}

export async function listDataStores(workflowId?: string): Promise<DataStore[]> {
  const q = workflowId ? `?workflow_id=${encodeURIComponent(workflowId)}` : ''
  const res = await apiFetch(`${API}/api/data-stores${q}`)
  if (!res.ok) throw new Error(await readError(res))
  return res.json() as Promise<DataStore[]>
}

export async function createDataStore(body: {
  name: string; kind: StoreKind; scope: StoreScope; workflow_id?: string; schema?: unknown
}): Promise<DataStore> {
  const res = await apiFetch(`${API}/api/data-stores`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await readError(res))
  return res.json() as Promise<DataStore>
}

/** Resolve a paused AI data-store proposal. Accepting creates the store server
 *  side and releases the builder's turn; returns the new store on accept. */
export async function resolveDataStoreProposal(
  proposalId: string,
  action: 'accept' | 'reject',
): Promise<DataStore | null> {
  const res = await apiFetch(`${API}/api/ai/data-store-proposals/${proposalId}/resolve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action }),
  })
  if (!res.ok) throw new Error(await readError(res))
  return action === 'accept' ? (res.json() as Promise<DataStore>) : null
}

export async function deleteDataStore(id: string): Promise<void> {
  const res = await apiFetch(`${API}/api/data-stores/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(await readError(res))
}

export async function clearDataStore(id: string): Promise<void> {
  const res = await apiFetch(`${API}/api/data-stores/${id}/clear`, { method: 'POST' })
  if (!res.ok) throw new Error(await readError(res))
}

export async function listDataEntries(id: string): Promise<EntriesResponse> {
  const res = await apiFetch(`${API}/api/data-stores/${id}/entries`)
  if (!res.ok) throw new Error(await readError(res))
  return res.json() as Promise<EntriesResponse>
}

// kv: {key, value}   text: {value}   collection: {record} or {id, record}
export async function putDataEntry(id: string, body: Record<string, unknown>): Promise<void> {
  const res = await apiFetch(`${API}/api/data-stores/${id}/entries`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await readError(res))
}

export async function deleteDataEntry(id: string, entry: string): Promise<void> {
  const res = await apiFetch(`${API}/api/data-stores/${id}/entries/${encodeURIComponent(entry)}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(await readError(res))
}
