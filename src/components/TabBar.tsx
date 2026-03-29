import { useWorkflowStore } from '@/store/workflowStore'
import { useShallow } from 'zustand/react/shallow'

export function TabBar() {
  const { tabs, activeTabId, executionState, switchTab, closeTab, addTab } = useWorkflowStore(
    useShallow((s) => ({
      tabs: s.tabs,
      activeTabId: s.activeTabId,
      executionState: s.executionState,
      switchTab: s.switchTab,
      closeTab: s.closeTab,
      addTab: s.addTab,
    })),
  )

  const isRunning = executionState === 'running'

  return (
    <div className="flex items-end gap-0 px-3 bg-[var(--color-canvas)] border-b border-[var(--color-border)] overflow-x-auto flex-shrink-0"
      style={{ minHeight: '34px' }}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId
        return (
          <div
            key={tab.id}
            className={`
              group relative flex items-center gap-2 px-3 py-1.5 text-[11px] font-medium
              border-t border-x rounded-t cursor-pointer select-none
              transition-colors whitespace-nowrap max-w-[160px]
              ${isActive
                ? 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text)] -mb-px z-10'
                : 'bg-transparent border-transparent text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface2)]'
              }
              ${isRunning && !isActive ? 'opacity-50 cursor-not-allowed' : ''}
            `}
            onClick={() => !isRunning && switchTab(tab.id)}
            title={tab.workflowName}
          >
            {/* Active indicator dot */}
            {isActive && (
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] flex-shrink-0" />
            )}

            {/* Name — truncated */}
            <span className="truncate">{tab.workflowName}</span>

            {/* Close button — only show when more than 1 tab */}
            {tabs.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  closeTab(tab.id)
                }}
                disabled={isRunning && isActive}
                className={`
                  flex-shrink-0 w-3.5 h-3.5 rounded flex items-center justify-center
                  opacity-0 group-hover:opacity-100 transition-opacity
                  hover:bg-[var(--color-border2)] text-[var(--color-muted)] hover:text-[var(--color-text)]
                  ${isActive ? 'opacity-60' : ''}
                `}
                aria-label={`Close ${tab.workflowName}`}
              >
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                  <path d="M1 1l6 6M7 1L1 7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
              </button>
            )}
          </div>
        )
      })}

      {/* New tab button */}
      <button
        onClick={() => addTab()}
        disabled={isRunning}
        title="New workflow tab"
        className="flex items-center justify-center w-7 h-7 mb-0.5 ml-1 rounded text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface2)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
      >
        <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
          <path d="M5.5 1v9M1 5.5h9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        </svg>
      </button>
    </div>
  )
}
