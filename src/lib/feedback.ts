import { API } from '@/lib/config'
import { apiFetch } from '@/lib/http'

interface FeedbackPayload {
  screenshot: Blob
  message: string
  page: string
  viewport: string
}

export async function submitFeedback(payload: FeedbackPayload): Promise<void> {
  const body = new FormData()
  body.set('screenshot', payload.screenshot, 'fernary-feedback.png')
  body.set('message', payload.message)
  body.set('page', payload.page)
  body.set('viewport', payload.viewport)

  const response = await apiFetch(`${API}/api/feedback`, { method: 'POST', body })
  if (response.ok) return

  const data = (await response.json().catch(() => ({}))) as { error?: string }
  throw new Error(data.error ?? `Could not send feedback (${response.status})`)
}
