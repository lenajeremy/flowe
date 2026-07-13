import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useWorkflowStore } from '@/store/workflowStore'
import { startRun } from '@/lib/runController'
import { JsonPayloadField } from '@/components/ui/JsonPayloadField'
import { useJsonPayload } from '@/lib/useJsonPayload'
import { NODE_ICONS } from '@/lib/nodeIcons'
import { NODE_ACCENT_HEX } from '@/lib/nodeColors'

// Shown when Run is pressed on a flow that starts from a webhook trigger:
// the user supplies the JSON the webhook would have received, and the run
// executes exactly as if that payload had hit /trigger/<token>. The last
// payload is remembered per workflow.

const storageKey = (dbId: string | null | undefined) => `flowe:webhook-sim:${dbId ?? 'unsaved'}`

export function WebhookRunModal() {
  const open = useWorkflowStore((s) => s.isWebhookRunPromptOpen)
  const setOpen = useWorkflowStore((s) => s.setWebhookRunPromptOpen)
  const dbId = useWorkflowStore((s) => s.dbId)
  const payload = useJsonPayload('{}')

  // Restore the last simulated payload whenever the modal opens.
  useEffect(() => {
    if (!open) return
    try {
      const saved = localStorage.getItem(storageKey(dbId))
      if (saved) payload.update(saved)
    } catch { /* storage disabled */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, dbId])

  function run() {
    if (payload.error) return
    const body = payload.value.trim() === '' ? '{}' : payload.value
    try { localStorage.setItem(storageKey(dbId), body) } catch { /* ignore */ }
    setOpen(false)
    startRun({ webhookPayload: body })
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') setOpen(false)
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) run()
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'var(--color-scrim)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
          onKeyDown={handleKeyDown}
        >
          <motion.div
            className="w-full max-w-[620px] rounded-2xl border border-[var(--color-border)] bg-[var(--color-elevated)] p-5"
            style={{ boxShadow: 'var(--dock-shadow)' }}
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: 'spring', stiffness: 500, damping: 40 }}
          >
            {/* Header */}
            <div className="mb-4 flex items-start gap-3">
              <span
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl"
                style={{
                  background: `color-mix(in srgb, ${NODE_ACCENT_HEX.webhookTrigger} 16%, transparent)`,
                  color: NODE_ACCENT_HEX.webhookTrigger,
                }}
              >
                <span className="h-4.5 w-4.5 [&>svg]:h-full [&>svg]:w-full">{NODE_ICONS.webhookTrigger}</span>
              </span>
              <div className="min-w-0">
                <h2 className="text-[15px] font-semibold text-[var(--color-text)]">Simulate webhook</h2>
                <p className="mt-0.5 text-[12px] leading-relaxed text-[var(--color-muted)]">
                  This flow starts from a webhook. Enter the JSON it would receive —
                  the trigger node outputs it exactly as if the webhook had fired.
                </p>
              </div>
            </div>

            <JsonPayloadField
              value={payload.value}
              error={payload.error}
              onChange={payload.update}
              height="280px"
              autoFocus
            />

            {/* Actions */}
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="pressable rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-[12px] font-medium text-[var(--color-text)] hover:border-[var(--color-border2)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={run}
                disabled={!!payload.error}
                className="pressable flex items-center gap-1.5 rounded-xl bg-[var(--color-accent)] px-4 py-2 text-[12px] font-semibold text-white hover:opacity-90 disabled:opacity-40"
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                  <path d="M2 1.5l7 3.5-7 3.5V1.5z" />
                </svg>
                Run workflow
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
