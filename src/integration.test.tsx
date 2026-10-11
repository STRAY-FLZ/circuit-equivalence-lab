import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import App from './App'
import { createCircuitNetwork, resistanceOhms } from './domain'
import { labExamples } from './learning-examples'
import * as transforms from './transforms'

const source = labExamples.find(example => example.id === 'series')!.network
const operation = transforms.applyTransformation({ network: source, type: 'series', elementIds: ['R1', 'R2'] })
if (operation.kind !== 'applied') throw new Error('Series fixture must apply')
const changed = createCircuitNetwork({ ...source, elements: source.elements.map(element => element.kind === 'resistor'
  ? { ...element, resistance: resistanceOhms(10) } : element) })
const noTerminals = createCircuitNetwork({ ...source, terminals: [] })
// Existing examples legitimately verify. Supply real M3 outcomes at the verification
// boundary to exercise the complete preview -> cached lesson -> new selection path.
const cases = [
  { evidence: transforms.verifyTerminalEquivalence(source, operation.network), preview: '端口等效验证通过', lesson: '已验证', pair: '320 Ω' },
  { evidence: transforms.verifyTerminalEquivalence(source, changed), preview: '端口验证发现差异', lesson: '验证失败', pair: '20 Ω' },
  { evidence: transforms.verifyTerminalEquivalence(noTerminals, noTerminals), preview: '端口验证无法确定', lesson: '无法确定', pair: null },
] as const

describe('M6 preview/lesson verification handoff', () => {
  it.each(cases)('preserves $evidence.kind feedback through cached learning and clears it on a new example', ({ evidence, preview, lesson, pair }) => {
    const verify = vi.spyOn(transforms, 'verifyTerminalEquivalence').mockReturnValueOnce(evidence)
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /串联化简/ }))
    fireEvent.click(screen.getByRole('button', { name: '预览等效变换' }))
    expect(screen.getByRole('status')).toHaveTextContent(preview)
    fireEvent.click(screen.getByRole('button', { name: '开始分步学习' }))
    for (let index = 0; index < 4; index++) fireEvent.click(screen.getByRole('button', { name: '下一步' }))
    expect(screen.getByRole('status')).toHaveTextContent(lesson)
    const table = screen.queryByRole('table', { name: '端口等效电阻对照' })
    if (pair) {
      expect(table).toHaveTextContent('A ↔ B')
      expect(table).toHaveTextContent(pair)
    } else expect(table).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '退出学习模式' }))
    expect(screen.getByRole('status')).toHaveTextContent(preview)
    expect(verify).toHaveBeenCalledTimes(1)
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'parallel' } })
    expect(screen.getByRole('status')).toHaveTextContent('尚未应用变换')
    expect(screen.queryByRole('table', { name: '端口等效电阻对照' })).toBeNull()
    expect(screen.queryByRole('group', { name: '变换后电路图' })).toBeNull()
    const picker = screen.getByRole('group', { name: '可用变换候选' })
    fireEvent.click(within(picker).getByRole('button'))
    fireEvent.click(screen.getByRole('button', { name: '开始分步学习' }))
    for (let index = 0; index < 4; index++) fireEvent.click(screen.getByRole('button', { name: '下一步' }))
    expect(screen.getByRole('status')).toHaveTextContent('已验证')
    expect(screen.getByRole('table', { name: '端口等效电阻对照' })).toHaveTextContent('54.54545455 Ω')
    expect(verify).toHaveBeenCalledTimes(2)
  })
})
