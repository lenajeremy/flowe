const STORAGE_KEY = 'flowe_api_keys'

export interface ApiKeys {
  anthropic: string
  openai: string
}

export function getApiKeys(): ApiKeys {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { anthropic: '', openai: '' }
    return JSON.parse(raw) as ApiKeys
  } catch {
    return { anthropic: '', openai: '' }
  }
}

export function saveApiKeys(keys: ApiKeys): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(keys))
}

export function isAnthropicModel(model: string): boolean {
  return model.startsWith('claude')
}
