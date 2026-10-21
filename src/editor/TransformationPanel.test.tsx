import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SchematicEditor } from './SchematicEditor'
import * as transforms from '../transforms'
import { createCircuitNetwork, resistanceOhms } from '../domain'
import { buildDrawing, CircuitDiagram } from '../visualization'

beforeEach(() => {
  Object.defineProperty(SVGSVGElement.prototype, 'getScreenCTM', { configurable: true, value: () => ({ a: 1, inverse: () => ({}) }) })
  Object.defineProperty(SVGSVGElement.prototype, 'createSVGPoint', { configurable: true, value() { return { x: 0, y: 0, matrixTransform() { return { x: this.x, y: this.y } } } } })
})
const button = (name: string) => screen.getByRole('button', { name })
const canvas = () => screen.getByRole('application', { name: '原理图编辑画布' })
function draw(ports = true, values = ['100', '220']) {
  render(<SchematicEditor />)
  for (const [i, x] of [200, 440].entries()) {
    fireEvent.click(button('电阻 R'))
    fireEvent.click(canvas(), { clientX: x, clientY: 200 })
    fireEvent.change(screen.getByLabelText('电阻值'), { target: { value: values[i] } }); fireEvent.click(button('应用属性'))
  }
  fireEvent.click(button('接线 W')); fireEvent.click(button('R1.2 引脚')); fireEvent.click(button('R2.1 引脚'))
  if (ports) {
    fireEvent.click(button('外部端口'))
    for (const [label, pin] of [['A', 'R1.1 引脚'], ['B', 'R2.2 引脚']]) {
      fireEvent.change(screen.getByLabelText('标注名称'), { target: { value: label } }); fireEvent.click(button(pin!))
    }
  }
  fireEvent.click(button('选择 V'))
}
function discoverAndPreview() {
  fireEvent.click(button('识别可用变换'))
  fireEvent.click(screen.getByRole('button', { name: /^串联化简 · / }))
  fireEvent.click(button('预览所选变换'))
}

