import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SchematicEditor } from './SchematicEditor'
import { deserializeProject } from '../project-format'

const button = (name: string) => screen.getByRole('button', { name })
const canvas = () => screen.getByRole('application', { name: '原理图编辑画布' })
const preview = () => screen.queryByTestId('wire-preview')
const summary = () => screen.getByTestId('editor-summary')
const point = (x: number, y: number, pointerId = 1) => ({ clientX: x, clientY: y, pointerId, button: 0, buttons: 1 })
function place(x: number, y: number) { fireEvent.click(button('电阻 R')); fireEvent.click(canvas(), { clientX: x, clientY: y }) }
function setup() { render(<SchematicEditor />); place(200, 200); place(600, 200); fireEvent.click(button('选择 V')) }
function down(name = 'R1.2 引脚', x = 240, y = 200) { fireEvent.pointerDown(button(name), point(x, y)) }
function move(x: number, y: number) { fireEvent.pointerMove(canvas(), point(x, y)) }
function up(x: number, y: number) { fireEvent.pointerUp(canvas(), point(x, y)) }

beforeEach(() => {
  class Pointer extends MouseEvent {
    readonly pointerId: number
    constructor(type: string, init: PointerEventInit = {}) { super(type, init); this.pointerId = init.pointerId ?? 1 }
  }
  vi.stubGlobal('PointerEvent', Pointer)
  const captured = new Set<number>()
  Object.defineProperties(SVGSVGElement.prototype, {
    setPointerCapture: { configurable: true, value: (id: number) => captured.add(id) },
    hasPointerCapture: { configurable: true, value: (id: number) => captured.has(id) },
    releasePointerCapture: { configurable: true, value: (id: number) => captured.delete(id) },
    getScreenCTM: { configurable: true, value(this: SVGSVGElement) {
      const [x = 0, y = 0, width = 1000] = this.getAttribute('viewBox')!.split(' ').map(Number)
      const scale = 1000 / width
      return { a: scale, b: 0, inverse: () => ({ scale: 1 / scale, x, y }) }
    } },
    createSVGPoint: { configurable: true, value: () => ({ x: 0, y: 0, matrixTransform(m: { scale: number; x: number; y: number }) { return { x: this.x * m.scale + m.x, y: this.y * m.scale + m.y } } }) },
  })
})
afterEach(() => vi.unstubAllGlobals())

