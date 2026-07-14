import { useState, useEffect } from 'react'
import { getApiKeys, saveApiKeys } from '@/lib/apiKeys'
import { listApiKeys, createApiKey, deleteApiKey, type ApiKey } from '@/lib/workflowApi'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface Props {
  onClose: () => void
}

// ── LLM Keys tab ─────────────────────────────────────────────

function LlmKeysTab({ onClose }: { onClose: () => void }) {
  const [anthropic, setAnthropic] = useState(() => getApiKeys().anthropic)
  const [openai, setOpenai] = useState(() => getApiKeys().openai)

  function handleSave() {
    saveApiKeys({ anthropic: anthropic.trim(), openai: openai.trim(), gemini: getApiKeys().gemini })
    onClose()
  }

  return (
    <>
      <div className="px-5 py-4 flex flex-col gap-4">
        {/* Anthropic */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[var(--color-ok)]" />
            <label htmlFor="key-anthropic" className="text-xs font-medium text-[var(--color-text)]">
              Anthropic API Key
            </label>
            <span className="text-[10px] text-[var(--color-muted)] ml-auto">
              claude-* models
            </span>
          </div>
          <Input
            id="key-anthropic"
            type="password"
            value={anthropic}
            onChange={(e) => setAnthropic(e.target.value)}
            placeholder="sk-ant-…"
            className="h-auto rounded bg-[var(--color-surface2)] px-3 py-2 font-[var(--font-mono)] text-xs"
          />
        </div>

        {/* OpenAI */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[var(--color-ok)]" />
            <label htmlFor="key-openai" className="text-xs font-medium text-[var(--color-text)]">
              OpenAI API Key
            </label>
            <span className="text-[10px] text-[var(--color-muted)] ml-auto">
              gpt-* models
            </span>
          </div>
          <Input
            id="key-openai"
            type="password"
            value={openai}
            onChange={(e) => setOpenai(e.target.value)}
            placeholder="sk-…"
            className="h-auto rounded bg-[var(--color-surface2)] px-3 py-2 font-[var(--font-mono)] text-xs"
          />
        </div>

        <p className="text-[10px] text-[var(--color-muted)] leading-relaxed">
          Keys never leave your browser. API calls go directly to Anthropic / OpenAI from your machine.
        </p>
      </div>

      <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-[var(--color-border)]">
        <button
          onClick={onClose}
          className="pressable rounded-lg px-3 py-1.5 text-xs text-[var(--color-muted)] hover:bg-[var(--color-surface2)] hover:text-[var(--color-text)]"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="pressable rounded-lg bg-[var(--color-text)] px-4 py-1.5 text-xs font-semibold text-[var(--color-canvas)] hover:opacity-90"
        >
          Save Keys
        </button>
      </div>
    </>
  )
}

// ── API Keys tab ──────────────────────────────────────────────

function ApiKeysTab() {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Create flow
  const [creating, setCreating] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [newKeyResult, setNewKeyResult] = useState<{ key: string } | null>(null)
  const [copied, setCopied] = useState(false)

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    loadKeys()
  }, [])

  function loadKeys() {
    setLoading(true)
    setError(null)
    listApiKeys()
      .then(setKeys)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load keys'))
      .finally(() => setLoading(false))
  }

  async function handleCreate() {
    if (!newKeyName.trim() || creating) return
    setCreating(true)
    try {
      const result = await createApiKey(newKeyName.trim())
      setNewKeyResult({ key: result.key })
      setNewKeyName('')
      await loadKeys()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create key')
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(null)
    try {
      await deleteApiKey(id)
      setKeys((prev) => prev.filter((k) => k.id !== id))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to delete key')
    }
  }

  function handleCopy(text: string) {
    void navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function formatDate(iso: string | null) {
    if (!iso) return 'Never'
    try {
      return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    } catch {
      return iso
    }
  }

  return (
    <div className="px-5 py-4 flex flex-col gap-4">
      {/* Newly created key reveal */}
      {newKeyResult && (
        <div
          className="flex flex-col gap-2 rounded-lg p-3 border"
          style={{ background: 'var(--tint-ok)', borderColor: 'color-mix(in srgb, var(--color-ok) 30%, transparent)' }}
        >
          <p className="text-[11px] font-semibold text-[var(--color-ok)]">Your new API key (shown only once):</p>
          <div
            className="flex items-center gap-2 rounded px-2.5 py-2 border font-[var(--font-mono)] text-[11px]"
            style={{ background: 'var(--color-hover)', borderColor: 'var(--color-border)' }}
          >
            <span className="flex-1 break-all text-[var(--color-text)] select-all">{newKeyResult.key}</span>
            <button
              onClick={() => handleCopy(newKeyResult.key)}
              className="flex-shrink-0 px-2 py-1 rounded text-[10px] font-medium bg-[var(--color-hover)] hover:bg-[var(--color-hover2)] text-[var(--color-text)] transition-colors"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <p className="text-[10px] text-[var(--color-subtle)]">Save this key — it won't be shown again.</p>
          <button
            onClick={() => setNewKeyResult(null)}
            className="self-end text-[10px] text-[var(--color-subtle)] hover:text-[var(--color-muted)] transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Create new key */}
      <div className="flex flex-col gap-2">
        <p className="micro text-[var(--color-subtle)]">Create new key</p>
        <div className="flex gap-2">
          <Input
            type="text"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void handleCreate() }}
            placeholder="Key name (e.g. my-app)"
            className="h-auto flex-1 rounded bg-[var(--color-surface2)] px-3 py-1.5 text-xs"
          />
          <Button
            onClick={() => void handleCreate()}
            disabled={creating || !newKeyName.trim()}
            variant="secondary"
            className="pressable rounded-lg bg-[var(--color-text)] px-3 py-1.5 text-xs font-semibold text-[var(--color-canvas)] hover:bg-[var(--color-text)] hover:opacity-90"
          >
            {creating ? 'Creating…' : 'Create'}
          </Button>
        </div>
      </div>

      {/* Key list */}
      {error && (
        <p className="text-[11px] text-[var(--color-fail)]">{error}</p>
      )}

      {loading ? (
        <p className="text-[11px] text-[var(--color-muted)]">Loading…</p>
      ) : keys.length === 0 ? (
        <p className="text-[11px] text-[var(--color-muted)]">No API keys yet.</p>
      ) : (
        <div className="flex flex-col gap-1">
          {keys.map((k) => (
            <div
              key={k.id}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 border"
              style={{ background: 'var(--color-hover)', borderColor: 'var(--color-border)' }}
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-[var(--color-text)] truncate">{k.name}</p>
                <p className="text-[10px] text-[var(--color-muted)] font-[var(--font-mono)] mt-0.5">
                  {k.key_prefix}…
                </p>
                <p className="text-[10px] text-[var(--color-muted)] mt-0.5">
                  Last used: {formatDate(k.last_used_at)}
                </p>
              </div>
              {deletingId === k.id ? (
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="text-[10px] text-[var(--color-muted)]">Delete?</span>
                  <button
                    onClick={() => void handleDelete(k.id)}
                    className="px-2 py-1 rounded text-[10px] font-medium bg-[var(--color-fail)] text-white transition-opacity hover:opacity-90"
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setDeletingId(null)}
                    className="px-2 py-1 rounded text-[10px] text-[var(--color-subtle)] hover:text-[var(--color-muted)] transition-colors"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setDeletingId(k.id)}
                  className="flex-shrink-0 p-1.5 rounded text-[var(--color-muted)] transition-colors hover:bg-[var(--color-fail)]/10 hover:text-[var(--color-fail)]"
                  title="Delete key"
                >
                  <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                    <path d="M2 3h7M4.5 3V2h2v1M4 3l.5 6M7 3l-.5 6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Modal shell ───────────────────────────────────────────────

export function ApiKeyModal({ onClose }: Props) {
  const [activeTab, setActiveTab] = useState<'llm' | 'api'>('llm')

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="gap-0 bg-[var(--color-surface)] p-0 sm:max-w-md">
        {/* Header */}
        <DialogHeader className="border-b border-[var(--color-border)] px-5 py-4">
          <DialogTitle className="text-sm font-semibold">API Keys</DialogTitle>
          <DialogDescription className="mt-0.5 text-[11px]">
            Manage your LLM provider keys and programmatic API keys.
          </DialogDescription>
        </DialogHeader>

        {/* Tab switcher */}
        <div className="flex gap-0 border-b border-[var(--color-border)]">
          <button
            onClick={() => setActiveTab('llm')}
            className={`flex-1 px-4 py-2.5 text-xs font-medium transition-colors border-b-2 ${
              activeTab === 'llm'
                ? 'border-[var(--color-accent)] text-[var(--color-text)]'
                : 'border-transparent text-[var(--color-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            LLM Keys
          </button>
          <button
            onClick={() => setActiveTab('api')}
            className={`flex-1 px-4 py-2.5 text-xs font-medium transition-colors border-b-2 ${
              activeTab === 'api'
                ? 'border-[var(--color-accent)] text-[var(--color-text)]'
                : 'border-transparent text-[var(--color-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            API Keys
          </button>
        </div>

        {/* Tab content */}
        <div className="max-h-[70vh] overflow-y-auto">
          {activeTab === 'llm' ? (
            <LlmKeysTab onClose={onClose} />
          ) : (
            <ApiKeysTab />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
