import { useState, useEffect } from 'react'
import { getApiKeys, saveApiKeys } from '@/lib/apiKeys'

interface Props {
  onClose: () => void
}

export function ApiKeyModal({ onClose }: Props) {
  const [anthropic, setAnthropic] = useState('')
  const [openai, setOpenai] = useState('')

  useEffect(() => {
    const keys = getApiKeys()
    setAnthropic(keys.anthropic)
    setOpenai(keys.openai)
  }, [])

  function handleSave() {
    saveApiKeys({ anthropic: anthropic.trim(), openai: openai.trim() })
    onClose()
  }

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
          <div>
            <h2 className="text-sm font-semibold text-[var(--color-text)]">API Keys</h2>
            <p className="text-[11px] text-[var(--color-muted)] mt-0.5">
              Keys are stored locally in your browser only.
            </p>
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

        {/* Body */}
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

        {/* Footer */}
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
      </div>
    </div>
  )
}