describe('node wire pointer interaction', () => {
  it('places one inductor per palette activation, then drags only that stable component', () => {
    render(<SchematicEditor />)
    fireEvent.click(button('电感 L')); fireEvent.click(canvas(), { clientX: 200, clientY: 200 })
    const id = button('L1 元件').getAttribute('data-component-id')
    expect(button('选择 V')).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(canvas(), { clientX: 400, clientY: 200 })
    expect(summary()).toHaveTextContent('1 个元件')
    fireEvent.click(button('L1 元件'))
    fireEvent.pointerDown(button('L1 元件'), point(200, 200)); move(320, 280); up(320, 280)
    fireEvent.click(canvas(), { clientX: 320, clientY: 280 })
    expect(button('L1 元件')).toHaveAttribute('data-component-id', id)
    expect(button('L1.1 引脚')).toHaveAttribute('cx', '280')
    expect(button('L1.1 引脚')).toHaveAttribute('cy', '280')
    expect(summary()).toHaveTextContent('1 个元件')
    fireEvent.click(button('撤销')); expect(button('L1.1 引脚')).toHaveAttribute('cx', '160')
    fireEvent.click(button('重做')); expect(button('L1.1 引脚')).toHaveAttribute('cx', '280')
    fireEvent.click(button('电感 L')); fireEvent.click(canvas(), { clientX: 600, clientY: 200 })
    expect(summary()).toHaveTextContent('2 个元件')
    expect(button('L1 元件')).toHaveAttribute('data-component-id', id)
    expect(button('L2 元件')).toBeInTheDocument()
    fireEvent.click(canvas(), { clientX: 800, clientY: 200 })
    expect(summary()).toHaveTextContent('2 个元件')
  })
  it('dragging an existing component cancels an armed placement instead of adding a copy', () => {
    render(<SchematicEditor />); place(200, 200)
    const id = button('R1 元件').getAttribute('data-component-id')
    fireEvent.click(button('电阻 R'))
    fireEvent.pointerDown(button('R1 元件'), point(200, 200)); move(400, 320); up(400, 320)
    fireEvent.click(canvas(), { clientX: 400, clientY: 320 })
    expect(summary()).toHaveTextContent('1 个元件')
    expect(button('R1 元件')).toHaveAttribute('data-component-id', id)
    expect(button('R1.1 引脚')).toHaveAttribute('cx', '360')
    expect(button('R1.1 引脚')).toHaveAttribute('cy', '320')
    expect(button('选择 V')).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(canvas(), { clientX: 600, clientY: 400 })
    expect(summary()).toHaveTextContent('1 个元件')
  })
  it('starts at the exact pin, continuously renders an orthogonal preview, and leaves the graph unchanged', () => {
    setup(); down()
    expect(preview()).toHaveAttribute('d', 'M240 200 L240 200')
    move(360, 280); expect(preview()).toHaveAttribute('d', 'M240 200 L360 200 L360 280')
    move(420, 320); expect(preview()).toHaveAttribute('d', 'M240 200 L420 200 L420 320')
    expect(summary()).toHaveTextContent('0 条导线 · 4 个电气网络')
    expect(button('R1 元件')).not.toHaveAttribute('transform')
    expect(button('R1.2 引脚')).toHaveAttribute('cx', '240')
  })
  it('snaps to the exact target and commits once, updating real derived nets with one undo/redo step', () => {
    setup(); down(); move(550, 205)
    expect(preview()).toHaveAttribute('d', 'M240 200 L560 200')
    expect(preview()).toHaveAttribute('data-target-id', button('R2.1 引脚').getAttribute('data-anchor-id'))
    expect(button('R2.1 引脚').parentElement).toHaveClass('wire-target')
    up(550, 205); up(550, 205)
    fireEvent.click(canvas(), { clientX: 550, clientY: 205 })
    expect(preview()).not.toBeInTheDocument()
    expect(summary()).toHaveTextContent('1 条导线 · 3 个电气网络')
    fireEvent.click(button('R1.2 引脚'))
    expect(screen.getByText('2 个连接点 · 2 个元件引脚')).toBeInTheDocument()
    fireEvent.click(button('撤销')); expect(summary()).toHaveTextContent('0 条导线 · 4 个电气网络')
    fireEvent.click(button('重做')); expect(summary()).toHaveTextContent('1 条导线 · 3 个电气网络')
  })
  it('keeps selection clicks and existing two-click / keyboard wire creation', () => {
    setup(); down(); up(240, 200); fireEvent.click(canvas())
    expect(screen.getByText('1 个连接点 · 1 个元件引脚')).toBeInTheDocument()
    fireEvent.click(button('接线 W')); down(); up(240, 200); fireEvent.click(canvas())
    fireEvent.keyDown(button('R2.1 引脚'), { key: 'Enter' })
    expect(summary()).toHaveTextContent('1 条导线')
  })
  it.each(['invalid', 'self', 'Escape', 'pointercancel', 'lostpointercapture', 'blur', 'tool', 'undo'] as const)('cancels %s without leaving a preview or connection', reason => {
    setup(); down(); move(400, 300)
    if (reason === 'invalid') up(400, 300)
    else if (reason === 'self') up(240, 200)
    else if (reason === 'Escape') fireEvent.keyDown(canvas(), { key: 'Escape' })
    else if (reason === 'blur') fireEvent(window, new Event('blur'))
    else if (reason === 'tool') fireEvent.click(button('平移'))
    else if (reason === 'undo') fireEvent.click(button('撤销'))
    else fireEvent(canvas(), new PointerEvent(reason, { pointerId: 1, bubbles: true }))
    expect(preview()).not.toBeInTheDocument()
    up(560, 200); expect(summary()).toHaveTextContent('0 条导线')
    if (reason !== 'undo') { fireEvent.click(button('撤销')); expect(summary()).toHaveTextContent('1 个元件') }
  })
  it('rejects duplicate direct edges and ignores unrelated pointer IDs / secondary buttons', () => {
    setup(); down(); move(560, 200)
    fireEvent.pointerUp(canvas(), point(560, 200, 2)); expect(preview()).toBeInTheDocument()
    up(560, 200); down(); move(560, 200)
    expect(preview()).not.toHaveAttribute('data-target-id'); up(560, 200)
    expect(summary()).toHaveTextContent('1 条导线')
    fireEvent.pointerDown(button('R1.1 引脚'), { ...point(160, 200), button: 2 })
    expect(preview()).not.toBeInTheDocument()
  })
  it('keeps source and snapping accurate after zoom and pan with a fixed screen-pixel snap radius', () => {
    setup(); fireEvent.click(button('放大画布'))
    fireEvent.click(button('平移')); fireEvent.pointerDown(canvas(), point(100, 100)); move(150, 140); up(150, 140)
    fireEvent.click(button('选择 V'))
    // viewBox is 60 28 800 480: world source 240,200 maps to screen 225,215.
    down('R1.2 引脚', 225, 215); move(638, 215)
    expect(preview()).toHaveAttribute('d', 'M240 200 L560 200')
    move(640, 215); expect(preview()).not.toHaveAttribute('data-target-id')
    move(638, 215); up(638, 215)
    expect(summary()).toHaveTextContent('1 条导线 · 3 个电气网络')
  })
  it('preserves intentional component-body movement', () => {
    setup(); fireEvent.pointerDown(button('R1 元件'), point(200, 200)); move(280, 260); up(280, 260)
    expect(button('R1.1 引脚')).toHaveAttribute('cx', '240')
    expect(button('R1.1 引脚')).toHaveAttribute('cy', '260')
    expect(summary()).toHaveTextContent('0 条导线')
    fireEvent.click(button('撤销')); expect(button('R1.1 引脚')).toHaveAttribute('cx', '160')
  })
  it('starts at an existing anchor and crosses a wire without an implicit junction', () => {
    setup(); fireEvent.click(button('接线 W')); fireEvent.click(canvas(), { clientX: 400, clientY: 100 }); fireEvent.click(canvas(), { clientX: 400, clientY: 400 })
    fireEvent.click(button('选择 V')); down(); move(560, 200); up(560, 200)
    expect(summary()).toHaveTextContent('2 条导线 · 4 个电气网络')
    fireEvent.click(button('R1.2 引脚')); expect(screen.getByText('2 个连接点 · 2 个元件引脚')).toBeInTheDocument()
    down('连接点 5', 400, 100); move(160, 200); up(160, 200)
    expect(summary()).toHaveTextContent('3 条导线 · 3 个电气网络')
  })
  it('saves and reopens the actual dragged connection with stable endpoints and geometry', async () => {
    let exported: Blob | undefined
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: (blob: Blob) => { exported = blob; return 'blob:drag' } })
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() })
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    setup(); const ids = ['R1.2 引脚', 'R2.1 引脚'].map(name => button(name).getAttribute('data-anchor-id'))
    down(); move(560, 200); up(560, 200); fireEvent.click(button('导出工程'))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('工程文件已导出'))
    const text = await new Promise<string>(resolve => { const reader = new FileReader(); reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : ''); reader.readAsText(exported!) })
    const parsed = await deserializeProject(text)
    expect(parsed.kind).toBe('ready')
    if (parsed.kind !== 'ready') throw new Error('Invalid saved project')
    expect(parsed.document.project.sheets[0]!.connections[0]!.endpoints).toEqual(ids)
    fireEvent.click(button('新建工程'))
    const file = new File([text], 'drag.json'); Object.defineProperty(file, 'arrayBuffer', { value: () => Promise.resolve(new TextEncoder().encode(text).buffer) })
    fireEvent.change(screen.getByLabelText('打开工程文件'), { target: { files: [file] } })
    await waitFor(() => expect(summary()).toHaveTextContent('1 条导线 · 3 个电气网络'))
    expect(button('R1.2 引脚')).toHaveAttribute('data-anchor-id', ids[0])
    expect(canvas().querySelector('.wire-ink')).toHaveAttribute('d', 'M240 200 L560 200')
  })
})
