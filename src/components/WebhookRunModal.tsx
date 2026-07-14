import { useEffect } from 'react'
import { useWorkflowStore } from '@/store/workflowStore'
import { startRun } from '@/lib/runController'
import { JsonPayloadField } from '@/components/ui/JsonPayloadField'
import { useJsonPayload } from '@/lib/useJsonPayload'
import { NODE_ICONS } from '@/lib/nodeIcons'
import { NODE_ACCENT_HEX } from '@/lib/nodeColors'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="bg-[var(--color-elevated)] sm:max-w-[620px]"
        onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) run() }}
      >
        <DialogHeader className="flex-row items-start gap-3">
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
            <DialogTitle className="text-[15px] font-semibold">Simulate webhook</DialogTitle>
            <DialogDescription className="mt-0.5 text-[12px] leading-relaxed">
              This flow starts from a webhook. Enter the JSON it would receive —
              the trigger node outputs it exactly as if the webhook had fired.
            </DialogDescription>
          </div>
        </DialogHeader>

        <JsonPayloadField
          value={payload.value}
          error={payload.error}
          onChange={payload.update}
          height="280px"
          autoFocus
        />

        <div className="flex items-center justify-end gap-2">
          <DialogClose render={<Button variant="outline" className="rounded-xl text-[12px]" />}>
            Cancel
          </DialogClose>
          <Button
            onClick={run}
            disabled={!!payload.error}
            className="gap-1.5 rounded-xl text-[12px] font-semibold"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
              <path d="M2 1.5l7 3.5-7 3.5V1.5z" />
            </svg>
            Run workflow
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
