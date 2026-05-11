import type { ExecutionEvent } from '@/types/workflow'

/**
 * Reads an SSE stream from a ReadableStreamDefaultReader and calls `onEvent`
 * for each parsed ExecutionEvent. Resolves when the stream closes.
 */
export async function consumeRunStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onEvent: (event: ExecutionEvent) => void,
): Promise<void> {
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const raw = line.slice(6).trim()
      if (!raw) continue
      try {
        onEvent(JSON.parse(raw) as ExecutionEvent)
      } catch {
        // ignore malformed SSE frames
      }
    }
  }
}
