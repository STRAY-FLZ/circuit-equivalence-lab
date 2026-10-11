import { fireEvent, render, screen } from '@testing-library/react'
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
    fireEvent.click(screen.getByRole('button', { name: '切换为深色主题' }))
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
    expect(window.localStorage.getItem('circuit-lab-theme')).toBe('dark')
    expect(screen.getByRole('button', { name: '切换为浅色主题' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: '切换为浅色主题' }))
    expect(document.documentElement).toHaveAttribute('data-theme', 'light')
  })

  it('没有保存设置时采用系统深色偏好', () => {
    mockSystemTheme(true)
    render(<App />)
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
  })

  it('已保存的主题优先于系统偏好', () => {
    mockSystemTheme(true)
    window.localStorage.setItem('circuit-lab-theme', 'light')
    render(<App />)
    expect(document.documentElement).toHaveAttribute('data-theme', 'light')
  })

  it('忽略无效的持久化主题', () => {
    window.localStorage.setItem('circuit-lab-theme', 'invalid')
    render(<App />)
    expect(document.documentElement).toHaveAttribute('data-theme', 'light')
  })

  it('浏览器拒绝存储时仍可启动与切换主题', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('disabled') })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('disabled') })
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '切换为深色主题' }))
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
  })
})
