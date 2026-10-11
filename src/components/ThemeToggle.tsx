import { useEffect, useState } from 'react'

type Theme = 'light' | 'dark'
const storageKey = 'circuit-lab-theme'

function initialTheme(): Theme {
  try {
    const saved = window.localStorage.getItem(storageKey)
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    // 存储被浏览器禁用时，仍可使用系统默认主题与手动切换。
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(initialTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      window.localStorage.setItem(storageKey, theme)
    } catch {
      // 当前页面的主题仍然有效；持久化失败不阻断页面启动。
    }
  }, [theme])

  return (
    <button
      className="theme-toggle"
      type="button"
      aria-label={theme === 'light' ? '切换为深色主题' : '切换为浅色主题'}
      aria-pressed={theme === 'dark'}
      onClick={() => setTheme((current) => current === 'light' ? 'dark' : 'light')}
    >
      <span className="theme-symbol" aria-hidden="true">{theme === 'light' ? '◐' : '◑'}</span>
      {theme === 'light' ? '深色主题' : '浅色主题'}
    </button>
  )
}
