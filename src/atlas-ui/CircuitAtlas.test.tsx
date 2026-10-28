import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { webcrypto } from 'node:crypto'
import { CircuitAtlas } from './CircuitAtlas'
import App from '../App'

beforeEach(() => {
  vi.stubGlobal('crypto', webcrypto)
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: vi.fn().mockReturnValue({ matches: false }) })
  Object.defineProperty(SVGSVGElement.prototype, 'getScreenCTM', { configurable: true, value: () => ({ inverse: () => ({}) }) })
  Object.defineProperty(SVGSVGElement.prototype, 'createSVGPoint', { configurable: true, value() { return { x: 0, y: 0, matrixTransform() { return { x: this.x, y: this.y } } } } })
  window.localStorage.clear()
})
afterEach(() => vi.unstubAllGlobals())
const button = (name: string | RegExp) => screen.getByRole('button', { name })
// The expanded real catalog makes role-based DOM queries heavier on CI runners.
describe('atlas navigation and existing workspaces', { timeout: 15000 }, () => {
  it('maintains independent category/family expansion and inert collapsed panels with matching accessible IDs', () => {
    render(<CircuitAtlas onOpen={() => true} />)
    const first = button(/电源与电阻网络.*14 个模板/), controlled = button(/受控源与运算放大器电路/)
    expect(first).toHaveAttribute('aria-expanded', 'true')
    expect(controlled).toHaveAttribute('aria-expanded', 'false')
    const panel = document.getElementById(controlled.getAttribute('aria-controls')!)!
    expect(panel).toHaveAttribute('inert')
    fireEvent.click(controlled); expect(panel).not.toHaveAttribute('inert')
    fireEvent.click(first); expect(controlled).toHaveAttribute('aria-expanded', 'true')
    expect(screen.queryByRole('button', { name: '电阻并联电路' })).not.toBeInTheDocument()
    fireEvent.click(first); expect(button('电阻并联电路')).toBeVisible()
    fireEvent.click(button('电阻并联电路')); expect(button('电阻并联电路')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('img', { name: '电阻并联电路 原理图预览' })).toBeInTheDocument()
    expect(controlled).toHaveAttribute('aria-expanded', 'true')
  })
  it('shows planned families without dummy templates and separates schematic/edit support from calculation', () => {
    render(<CircuitAtlas onOpen={() => true} />)
    fireEvent.click(button(/受控源与运算放大器电路/)); fireEvent.click(button(/电压控制电压源/))
    expect(within(document.getElementById(button(/电压控制电压源/).getAttribute('aria-controls')!)!).getByText(/暂未提供可编辑模板/)).toBeVisible()
    fireEvent.click(button(/RC \/ RL 一阶动态电路/)); fireEvent.click(button(/RC 充电拓扑/)); fireEvent.click(button('RC 充电连接拓扑'))
    const capability = within(screen.getByRole('region', { name: '模板能力' }))
    expect(capability.getAllByText('暂未提供')).toHaveLength(2)
    expect(capability.getByText('可编辑 · 可导出重开')).toBeInTheDocument()
    expect(screen.getByText(/直流模型不支持储能元件/)).toBeInTheDocument()
    expect(capability.getByText(/线性暂态与交流需各自明确/)).toBeInTheDocument()
  })
  it('searches secondary metadata while retaining selection and previous expansion when cleared', () => {
    render(<CircuitAtlas onOpen={() => true} />)
    fireEvent.change(screen.getByLabelText('搜索电路图谱'), { target: { value: '第11章' } })
    expect(button('RC 低通连接拓扑')).toBeVisible()
    fireEvent.click(button('RC 低通连接拓扑'))
    fireEvent.change(screen.getByLabelText('搜索电路图谱'), { target: { value: '' } })
    expect(button(/串联与并联网络/)).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('heading', { name: 'RC 低通连接拓扑' })).toBeInTheDocument()
  })
  it('protects dirty editor state on cancel; confirmed open is independent and supports normal history', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<App />); fireEvent.click(button('原理图编辑器')); fireEvent.click(button('电阻 R')); fireEvent.click(screen.getByRole('application', { name: '原理图编辑画布' }), { clientX: 200, clientY: 200 })
    const originalId = button('R1 元件').getAttribute('data-component-id')
    fireEvent.click(button('典型电路图谱')); fireEvent.click(button('在编辑器中打开'))
    expect(confirm).toHaveBeenCalledOnce(); expect(screen.getByRole('status', { name: '图谱操作状态' })).toHaveTextContent('已保留原工程')
    fireEvent.click(button('原理图编辑器')); expect(button('R1 元件')).toHaveAttribute('data-component-id', originalId)
    fireEvent.click(button('典型电路图谱')); confirm.mockReturnValue(true); fireEvent.click(button('在编辑器中打开'))
    expect(screen.getByTestId('editor-summary')).toHaveTextContent('2 个元件')
    expect(button('R1 元件')).not.toHaveAttribute('data-component-id', originalId)
    fireEvent.click(button('R1 元件')); fireEvent.change(screen.getByLabelText('电阻值'), { target: { value: '1234' } }); fireEvent.click(button('应用属性'))
    expect(screen.getByLabelText('电阻值')).toHaveValue(1234)
    fireEvent.click(button('撤销')); fireEvent.click(button('R1 元件')); expect(screen.getByLabelText('电阻值')).toHaveValue(100)
  })
  it('retains actual sampled signal data across atlas/editor/V1 navigation', async () => {
    render(<App />); fireEvent.click(button('信号实验室')); fireEvent.click(button('生成并分析'))
    await waitFor(() => expect(screen.getByTestId('measurement-totalRms')).toHaveTextContent('0.7071068 V'))
    fireEvent.click(button('典型电路图谱')); fireEvent.click(button('在编辑器中打开'))
    expect(screen.getByTestId('editor-summary')).toHaveTextContent('2 个元件')
    fireEvent.click(button('等效变换与课程')); expect(screen.getByRole('group', { name: '原始电路图' })).toBeVisible()
    fireEvent.click(button('信号实验室')); expect(screen.getByTestId('measurement-totalRms')).toHaveTextContent('0.7071068 V')
  })
})