describe('editor transformation workflow', () => {
  it('uses presentation labels for arbitrary legacy IDs while preserving the exact network and default renderer', () => {
    const network = createCircuitNetwork({ id: 'fixture', points: [{ id: 'constructor' }, { id: 'toString' }], elements: [{ id: '__proto__', kind: 'resistor', resistance: resistanceOhms(100), endpoints: ['constructor', 'toString'] }], terminals: [{ id: 'A', pointId: 'constructor', label: 'A' }, { id: 'B', pointId: 'toString', label: 'B' }] })
    const layout = { pointPositions: Object.fromEntries([['constructor', { x: 90, y: 200 }], ['toString', { x: 470, y: 200 }]]) }
    expect(buildDrawing(network, layout).kind).toBe('ready')
    const labels = Object.fromEntries([['__proto__', 'R_load']]), drawing = buildDrawing(network, layout, undefined, labels)
    expect(drawing.kind).toBe('ready')
    if (drawing.kind !== 'ready') throw new Error('Expected labelled drawing')
    expect(drawing.model.network).toBe(network)
    render(<CircuitDiagram drawing={drawing} title="Identity fixture" elementLabels={labels} pointLabels={Object.fromEntries([['constructor', 'A'], ['toString', 'B']])} />)
    expect(screen.getByRole('button', { name: 'R_load · 100 Ω' })).toHaveAttribute('data-element-id', '__proto__')
  })
  it('uses a drawn circuit for discovery, preview, numerical evidence, atomic apply and history', () => {
    draw(); const id = button('R1 元件').getAttribute('data-component-id')
    discoverAndPreview()
    expect(screen.getByTestId('editor-summary')).toHaveTextContent('2 个元件 · 1 条导线')
    expect(screen.getByText('已验证：外部端口行为在数值容差内一致')).toBeInTheDocument()
    expect(canvas().querySelectorAll('.editor-component.candidate-highlight')).toHaveLength(2)
    expect(screen.getByRole('group', { name: '工程原始电路图' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: '工程变换后电路图' })).toBeInTheDocument()
    expect(button('应用已验证变换')).toBeEnabled()
    fireEvent.click(button('应用已验证变换'))
    expect(screen.getByTestId('editor-summary')).toHaveTextContent('1 个元件')
    const replacement = button('R3 元件').getAttribute('data-component-id')
    expect(screen.queryByRole('button', { name: 'R1 元件' })).not.toBeInTheDocument()
    fireEvent.click(button('撤销')); expect(button('R1 元件')).toHaveAttribute('data-component-id', id)
    fireEvent.click(button('重做')); expect(button('R3 元件')).toHaveAttribute('data-component-id', replacement)
    fireEvent.click(button('R3 元件'))
    expect(Number(screen.getByLabelText<HTMLInputElement>('电阻值').value)).toBeCloseTo(320, 10)
  })
  it('builds all five lesson stages from the same source, values and verification', () => {
    draw(); discoverAndPreview(); fireEvent.click(button('学习此电路的变换'))
    const lesson = screen.getByRole('region', { name: '分步学习' })
    expect(button('应用已验证变换')).toBeDisabled()
    for (let step = 1; step <= 5; step++) {
      expect(within(lesson).getByRole('heading', { level: 2 })).toHaveTextContent(`第 ${step} / 5 步`)
      if (step === 3) expect(within(lesson).getByLabelText('数值代入')).toHaveTextContent('320')
      if (step < 5) fireEvent.click(within(lesson).getByRole('button', { name: '下一步' }))
    }
    expect(within(lesson).getByText('已验证：外部端口行为在数值容差内一致')).toBeInTheDocument()
    fireEvent.click(button('退出学习模式')); expect(button('应用已验证变换')).toBeEnabled()
    expect(screen.getByTestId('editor-summary')).toHaveTextContent('2 个元件')
  })
  it('invalidates a preview and its highlights after any project revision', () => {
    draw(); discoverAndPreview()
    fireEvent.change(screen.getByLabelText('工程名称'), { target: { value: 'New revision' } }); fireEvent.click(button('更新名称'))
    expect(screen.getByText(/工程已更新，旧预览已失效/)).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: '工程变换预览' })).not.toBeInTheDocument()
    expect(canvas().querySelectorAll('.editor-component.candidate-highlight')).toHaveLength(0)
    expect(screen.queryByRole('button', { name: '应用已验证变换' })).not.toBeInTheDocument()
  })
  it('can preview an unobserved circuit but prevents an inconclusive commit', () => {
    draw(false); discoverAndPreview()
    expect(screen.getByText('无法确定：数值验证未能建立等效性')).toBeInTheDocument()
    expect(button('应用已验证变换')).toBeDisabled()
    expect(screen.getByTestId('editor-summary')).toHaveTextContent('2 个元件')
  })
  it('honors a rejected numerical verdict in UI without touching the circuit', () => {
    const verifier = vi.spyOn(transforms, 'verifyTerminalEquivalence').mockReturnValue({ kind: 'different', reason: 'fixture mismatch', pairs: [] })
    try { draw(); discoverAndPreview(); expect(screen.getByText('验证失败：已发现外部端口差异')).toBeInTheDocument(); expect(button('应用已验证变换')).toBeDisabled(); expect(screen.getByTestId('editor-summary')).toHaveTextContent('2 个元件') }
    finally { verifier.mockRestore() }
  })
  it('reports numerical failure from real extreme values without inventing evidence', () => {
    draw(true, ['1e308', '1e308']); discoverAndPreview()
    expect(screen.getByText(/变换计算失败/)).toBeInTheDocument()
    expect(button('应用已验证变换')).toBeDisabled()
    expect(screen.queryByText('已验证：外部端口行为在数值容差内一致')).not.toBeInTheDocument()
  })
  it('protects a selected temporary observation and explains unavailable candidates', () => {
    draw(); fireEvent.click(button('R1.2 引脚')); fireEvent.click(button('将选中连接点加入临时观测'))
    fireEvent.click(button('识别可用变换'))
    expect(screen.getByText(/未找到适用候选/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '移除观测 R1.2' })); fireEvent.click(button('识别可用变换'))
    expect(screen.getByRole('button', { name: /^串联化简 · / })).toBeInTheDocument()
  })
  it('rejects mixed circuits explicitly while retaining the inserted component', () => {
    draw(); fireEvent.click(button('电容 C')); fireEvent.click(canvas(), { clientX: 700, clientY: 400 })
    fireEvent.click(button('识别可用变换'))
    expect(screen.getByText('当前配置不支持等效变换。')).toBeInTheDocument()
    expect(screen.getByText(/不会提取或伪装为纯电阻子图/)).toBeInTheDocument()
    expect(screen.getByTestId('editor-summary')).toHaveTextContent('3 个元件')
    expect(button('C1 元件')).toBeInTheDocument()
  })
})
