import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/store/authStore'
import { createWorkflow } from '@/lib/workflowApi'
import { setPendingPrompt } from '@/lib/pendingPrompt'
import { NODE_ICON_PATHS } from '@/lib/nodeColors'
import { FloweIcon } from '@/components/FloweIcon'
import { UserMenu } from '@/components/ui/UserMenu'
import type { NodeType } from '@/types/workflow'

// "Build with Flowe AI" — a focused, full-screen prompt. Submitting creates a
// workflow shell (description = the prompt), stashes the prompt for the
// editor's ChatPanel, and navigates there; the chat auto-sends it so the AI
// starts building the moment the canvas appears.

const SUGGESTIONS = [
  'Every Monday, search for top AI news and email me a digest',
  'Every Friday, summarize closed Linear tickets and post to Slack',
  'Every morning, summarise my unread Gmail and send a digest to Slack',
  'When a Stripe payment fails, create a Linear ticket and email me',
]

// Faint node-glyph constellation behind the hero — decoration only.
const PATTERN: Array<{ type: NodeType; x: string; y: string; s: number; r: number }> = [
  { type: 'loop',             x: '4%',  y: '6%',  s: 22, r: -8 },
  { type: 'scheduledTrigger', x: '12%', y: '3%',  s: 18, r: 6 },
  { type: 'gmail',            x: '9%',  y: '14%', s: 16, r: 0 },
  { type: 'humanApproval',    x: '22%', y: '7%',  s: 18, r: -5 },
  { type: 'httpRequest',      x: '3%',  y: '28%', s: 18, r: 4 },
  { type: 'imageInput',       x: '6%',  y: '46%', s: 20, r: 0 },
  { type: 'branch',           x: '3%',  y: '64%', s: 18, r: 8 },
  { type: 'textInput',        x: '10%', y: '80%', s: 16, r: -6 },
  { type: 'webhookTrigger',   x: '30%', y: '3%',  s: 16, r: 0 },
  { type: 'slack',            x: '70%', y: '4%',  s: 16, r: 5 },
  { type: 'scheduledTrigger', x: '88%', y: '6%',  s: 20, r: -6 },
  { type: 'notion',           x: '95%', y: '13%', s: 16, r: 0 },
  { type: 'googlecalendar',   x: '82%', y: '11%', s: 14, r: 8 },
  { type: 'emailSend',        x: '93%', y: '30%', s: 18, r: -4 },
  { type: 'googledrive',      x: '96%', y: '48%', s: 16, r: 0 },
  { type: 'stripe',           x: '92%', y: '66%', s: 18, r: 6 },
  { type: 'linear',           x: '96%', y: '82%', s: 16, r: -8 },
]

