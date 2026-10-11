// @vitest-environment node
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { describe, expect, it, vi } from 'vitest'

const script = readFileSync(new URL('../public/theme-init.js', import.meta.url), 'utf8')
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')

function initialize(saved: string | null, dark: boolean, restricted = false) {
  const document = { documentElement: { dataset: {} as Record<string, string> } }
  const setItem = vi.fn()
  const getItem = vi.fn((key: string) => {
    expect(key).toBe('stray-theme')
    if (restricted) throw new Error('Storage unavailable')
    return saved
  })
  runInNewContext(script, { document, window: { localStorage: { getItem, setItem }, matchMedia: () => ({ matches: dark }) } })
  expect(setItem).not.toHaveBeenCalled()
  return document.documentElement.dataset.theme
}

describe('M7 pre-paint theme initialization', () => {
  it('loads the initializer in the head before the React module using the Vite base', () => {
    expect(html.indexOf('src="%BASE_URL%theme-init.js"')).toBeLessThan(html.indexOf('</head>'))
    expect(html.indexOf('src="%BASE_URL%theme-init.js"')).toBeLessThan(html.indexOf('src="/src/main.tsx"'))
  })
  it('uses a shared manual preference before React mounts', () => {
    expect(initialize('dark', false)).toBe('dark')
    expect(initialize('light', true)).toBe('light')
  })
  it('uses the system default for absent or invalid preferences', () => {
    expect(initialize(null, true)).toBe('dark')
    expect(initialize('invalid', false)).toBe('light')
  })
  it('still initializes when storage is restricted', () => {
    expect(initialize(null, true, true)).toBe('dark')
  })
})
