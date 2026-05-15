const STORAGE_KEY = 'flowe_api_keys'

export interface ApiKeys {
  anthropic: string
  openai: string
  gemini: string
}

export function getApiKeys(): ApiKeys {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { anthropic: '', openai: '', gemini: '' }
    const parsed = JSON.parse(raw) as ApiKeys
    return { anthropic: parsed.anthropic ?? '', openai: parsed.openai ?? '', gemini: parsed.gemini ?? '' }
  } catch {
    return { anthropic: '', openai: '', gemini: '' }
  }
}

export function saveApiKeys(keys: ApiKeys): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(keys))
}

export function isAnthropicModel(model: string): boolean {
  return model.startsWith('claude')
}

export function isGeminiModel(model: string): boolean {
  return model.startsWith('gemini')
}
