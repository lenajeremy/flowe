import { useState, useEffect } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { NodeBase2 } from '@/components/ui/NodeBase2'
import { NODE_ACCENT_HEX } from '@/lib/nodeColors'
import { NODE_ICONS } from '@/lib/nodeIcons'
import type { FlowNode } from '@/types/workflow'
import { useWorkflowStore } from '@/store/workflowStore'
import { useShallow } from 'zustand/react/shallow'
import { API } from '@/lib/config'

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const ordinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0])
}

interface Schedule {
  frequency: string
  run_time: string
  day_of_week: number
  day_of_month: number
  repeat: boolean
  next_run_at?: string
}

function utcToLocal(utcHHMM: string): string {
  const [h, m] = utcHHMM.split(':').map(Number)
  const d = new Date()
  d.setUTCHours(h, m, 0, 0)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function formatSchedule(s: Schedule) {
  const time = s.run_time ? utcToLocal(s.run_time) : '00:00'
  switch (s.frequency) {
    case 'hourly':  return `Every hour`
    case 'daily':   return `Daily at ${time}`
    case 'weekly':  return `${WEEKDAYS[s.day_of_week] ?? 'Weekly'} at ${time}`
    case 'monthly': return `${ordinal(s.day_of_month)} of month · ${time}`
    default:        return s.frequency
  }
}

export function ScheduledTriggerNode({ data, selected }: NodeProps<FlowNode>) {
  const [fetched, setFetched] = useState<Schedule | null>(null)

  const { tabs, activeTabId } = useWorkflowStore(
    useShallow((s) => ({ tabs: s.tabs, activeTabId: s.activeTabId })),
  )
  const dbId = tabs.find((t) => t.id === activeTabId)?.dbId

  // Fetch once on mount so the node is populated before any sidebar interaction
  useEffect(() => {
    if (!dbId) return
    fetch(`${API}/api/workflows/${dbId}/schedule`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json() })
      .then((s: Schedule) => setFetched(s))
      .catch(() => {})
  }, [dbId])

  // After the sidebar saves, node data fields are updated directly — prefer those
  const fromData: Schedule | null = data.scheduleFrequency
    ? {
        frequency:    data.scheduleFrequency as string,
        run_time:     (data.scheduleRunTime as string) ?? '00:00',
        day_of_week:  (data.scheduleDayOfWeek as number) ?? 0,
        day_of_month: (data.scheduleDayOfMonth as number) ?? 1,
        repeat:       (data.scheduleRepeat as boolean) ?? true,
        next_run_at:  data.scheduleNextRunAt as string | undefined,
      }
    : null

  const sched = fromData ?? fetched

  return (
    <NodeBase2
      accentHex={NODE_ACCENT_HEX.scheduledTrigger}
      icon={NODE_ICONS.scheduledTrigger}
      label={data.label}
      isSelected={selected ?? false}
      executionStatus={data.executionStatus}
    >
      <div className="flex flex-col gap-1.5 min-w-[190px]">
        {sched ? (
          <>
            <div className="text-[11px] font-medium leading-snug text-[#ff8ce8]">
              {formatSchedule(sched)}
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold tracking-wide ${
                sched.repeat
                  ? 'bg-[#ff8ce8]/15 text-[#ff8ce8]'
                  : 'bg-white/10 text-[var(--color-muted)]'
              }`}>
                {sched.repeat ? 'Repeats' : 'Once'}
              </span>
            </div>
            {sched.next_run_at && (
              <div className="text-[9px] text-[var(--color-muted)]">
                Next: {new Date(sched.next_run_at).toLocaleString()}
              </div>
            )}
          </>
        ) : (
          <div className="text-[10px] text-[var(--color-muted)] italic">
            {dbId ? 'No schedule set' : 'Save workflow first'}
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Right} />
    </NodeBase2>
  )
}
