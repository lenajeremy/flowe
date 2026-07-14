import { useState } from 'react'
import { CalendarIcon, XIcon } from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * Date + time picker that stores ISO 8601 UTC strings (what provider APIs
 * take) while presenting everything in the user's local time: a calendar
 * for the date, a time field for the clock, and a clear affordance.
 */
export function DateTimePicker({ id, value, onChange, placeholder = 'Pick a date & time' }: {
  id: string
  value: string // ISO 8601 UTC, or ''
  onChange: (iso: string) => void
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const date = value ? new Date(value) : undefined
  const valid = date && !Number.isNaN(date.getTime()) ? date : undefined

  const commit = (next: Date) => onChange(next.toISOString())

  const pickDate = (picked: Date | undefined) => {
    if (!picked) return
    const next = new Date(picked)
    // Keep the already-chosen clock time; default new picks to 09:00
    if (valid) next.setHours(valid.getHours(), valid.getMinutes(), 0, 0)
    else next.setHours(9, 0, 0, 0)
    commit(next)
  }

  const pickTime = (hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number)
    if (Number.isNaN(h) || Number.isNaN(m)) return
    const next = valid ? new Date(valid) : new Date()
    next.setHours(h, m, 0, 0)
    commit(next)
  }

  const timeValue = valid
    ? `${String(valid.getHours()).padStart(2, '0')}:${String(valid.getMinutes()).padStart(2, '0')}`
    : ''

  return (
    <div className="flex items-center gap-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              id={id}
              variant="outline"
              className={cn(
                'h-auto w-full justify-start gap-2 rounded-[7px] border-[var(--color-border)] bg-[var(--color-surface2)] px-2.5 py-1.5 font-[var(--font-mono)] text-xs font-normal hover:bg-[var(--color-surface2)]',
                !valid && 'text-[var(--color-placeholder)]',
              )}
            />
          }
        >
          <CalendarIcon className="size-3.5 text-[var(--color-subtle)]" />
          {valid
            ? valid.toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
            : placeholder}
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={valid}
            onSelect={pickDate}
            defaultMonth={valid}
            autoFocus
          />
          <div className="flex items-center gap-2 border-t border-[var(--color-border)] p-3">
            <span className="text-[11px] text-[var(--color-muted)]">Time</span>
            <Input
              type="time"
              value={timeValue}
              onChange={(e) => pickTime(e.target.value)}
              className="h-7 w-fit font-[var(--font-mono)] text-xs"
            />
            <span className="ml-auto text-[10px] text-[var(--color-subtle)]">local time</span>
          </div>
        </PopoverContent>
      </Popover>
      {valid && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onChange('')}
          title="Clear"
          className="h-6 w-6 flex-shrink-0 text-[var(--color-subtle)] hover:text-[var(--color-text)]"
        >
          <XIcon className="size-3" />
        </Button>
      )}
    </div>
  )
}
