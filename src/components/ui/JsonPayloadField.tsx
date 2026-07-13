import { JsonEditor } from '@/components/ui/JsonEditor'

// JSON payload input — CodeMirror editor + the useJsonPayload validation
// banner. Shared by the webhook-simulation modal and the public trigger page
// so the two payload editors stay identical.

export function JsonPayloadField({ value, error, onChange, height = '220px', disabled, autoFocus }: {
  value: string
  error: string | null
  onChange: (v: string) => void
  height?: string
  disabled?: boolean
  autoFocus?: boolean
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <JsonEditor value={value} onChange={onChange} height={height} disabled={disabled} autoFocus={autoFocus} />
      {error && <p className="text-[11px] text-[var(--color-fail)]">{error}</p>}
    </div>
  )
}