export function BuildPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const [prompt, setPrompt] = useState('')
  const [creating, setCreating] = useState(false)
  const [creatingBlank, setCreatingBlank] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const firstName = useMemo(() => (user?.name ?? '').split(' ')[0], [user])

  async function handleSubmit() {
    const text = prompt.trim()
    if (!text || creating) return
    setCreating(true)
    try {
      const wf = await createWorkflow({ description: text })
      setPendingPrompt(wf.id, text)
      navigate(`/workflow/${wf.id}`)
    } catch {
      setCreating(false)
    }
  }

  // Skip the AI entirely: blank workflow, straight to the canvas.
  async function handleBlank() {
    if (creatingBlank || creating) return
    setCreatingBlank(true)
    try {
      const wf = await createWorkflow()
      navigate(`/workflow/${wf.id}`)
    } catch {
      setCreatingBlank(false)
    }
  }

  function pick(s: string) {
    setPrompt(s)
    inputRef.current?.focus()
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--color-canvas)] font-[var(--font-sans)] text-[var(--color-text)]">
      {/* ── Backdrop: faint glyphs + two soft glows ── */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {PATTERN.map((p, i) => (
          <svg
            key={i}
            viewBox="0 0 16 16"
            fill="none"
            width={p.s}
            height={p.s}
            className="absolute text-[var(--color-text)] opacity-[0.07]"
            style={{ left: p.x, top: p.y, transform: `rotate(${p.r}deg)` }}
          >
            <path d={NODE_ICON_PATHS[p.type]} stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ))}
        <div
          className="absolute -left-40 top-10 h-[420px] w-[420px] rounded-full opacity-25"
          style={{ background: 'radial-gradient(circle, color-mix(in srgb, var(--color-accent) 30%, transparent), transparent 70%)' }}
        />
        <div
          className="absolute -right-40 top-24 h-[380px] w-[380px] rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, color-mix(in srgb, #ff8ce8 24%, transparent), transparent 70%)' }}
        />
      </div>

      {/* ── Chrome ── */}
      <div className="relative flex items-center justify-between px-6 py-5">
        <button
          onClick={() => navigate('/workflows')}
          className="pressable flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:border-[var(--color-border2)]"
          title="Back to workflows"
        >
          <FloweIcon size={18} />
        </button>
        <UserMenu />
      </div>

      {/* ── Hero ── */}
      <div className="relative mx-auto flex w-full max-w-[760px] flex-col items-center px-6 pt-[16vh]">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
        >
          <p className="text-[26px] font-medium leading-snug text-[var(--color-subtle)]">
            {firstName ? `Welcome ${firstName},` : 'Welcome,'}
          </p>
          <h1 className="text-[27px] font-semibold leading-snug tracking-[-0.01em]">
            Start automating your flows
          </h1>
        </motion.div>

        {/* Prompt card */}
        <motion.div
          className="mt-10 w-full rounded-[22px] p-px"
          style={{
            background:
              'linear-gradient(120deg, color-mix(in srgb, var(--color-accent) 45%, var(--color-border)), var(--color-border) 40%, color-mix(in srgb, #ff8ce8 35%, var(--color-border)))',
          }}
          initial={{ opacity: 0, y: 14, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.08, duration: 0.42, ease: [0.23, 1, 0.32, 1] }}
        >
          <div className="rounded-[21px] bg-[var(--color-surface)] p-4" style={{ boxShadow: 'var(--panel-shadow)' }}>
            <textarea
              ref={inputRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  void handleSubmit()
                }
              }}
              rows={2}
              autoFocus
              placeholder="Eg. Build a workflow that sends top product design articles to my email every day"
              className="max-h-40 w-full resize-none bg-transparent text-[15px] leading-relaxed text-[var(--color-text)] outline-none placeholder:text-[var(--color-placeholder)]"
            />
            <div className="mt-2 flex items-center justify-between">
              <span
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-border)] text-[var(--color-muted)]"
                title="Attachments coming soon"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M14 7.5 8.7 12.8a3.5 3.5 0 0 1-5-5L9.2 2.4a2.3 2.3 0 0 1 3.3 3.3L7.2 11a1.2 1.2 0 0 1-1.7-1.7l4.8-4.8"
                    stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <motion.button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={!prompt.trim() || creating}
                whileTap={{ scale: 0.94 }}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-text)] text-[var(--color-canvas)] transition-opacity hover:opacity-85 disabled:opacity-30"
                title="Create this flow"
              >
                {creating ? (
                  <svg width="15" height="15" viewBox="0 0 12 12" fill="none" className="animate-spin">
                    <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.3" />
                    <path d="M10.5 6A4.5 4.5 0 0 0 6 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                ) : (
                  <svg width="15" height="15" viewBox="0 0 14 14" fill="none">
                    <path d="M7 11.5v-9M3 6l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Suggestions */}
        <motion.div
          className="mt-8 w-full max-w-[640px] rounded-2xl border border-dashed border-[var(--color-border2)] px-2 py-1"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
        >
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => pick(s)}
              className="group flex w-full items-center justify-between gap-4 rounded-xl px-3 py-3.5 text-left transition-colors hover:bg-[var(--color-hover)]"
            >
              <span className="text-[13px] leading-snug text-[var(--color-muted)] transition-colors group-hover:text-[var(--color-text)]">
                {s}
              </span>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0 text-[var(--color-subtle)] transition-colors group-hover:text-[var(--color-accent)]">
                <path d="M9.7 1.8a1.4 1.4 0 0 1 2 2l-7.4 7.4-2.8.8.8-2.8 7.4-7.4z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ))}
        </motion.div>

        {/* Escape hatch: straight to a blank canvas */}
        <motion.button
          type="button"
          onClick={() => void handleBlank()}
          disabled={creatingBlank}
          className="group mt-7 flex items-center gap-1.5 text-[13px] font-medium text-[var(--color-muted)] transition-colors hover:text-[var(--color-text)] disabled:opacity-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.28, duration: 0.4 }}
        >
          {creatingBlank ? 'Opening canvas…' : 'Continue without AI'}
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" className="transition-transform group-hover:translate-x-0.5">
            <path d="M2.5 7h9M8 3.5 11.5 7 8 10.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.button>
      </div>
    </div>
  )
}
