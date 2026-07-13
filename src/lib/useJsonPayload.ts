import { useState } from 'react'

// JSON payload state with inline validation — shared by the webhook-simulation
// modal and the public trigger page. Empty input is valid (treated as {}).
export function useJsonPayload(initial = '{}') {
  const [value, setValue] = useState(initial)
  const [error, setError] = useState<string | null>(null)

  function update(next: string) {
    setValue(next)
    if (next.trim() === '') {
      setError(null)
      return
    }
    try {
      JSON.parse(next)
      setError(null)
    } catch {
      setError('Invalid JSON')
    }
  }

  return { value, error, update, setValue }
}
