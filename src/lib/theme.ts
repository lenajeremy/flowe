import { useSyncExternalStore } from 'react'

// Theme system: 'system' follows the OS and updates live; explicit choices
// persist. Applied as data-theme on <html>, which the token layer in
// index.css keys off.

export type ThemePref = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

const STORAGE_KEY = 'workflow-ai-theme'
const media = window.matchMedia('(prefers-color-scheme: dark)')
const listeners = new Set<() => void>()

export function getThemePref(): ThemePref {
  const saved = localStorage.getItem(STORAGE_KEY)
  return saved === 'light' || saved === 'dark' ? saved : 'system'
}

export function resolveTheme(pref: ThemePref = getThemePref()): ResolvedTheme {
  if (pref === 'system') return media.matches ? 'dark' : 'light'
  return pref
}

function apply() {
  document.documentElement.dataset.theme = resolveTheme()
}

export function setThemePref(pref: ThemePref) {
  if (pref === 'system') localStorage.removeItem(STORAGE_KEY)
  else localStorage.setItem(STORAGE_KEY, pref)

  // Ease the brightness jump instead of hard-cutting (index.css)
  const root = document.documentElement
  root.classList.add('theme-switching')
  apply()
  window.setTimeout(() => root.classList.remove('theme-switching'), 260)

  listeners.forEach((l) => l())
}

export function initTheme() {
  apply()
  media.addEventListener('change', () => {
    if (getThemePref() === 'system') {
      apply()
      listeners.forEach((l) => l())
    }
  })
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

/** Reactive hook: re-renders on toggle and on system-preference changes. */
export function useTheme(): { pref: ThemePref; resolved: ResolvedTheme; setPref: (p: ThemePref) => void } {
  const pref = useSyncExternalStore(subscribe, getThemePref)
  const resolved = useSyncExternalStore(subscribe, () => resolveTheme())
  return { pref, resolved, setPref: setThemePref }
}
