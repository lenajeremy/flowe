import { useEffect, useSyncExternalStore } from 'react'
import { API } from '@/lib/config'
import { apiFetch } from '@/lib/http'
import { listDataEntries } from '@/lib/dataApi'

// Live store values for the canvas: one SSE stream for every Data node on the
// board, so a value written by a scheduled run shows up on the node without a
// trip to the Data page. Module-level (not React state) because several nodes
// watch the same store and must share one connection.
//
// EventSource can't send an Authorization header, so this reads the stream with
// fetch + a reader, the same way the chat panels do.

export interface LiveValue {
  /** Display text for the node card: a kv/text value, or "N records". */
  text: string
  updatedAt: number
}

type Snapshot = Record<string, LiveValue>

let values: Snapshot = {}
let watched: string[] = []
let abort: AbortController | null = null
const listeners = new Set<() => void>()

function emit() {
  values = { ...values }
  listeners.forEach((l) => l())
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

function setValue(storeId: string, text: string) {
  values[storeId] = { text, updatedAt: Date.now() }
  emit()
}

/** Seed from the current contents so nodes show a value before the first write. */
async function seed(storeId: string) {
  try {
    const res = await listDataEntries(storeId)
    if (res.kind === 'kv') {
      // A kv store can hold many keys; the node picks its own by key, so cache
      // them all under "storeId:key" plus a count summary for the bare store.
      for (const e of res.entries) {
        values[`${storeId}:${e.key}`] = { text: renderValue(e.value), updatedAt: Date.now() }
      }
      values[storeId] = { text: `${res.entries.length} key${res.entries.length === 1 ? '' : 's'}`, updatedAt: Date.now() }
    } else if (res.kind === 'collection') {
      values[storeId] = { text: `${res.entries.length} record${res.entries.length === 1 ? '' : 's'}`, updatedAt: Date.now() }
    } else {
      values[storeId] = { text: renderValue(res.value), updatedAt: Date.now() }
    }
    emit()
  } catch { /* a store we can't read just shows nothing */ }
}

export function renderValue(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—'
  if (typeof v === 'string') return v
  return JSON.stringify(v)
}

function stopStream() {
  abort?.abort()
  abort = null
}

async function startStream(ids: string[]) {
  stopStream()
  if (ids.length === 0) return
  const controller = new AbortController()
  abort = controller

  try {
    const res = await apiFetch(`${API}/api/data-stores/events?ids=${ids.join(',')}`, {
      signal: controller.signal,
    })
    if (!res.ok || !res.body) return
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue // skip ": ping" keepalives
        try {
          const ev = JSON.parse(line.slice(6)) as {
            store_id: string; key?: string; value?: string; count?: number; deleted?: boolean
          }
          if (typeof ev.count === 'number') {
            setValue(ev.store_id, `${ev.count} record${ev.count === 1 ? '' : 's'}`)
          } else if (ev.key !== undefined) {
            const text = ev.deleted ? '—' : renderValue(tryParse(ev.value))
            setValue(`${ev.store_id}:${ev.key}`, text)
            // Text stores are keyed internally; mirror onto the bare store id.
            setValue(ev.store_id, text)
          }
        } catch { /* ignore malformed frames */ }
      }
    }
  } catch { /* aborted or dropped — a remount restarts it */ }
}

function tryParse(raw?: string): unknown {
  if (raw === undefined) return ''
  try { return JSON.parse(raw) } catch { return raw }
}

/** Point the live stream at exactly these stores (no-op if unchanged). */
export function watchStores(ids: string[]) {
  const next = [...new Set(ids.filter(Boolean))].sort()
  if (next.join(',') === watched.join(',')) return
  watched = next
  next.forEach((id) => { if (!values[id]) void seed(id) })
  void startStream(next)
}

function getSnapshot(): Snapshot { return values }

/**
 * Live value for a store (optionally a specific kv key). Subscribing nodes
 * share one stream; pass every store id on the canvas via watchStores.
 */
export function useLiveValue(storeId?: string, key?: string): LiveValue | undefined {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  if (!storeId) return undefined
  return (key ? snap[`${storeId}:${key}`] : undefined) ?? snap[storeId]
}

/** Keeps the canvas's Data-node stores streaming for as long as it's mounted. */
export function useWatchStores(ids: string[]) {
  const joined = [...new Set(ids.filter(Boolean))].sort().join(',')
  useEffect(() => {
    watchStores(joined ? joined.split(',') : [])
  }, [joined])
  useEffect(() => () => stopStream(), [])
}
