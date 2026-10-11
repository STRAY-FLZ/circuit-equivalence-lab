import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import App from './App'
import { EquivalenceSummary } from './GuidedLesson'
import * as transforms from './transforms'
import { labExamples } from './learning-examples'
import { createCircuitNetwork, resistanceOhms } from './domain'

function start(id = 'series') {
  render(<App />)
  fireEvent.change(screen.getByLabelText('01 / 选择电路'), { target: { value: id } })
  const candidate = within(screen.getByRole('group', { name: '可用变换候选' })).getAllByRole('button')[0]!
  fireEvent.click(candidate)
  fireEvent.click(screen.getByRole('button', { name: '开始分步学习' }))
}
const next = () => fireEvent.click(screen.getByRole('button', { name: '下一步' }))

describe('M5 learning mode integration', () => {
  it.each(['series', 'parallel', 'delta3', 'star'])('completes all five %s lesson stages with real results', id => {
    start(id)
    expect(screen.getByRole('heading', { name: /第 1 \/ 5 步/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '上一步' })).toBeDisabled()
    expect(screen.queryByRole('group', { name: '变换后电路图' })).toBeNull()
    next()
    expect(screen.getByLabelText('变换公式').querySelector('math')?.isConnected).toBe(true)
    expect(document.querySelector('math')?.namespaceURI).toBe('http://www.w3.org/1998/Math/MathML')
    next()
    expect(screen.getByLabelText('数值代入')).toBeInTheDocument()
    next()
    expect(screen.getByRole('group', { name: '变换后电路图' })).toBeInTheDocument()
    next()
    expect(screen.getByRole('status')).toHaveTextContent('已验证')
    expect(screen.getByRole('button', { name: '下一步' })).toBeDisabled()
    expect(screen.getByRole('table', { name: '端口等效电阻对照' })).toBeInTheDocument()
  })

  it('revisits/restarts/exits without recomputing transformations or numerical evidence', () => {
    const apply = vi.spyOn(transforms, 'applyTransformation')
    const verify = vi.spyOn(transforms, 'verifyTerminalEquivalence')
    const source = labExamples.find(e => e.id === 'delta3')!.network
    const original = JSON.stringify(source)
    start('delta3')
    next(); next(); next(); next()
    fireEvent.click(screen.getByRole('button', { name: '上一步' }))
    expect(screen.getByRole('heading', { name: /第 4 \/ 5 步/ })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '重新开始课程' }))
    expect(screen.getByRole('heading', { name: /第 1 \/ 5 步/ })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '退出学习模式' }))
    expect(screen.queryByRole('region', { name: '分步学习' })).toBeNull()
    expect(screen.getByRole('group', { name: '变换后电路图' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '开始分步学习' }))
    expect(apply).toHaveBeenCalledTimes(1)
    expect(verify).toHaveBeenCalledTimes(1)
    expect(JSON.stringify(source)).toBe(original)
  })

  it('reuses an existing M4 preview when starting learning', () => {
    const apply = vi.spyOn(transforms, 'applyTransformation')
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /串联化简/ }))
    fireEvent.click(screen.getByRole('button', { name: '预览等效变换' }))
    fireEvent.click(screen.getByRole('button', { name: '开始分步学习' }))
    expect(apply).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('heading', { name: /第 1 \/ 5 步/ })).toBeInTheDocument()
  })

  it('shows exact mapping rows and requested symmetric delta expression', () => {
    start('delta3'); next(); next()
    const substitutions = screen.getByLabelText('数值代入')
    expect(substitutions).toHaveTextContent('(3 × 3) / (3 + 3 + 3) = 1 Ω')
    const mapping = screen.getByRole('table', { name: '变量对应（输入和结果均来自元件记录）' })
    expect(mapping).toHaveTextContent('R1')
    expect(mapping).toHaveTextContent('m3:2')
  })

  it('changes SVG highlighting for structure and final boundary verification', () => {
    start('delta3')
    const before = screen.getByRole('group', { name: '原始电路图' })
    expect(before.querySelectorAll('g[data-state="selected"]')).toHaveLength(3)
    next(); next(); next()
    const after = screen.getByRole('group', { name: '变换后电路图' })
    expect(after.querySelectorAll('[data-node-state="created"]')).toHaveLength(1)
    expect(after.querySelectorAll('[data-state="replacement"]')).toHaveLength(3)
    expect(after.getAttribute('viewBox')).toBe(before.getAttribute('viewBox'))
    next()
    expect(before.querySelectorAll('g[data-state="selected"]')).toHaveLength(0)
    expect(screen.getByText('已标记保留边界')).toBeInTheDocument()
    expect(after.querySelectorAll('[data-node-state="created"]')).toHaveLength(0)
    expect(after.querySelectorAll('[data-node-state="boundary"]')).toHaveLength(3)
  })

  it('marks the removed star center only on the original drawing at step four', () => {
    start('star'); next(); next(); next()
    expect(screen.getByRole('group', { name: '原始电路图' }).querySelector('[data-point-id="N"]')).toHaveAttribute('data-node-state', 'removed')
    expect(screen.getByRole('group', { name: '变换后电路图' }).querySelector('[data-point-id="N"]')).toBeNull()
  })

  it('initializes a new lesson when switching examples and leaves mode for unavailable candidates', () => {
    start('delta3'); next(); next()
    fireEvent.change(screen.getByLabelText('01 / 选择电路'), { target: { value: 'parallel' } })
    expect(screen.getByRole('heading', { name: /第 1 \/ 5 步/ })).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: '分步学习' })).getByText('分步学习 / 并联化简')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('01 / 选择电路'), { target: { value: 'bypass' } })
    expect(screen.queryByRole('region', { name: '分步学习' })).toBeNull()
    expect(screen.getByRole('button', { name: '开始分步学习' })).toBeDisabled()
  })

  it('initializes candidate changes with new metadata and progression', () => {
    start('bridge'); next(); next()
    const candidates = within(screen.getByRole('group', { name: '可用变换候选' })).getAllByRole('button')
    fireEvent.click(candidates[1]!)
    expect(screen.getByRole('heading', { name: /第 1 \/ 5 步/ })).toBeInTheDocument()
    const selected = screen.getByRole('group', { name: '原始电路图' }).querySelectorAll('g[data-state="selected"]')
    expect([...selected].map(e => e.getAttribute('data-element-id'))).toEqual(['R2', 'R4', 'R5'])
  })

  it('handles a rejected lesson application with no fictional lesson', () => {
    vi.spyOn(transforms, 'applyTransformation').mockReturnValueOnce({ kind: 'not-applicable', reason: 'stale' })
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /串联化简/ }))
    fireEvent.click(screen.getByRole('button', { name: '开始分步学习' }))
    expect(screen.getByRole('alert')).toHaveTextContent('变换未成功')
    expect(screen.queryByRole('region', { name: '分步学习' })).toBeNull()
  })
})

