import { useEffect, useLayoutEffect, useState } from 'react'

type Theme = 'light' | 'dark'
const storageKey = 'stray-theme'
const isTheme = (value: string | null): value is Theme => value === 'light' || value === 'dark'

function initialPreference(): Theme | null {
  try {
    const saved = window.localStorage.getItem(storageKey)
    return isTheme(saved) ? saved : null
  } catch {
    return null
  }
}

export function ThemeToggle() {
  const [preference, setPreference] = useState(initialPreference)
  const [systemDark, setSystemDark] = useState(() => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false)
  const theme = preference ?? (systemDark ? 'dark' : 'light')

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    const system = window.matchMedia?.('(prefers-color-scheme: dark)')
    const syncSystem = () => setSystemDark(system?.matches ?? false)
    const syncStorage = (event: StorageEvent) => {
      if (event.key === storageKey || event.key === null) {
        setPreference(isTheme(event.newValue) ? event.newValue : null)
        syncSystem()
      }
    }
    const syncRestoredPage = (event: PageTransitionEvent) => {
      if (!event.persisted) return
      try {
        const saved = window.localStorage.getItem(storageKey)
        setPreference(isTheme(saved) ? saved : null)
      } catch {
        // Preserve the current manual choice when storage cannot be read.
      }
      syncSystem()
    }
    window.addEventListener('storage', syncStorage)
    window.addEventListener('pageshow', syncRestoredPage)
    system?.addEventListener?.('change', syncSystem)
    return () => {
      window.removeEventListener('storage', syncStorage)
      window.removeEventListener('pageshow', syncRestoredPage)
      system?.removeEventListener?.('change', syncSystem)
    }
  }, [])

  function toggleTheme() {
    const next = theme === 'light' ? 'dark' : 'light'
    setPreference(next)
    try {
      window.localStorage.setItem(storageKey, next)
    } catch {
      // The current page's choice remains usable without persistence.
    }
  }

  return <button className="theme-toggle" type="button" role="switch" aria-label="夜间模式"
    aria-checked={theme === 'dark'} title={theme === 'dark' ? '关闭夜间模式' : '开启夜间模式'} onClick={toggleTheme}>
    <span className="theme-toggle__track" aria-hidden="true"><span className="theme-toggle__thumb">
      <svg className="theme-icon theme-icon--sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
        <circle cx="12" cy="12" r="3.5" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" />
      </svg>
      <svg className="theme-icon theme-icon--moon" viewBox="0 0 24 24" fill="currentColor"><path d="M19.5 15.5a8 8 0 0 1-11-11 8.5 8.5 0 1 0 11 11Z" /></svg>
    </span></span>
  </button>
}
