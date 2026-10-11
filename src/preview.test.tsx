import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import App from './App'
import { applyTransformation, discoverTransformations } from './transforms'
import { circuitExamples } from './visualization'
import * as transforms from './transforms'
import type { TransformResult } from './transforms'

describe('M4 preview integration', () => {
  it.each(['series', 'parallel', 'delta', 'star', 'bridge', 'bypass', 'residual', 'crossing'])('offers exactly M3 candidates for %s', id => {
    render(<App />)
    fireEvent.change(screen.getByLabelText('01 / 选择电路'), { target: { value: id } })
    const example = circuitExamples.find(e => e.id === id)!
    const discovery = discoverTransformations(example.network)
    if (discovery.kind !== 'candidates') throw new Error('Discovery failed')
    const picker = screen.getByRole('group', { name: '可用变换候选' })
    expect(within(picker).queryAllByRole('button')).toHaveLength(discovery.candidates.length)
    for (const candidate of discovery.candidates) expect(within(picker).getByText(candidate.elementIds.join(' + '))).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '预览等效变换' })).toBeDisabled()
  })

  it.each([{ id: 'series', name: '串联化简' }, { id: 'parallel', name: '并联化简' }, { id: 'delta', name: 'Δ → Y' }, { id: 'star', name: 'Y → Δ' }])('previews actual $id results and resets', ({ id, name }) => {
    const { container } = render(<App />)
    fireEvent.change(screen.getByLabelText('01 / 选择电路'), { target: { value: id } })
    const example = circuitExamples.find(e => e.id === id)!
    const snapshot = JSON.stringify(example.network)
    const discovery = discoverTransformations(example.network)
    if (discovery.kind !== 'candidates') throw new Error('Discovery failed')
    const candidate = discovery.candidates[0]!
    fireEvent.click(screen.getByRole('button', { name: new RegExp(name.replace('+', '\\+')) }))
    expect(container.querySelectorAll('[data-state="selected"]')).toHaveLength(candidate.elementIds.length)
    expect(container.querySelectorAll('svg')).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: '预览等效变换' }))
    const expected = applyTransformation({ network: example.network, type: candidate.type, elementIds: candidate.elementIds })
    if (expected.kind !== 'applied') throw new Error('Transformation failed')
    expect(container.querySelectorAll('svg')).toHaveLength(2)
    expect(container.querySelectorAll('[data-state="replacement"]')).toHaveLength(expected.metadata.replacements.length)
    const after = screen.getByRole('group', { name: '变换后电路图' })
    for (const element of expected.metadata.replacements) expect(within(after).getByRole('button', { name: `${element.id} · ${Number(element.resistance.toPrecision(6))} Ω` })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('端口等效验证通过')
    expect(JSON.stringify(example.network)).toBe(snapshot)
    fireEvent.click(screen.getByRole('button', { name: '重置预览' }))
    expect(container.querySelectorAll('svg')).toHaveLength(1)
    expect(container.querySelectorAll('[data-state="selected"]')).toHaveLength(0)
  })

  it('changing examples clears stale candidates and preview', () => {
    const { container } = render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /串联化简/ }))
    fireEvent.click(screen.getByRole('button', { name: '预览等效变换' }))
    fireEvent.change(screen.getByLabelText('01 / 选择电路'), { target: { value: 'bypass' } })
    expect(screen.getByRole('button', { name: '预览等效变换' })).toBeDisabled()
    expect(screen.getByText('当前电路没有可用的变换候选。')).toBeInTheDocument()
    expect(container.querySelectorAll('svg')).toHaveLength(1)
  })

  it('changing candidate clears the previous preview and keeps unaffected elements', () => {
    const { container } = render(<App />)
    fireEvent.change(screen.getByLabelText('01 / 选择电路'), { target: { value: 'bridge' } })
    const buttons = within(screen.getByRole('group', { name: '可用变换候选' })).getAllByRole('button')
    fireEvent.click(buttons[0]!)
    fireEvent.click(screen.getByRole('button', { name: '预览等效变换' }))
    expect(container.querySelectorAll('[data-state="unaffected"]')).toHaveLength(4)
    fireEvent.click(buttons[1]!)
    expect(container.querySelectorAll('svg')).toHaveLength(1)
    expect(buttons[1]).toHaveAttribute('aria-pressed', 'true')
  })

  it.each([
    { result: { kind: 'not-applicable', reason: 'stale selection' }, message: '此候选已不适用' },
    { result: { kind: 'error', code: 'numerical-failure', message: 'out of range' }, message: '阻值超出可表示范围' },
    { result: { kind: 'error', code: 'invalid-input', message: 'invalid graph' }, message: '网络数据无效' },
  ] satisfies readonly { result: TransformResult; message: string }[])('shows $message without a fabricated after diagram', ({ result, message }) => {
    vi.spyOn(transforms, 'applyTransformation').mockReturnValueOnce(result)
    const { container } = render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /串联化简/ }))
    fireEvent.click(screen.getByRole('button', { name: '预览等效变换' }))
    expect(screen.getByRole('status')).toHaveTextContent(message)
    expect(container.querySelectorAll('svg')).toHaveLength(1)
  })

  it('shows discovery failure and disables preview', () => {
    vi.spyOn(transforms, 'discoverTransformations').mockReturnValue({ kind: 'error', code: 'invalid-input', message: 'invalid graph' })
    render(<App />)
    expect(screen.getByRole('alert')).toHaveTextContent('候选识别失败')
    expect(screen.getByRole('button', { name: '预览等效变换' })).toBeDisabled()
  })

  it('uses matching viewBoxes even when retained residual components change drawing extent', () => {
    render(<App />)
    fireEvent.change(screen.getByLabelText('01 / 选择电路'), { target: { value: 'residual' } })
    fireEvent.click(screen.getByRole('button', { name: /串联化简/ }))
    fireEvent.click(screen.getByRole('button', { name: '预览等效变换' }))
    expect(screen.getByRole('group', { name: '原始电路图' }).getAttribute('viewBox')).toBe(screen.getByRole('group', { name: '变换后电路图' }).getAttribute('viewBox'))
  })
})
