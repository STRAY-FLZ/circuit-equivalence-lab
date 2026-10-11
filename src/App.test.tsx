import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

function mockSystemTheme(dark: boolean): void {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn().mockReturnValue({ matches: dark }),
  })
}

beforeEach(() => {
  window.localStorage.clear()
  delete document.documentElement.dataset.theme
  mockSystemTheme(false)
})

describe('基础页面启动', () => {
  it('渲染项目名称、M4 电路图以及真实主题操作', () => {
    render(<App />)
    expect(screen.getByRole('heading', { level: 1, name: '电路等效变换实验室' })).toBeInTheDocument()
    expect(screen.getByText(/从连接关系出发/)).toBeInTheDocument()
    expect(screen.getByRole('group', { name: '原始电路图' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '预览等效变换' })).toBeDisabled()
  })

  it('支持浅色与深色切换，并持久化用户选择', () => {
    render(<App />)
    expect(document.documentElement).toHaveAttribute('data-theme', 'light')
    fireEvent.click(screen.getByRole('switch', { name: '夜间模式' }))
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
    expect(window.localStorage.getItem('stray-theme')).toBe('dark')
    expect(screen.getByRole('switch', { name: '夜间模式' })).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(screen.getByRole('switch', { name: '夜间模式' }))
    expect(document.documentElement).toHaveAttribute('data-theme', 'light')
  })

  it('没有保存设置时采用系统深色偏好', () => {
    mockSystemTheme(true)
    render(<App />)
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
  })

  it('已保存的主题优先于系统偏好', () => {
    mockSystemTheme(true)
    window.localStorage.setItem('stray-theme', 'light')
    render(<App />)
    expect(document.documentElement).toHaveAttribute('data-theme', 'light')
  })

  it('忽略无效的持久化主题', () => {
    window.localStorage.setItem('stray-theme', 'invalid')
    render(<App />)
    expect(document.documentElement).toHaveAttribute('data-theme', 'light')
  })

  it('浏览器拒绝存储时仍可启动与切换主题', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('disabled') })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('disabled') })
    render(<App />)
    fireEvent.click(screen.getByRole('switch', { name: '夜间模式' }))
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
  })
})

describe('M7 header and shared theme', () => {
  it('links the brand and the return control to the absolute personal homepage', () => {
    render(<App />)
    const homepage = 'https://stray-flz.github.io/stray-articles/'
    expect(screen.getByRole('link', { name: 'Stray，返回首页' })).toHaveAttribute('href', homepage)
    const navigation = screen.getByRole('navigation', { name: '站点导航' })
    const toggle = within(navigation).getByRole('switch', { name: '夜间模式' })
    const home = within(navigation).getByRole('link', { name: '返回首页' })
    expect(home).toHaveAttribute('href', homepage)
    expect(toggle.nextElementSibling).toHaveAttribute('aria-hidden', 'true')
    expect(toggle.nextElementSibling?.nextElementSibling).toBe(home)
  })

  it('synchronizes another page preference and storage clearing without echo writes', () => {
    render(<App />)
    expect(window.localStorage.getItem('stray-theme')).toBeNull()
    const write = vi.spyOn(Storage.prototype, 'setItem')
    fireEvent(window, new StorageEvent('storage', { key: 'unrelated', newValue: 'dark' }))
    expect(document.documentElement).toHaveAttribute('data-theme', 'light')
    fireEvent(window, new StorageEvent('storage', { key: 'stray-theme', newValue: 'dark' }))
    expect(screen.getByRole('switch', { name: '夜间模式' })).toHaveAttribute('aria-checked', 'true')
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
    fireEvent(window, new StorageEvent('storage', { key: null, newValue: null }))
    expect(document.documentElement).toHaveAttribute('data-theme', 'light')
    expect(write).not.toHaveBeenCalled()
  })

  it('follows system changes only without a manual preference', () => {
    const events = new EventTarget()
    const system = { matches: false, addEventListener: events.addEventListener.bind(events), removeEventListener: events.removeEventListener.bind(events) }
    Object.defineProperty(window, 'matchMedia', { configurable: true, value: () => system })
    render(<App />)
    act(() => { system.matches = true; events.dispatchEvent(new Event('change')) })
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
    expect(window.localStorage.getItem('stray-theme')).toBeNull()
    fireEvent.click(screen.getByRole('switch', { name: '夜间模式' }))
    act(() => { system.matches = false; events.dispatchEvent(new Event('change')) })
    act(() => { system.matches = true; events.dispatchEvent(new Event('change')) })
    expect(document.documentElement).toHaveAttribute('data-theme', 'light')
    fireEvent(window, new StorageEvent('storage', { key: 'stray-theme', newValue: null }))
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
  })

  it('refreshes the shared preference when restored from the back-forward cache', () => {
    render(<App />)
    window.localStorage.setItem('stray-theme', 'dark')
    const restored = new Event('pageshow')
    Object.defineProperty(restored, 'persisted', { value: true })
    fireEvent(window, restored)
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
  })
})
