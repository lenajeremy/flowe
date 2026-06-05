import { useState, useEffect } from 'react'
import { getApiKeys, saveApiKeys } from '@/lib/apiKeys'
import { listApiKeys, createApiKey, deleteApiKey, type ApiKey } from '@/lib/workflowApi'

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
            <div className="w-2 h-2 rounded-full bg-[var(--color-node-llm)]" />
            <label htmlFor="key-anthropic" className="text-xs font-medium text-[var(--color-text)]">
              Anthropic API Key
            </label>
            <span className="text-[10px] text-[var(--color-muted)] ml-auto">
              claude-* models
            </span>
          </div>
          <input
            id="key-anthropic"
            type="password"
            value={anthropic}
            onChange={(e) => setAnthropic(e.target.value)}
            placeholder="sk-ant-…"
            className="w-full bg-[var(--color-surface2)] border border-[var(--color-border)] rounded px-3 py-2 text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-accent)] transition-colors placeholder:text-[var(--color-muted)] font-[var(--font-mono)]"
          />
        </div>

        {/* OpenAI */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            <label htmlFor="key-openai" className="text-xs font-medium text-[var(--color-text)]">
              OpenAI API Key
            </label>
            <span className="text-[10px] text-[var(--color-muted)] ml-auto">
              gpt-* models
            </span>
          </div>
          <input
            id="key-openai"
            type="password"
            value={openai}
            onChange={(e) => setOpenai(e.target.value)}
            placeholder="sk-…"
            className="w-full bg-[var(--color-surface2)] border border-[var(--color-border)] rounded px-3 py-2 text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-accent)] transition-colors placeholder:text-[var(--color-muted)] font-[var(--font-mono)]"
          />
        </div>

        <p className="text-[10px] text-[var(--color-muted)] leading-relaxed">
          Keys never leave your browser. API calls go directly to Anthropic / OpenAI from your machine.
        </p>
      </div>

      <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-[var(--color-border)]">
        <button
          onClick={onClose}
          className="px-3 py-1.5 rounded text-xs text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface2)] transition-all"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="px-4 py-1.5 rounded text-xs font-medium bg-[var(--color-accent)] text-white hover:bg-blue-400 transition-all active:scale-95"
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
          style={{ background: 'rgba(16,185,129,0.08)', borderColor: 'rgba(16,185,129,0.2)' }}
        >
          <p className="text-[11px] font-semibold text-emerald-400">Your new API key (shown only once):</p>
          <div
            className="flex items-center gap-2 rounded px-2.5 py-2 border font-[var(--font-mono)] text-[11px]"
            style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}
          >
            <span className="flex-1 break-all text-white/90 select-all">{newKeyResult.key}</span>
            <button
              onClick={() => handleCopy(newKeyResult.key)}
              className="flex-shrink-0 px-2 py-1 rounded text-[10px] font-medium bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <p className="text-[10px] text-white/40">Save this key — it won't be shown again.</p>
          <button
            onClick={() => setNewKeyResult(null)}
            className="self-end text-[10px] text-white/40 hover:text-white/60 transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Create new key */}
      <div className="flex flex-col gap-2">
        <p className="text-[10px] uppercase tracking-wider text-[var(--color-muted)]">Create new key</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void handleCreate() }}
            placeholder="Key name (e.g. my-app)"
            className="flex-1 bg-[var(--color-surface2)] border border-[var(--color-border)] rounded px-3 py-1.5 text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-accent)] transition-colors placeholder:text-[var(--color-muted)]"
          />
          <button
            onClick={() => void handleCreate()}
            disabled={creating || !newKeyName.trim()}
            className="px-3 py-1.5 rounded text-xs font-medium bg-white text-black hover:opacity-90 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {creating ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>

      {/* Key list */}
      {error && (
        <p className="text-[11px] text-red-400">{error}</p>
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
              style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}
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
                  <span className="text-[10px] text-white/60">Delete?</span>
                  <button
                    onClick={() => void handleDelete(k.id)}
                    className="px-2 py-1 rounded text-[10px] font-medium bg-red-500/80 hover:bg-red-500 text-white transition-colors"
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setDeletingId(null)}
                    className="px-2 py-1 rounded text-[10px] text-white/40 hover:text-white/60 transition-colors"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setDeletingId(k.id)}
                  className="flex-shrink-0 p-1.5 rounded text-[var(--color-muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors"
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
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Dialog */}
      <div className="relative w-full max-w-md mx-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-3">
            <div>
              <h2 className="text-sm font-semibold text-[var(--color-text)]">API Keys</h2>
              <p className="text-[11px] text-[var(--color-muted)] mt-0.5">
                Manage your LLM provider keys and programmatic API keys.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors p-1 rounded hover:bg-[var(--color-surface2)]"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

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
      </div>
    </div>
  )
}