describe('M5 verification presentation from actual M3 evidence', () => {
  const source = labExamples.find(e => e.id === 'series')!.network
  it('shows a real verified finite comparison', () => {
    const result = transforms.applyTransformation({ network: source, type: 'series', elementIds: ['R1', 'R2'] })
    if (result.kind !== 'applied') throw new Error('Apply failed')
    render(<EquivalenceSummary source={source} result={transforms.verifyTerminalEquivalence(source, result.network)} />)
    expect(screen.getByRole('status')).toHaveTextContent('已验证')
    expect(screen.getByRole('table')).toHaveTextContent('320 Ω')
  })
  it('shows an actual verified discrepancy as failure', () => {
    const changed = createCircuitNetwork({ ...source, elements: source.elements.map(e => e.kind === 'resistor' ? { ...e, resistance: resistanceOhms(10) } : e) })
    render(<EquivalenceSummary source={source} result={transforms.verifyTerminalEquivalence(source, changed)} />)
    expect(screen.getByRole('status')).toHaveTextContent('验证失败')
    expect(screen.getByRole('table')).toHaveTextContent('20 Ω')
  })
  it('shows missing terminal pairs as inconclusive', () => {
    const empty = createCircuitNetwork({ ...source, terminals: [] })
    render(<EquivalenceSummary source={empty} result={transforms.verifyTerminalEquivalence(empty, empty)} />)
    expect(screen.getByRole('status')).toHaveTextContent('无法确定')
    expect(screen.queryByRole('table')).toBeNull()
  })
  it('does not classify actual numerical solver errors as success', () => {
    const star = labExamples.find(e => e.id === 'star')!.network
    const extreme = createCircuitNetwork({ ...star, elements: star.elements.map((e, i) => e.kind === 'resistor' ? { ...e, resistance: resistanceOhms(i === 0 ? 1e-20 : 1e20) } : e) })
    const evidence = transforms.verifyTerminalEquivalence(extreme, extreme)
    expect(evidence.kind).toBe('inconclusive')
    render(<EquivalenceSummary source={extreme} result={evidence} />)
    expect(screen.getByRole('status')).toHaveTextContent('无法确定')
    expect(screen.getByRole('table')).toHaveTextContent('无法求解')
  })
})
