import { useWorkflowStore } from '@/store/workflowStore'

export function SaveIndicator() {
  const saveStatus = useWorkflowStore((s) => s.saveStatus)

  if (saveStatus === 'idle') return null

  return (
    <span
      className={`flex items-center gap-1 text-[10px] transition-opacity duration-300 ${
        saveStatus === 'unsaved' ? 'text-[var(--color-muted)]' :
        saveStatus === 'saving'  ? 'text-[var(--color-muted)]' :
        'text-emerald-500'
      }`}
    >
      {saveStatus === 'saving' && (
        <>
          <svg width="9" height="9" viewBox="0 0 12 12" fill="none" className="animate-spin flex-shrink-0">
            <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.3"/>
            <path d="M10.5 6A4.5 4.5 0 0 0 6 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          Saving
        </>
      )}
      {saveStatus === 'saved' && (
        <>
          <svg width="9" height="9" viewBox="0 0 10 10" fill="none" className="flex-shrink-0">
            <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Saved
        </>
      )}
      {saveStatus === 'unsaved' && (
        <>
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400 flex-shrink-0" />
          Unsaved
        </>
      )}
    </span>
  )
}
