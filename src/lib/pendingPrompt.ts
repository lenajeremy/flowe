// Handoff channel between the Build page and the editor's ChatPanel: the
// Build page stores the user's prompt under the freshly created workflow's
// id, navigates to the editor, and ChatPanel consumes it exactly once to
// auto-send the first AI-builder message. sessionStorage so a stale prompt
// never survives the tab.

const key = (workflowId: string) => `flowe:pending-prompt:${workflowId}`

export function setPendingPrompt(workflowId: string, prompt: string): void {
  try {
    sessionStorage.setItem(key(workflowId), prompt)
  } catch {
    /* storage disabled — the user just lands on a blank chat */
  }
}

export function consumePendingPrompt(workflowId: string): string | null {
  try {
    const v = sessionStorage.getItem(key(workflowId))
    if (v) sessionStorage.removeItem(key(workflowId))
    return v
  } catch {
    return null
  }
}
