import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { webcrypto } from 'node:crypto'
import { SignalWorkbench } from './SignalWorkbench'
import App from '../App'
import { deserializeProject } from '../project-format'

beforeEach(() => {
  vi.stubGlobal('crypto', webcrypto)
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: vi.fn().mockReturnValue({ matches: false }) })
  window.localStorage.clear()
})
afterEach(() => vi.unstubAllGlobals())
const button = (name: string) => screen.getByRole('button', { name })
const input = (name: string, value: string) => fireEvent.change(screen.getByLabelText(name), { target: { value } })
const fileInput = (label: string, text: string, name: string) => {
  const file = new File([text], name), bytes = new TextEncoder().encode(text)
  Object.defineProperty(file, 'arrayBuffer', { value: () => Promise.resolve(bytes.buffer) })
  fireEvent.change(screen.getByLabelText(label), { target: { files: [file] } })
}
async function generate() { fireEvent.click(button('生成并分析')); await waitFor(() => expect(screen.getByTestId('fft-peak')).toHaveTextContent('100 Hz')) }

describe('signal workbench data flow', () => {
  it('generates real 100Hz samples, displays RMS/spectrum and updates both when frequency changes', async () => {
    render(<SignalWorkbench />); await generate()
    expect(screen.getByTestId('measurement-totalRms')).toHaveTextContent('0.7071068 V')
    expect(screen.getByTestId('fft-peak')).toHaveTextContent('1 V 峰值')
    expect(screen.getByTestId('waveform-path').getAttribute('d')!.length).toBeGreaterThan(100)
    const before = screen.getByTestId('waveform-path').getAttribute('d')
    input('频率 / Hz', '200'); fireEvent.click(button('生成并分析'))
    await waitFor(() => expect(screen.getByTestId('fft-peak')).toHaveTextContent('200 Hz'))
    expect(screen.getByTestId('waveform-path').getAttribute('d')).not.toBe(before)
    expect(screen.getByText(/Nyquist = 512 Hz/)).toBeInTheDocument()
  })
  it('keeps current capture on invalid generation and reports unavailable frequency honestly', async () => {
    render(<SignalWorkbench />); await generate()
    const before = screen.getByTestId('waveform-path').getAttribute('d')
    input('频率 / Hz', '600'); fireEvent.click(button('生成并分析'))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('一半'))
    expect(screen.getByTestId('waveform-path').getAttribute('d')).toBe(before)
    input('频率 / Hz', '100'); input('采样点数', '16'); fireEvent.click(button('生成并分析'))
    await waitFor(() => expect(screen.getByTestId('measurement-frequency')).toHaveTextContent('不可用'))
    input('采样点数', '30'); fireEvent.click(button('生成并分析'))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('2 的幂次'))
    expect(screen.getByTestId('waveform-path')).toBeInTheDocument()
  })
  it('requires CSV mapping confirmation, converts explicit units and displays synchronized channels', async () => {
    render(<SignalWorkbench />)
    fileInput('选择 CSV 文件', 't,v,i\n0,0,10\n1,1000,20\n2,0,30\n3,-1000,40\n', 'capture.csv')
    await screen.findByRole('button', { name: '确认列与单位并导入' })
    expect(screen.queryByTestId('waveform-path')).not.toBeInTheDocument()
    input('时间单位', 'ms'); input('单位 v', 'mV'); fireEvent.click(screen.getByLabelText('导入通道 i')); input('单位 i', 'mA')
    fireEvent.click(button('确认列与单位并导入'))
    await waitFor(() => expect(screen.getAllByTestId('waveform-path')).toHaveLength(2))
    expect(screen.getByTestId('measurement-totalRms')).toHaveTextContent('0.7071068 V')
    expect(screen.getByTestId('fft-metadata')).toHaveTextContent('fs = 1000 Hz')
    expect(screen.getByText(/CSV 导入 · capture.csv/)).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: '分析通道' }).querySelectorAll('option')).toHaveLength(2)
  })
  it('reports row/column on irregular CSV and preserves the prior dataset', async () => {
    render(<SignalWorkbench />); await generate(); const before = screen.getByTestId('waveform-path').getAttribute('d')
    fileInput('选择 CSV 文件', 't,v\n0,1\n1,2\n3,3\n', 'irregular.csv')
    await screen.findByRole('button', { name: '确认列与单位并导入' }); fireEvent.click(button('确认列与单位并导入'))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/第 \d+ 行第 1 列/))
    expect(screen.getByTestId('waveform-path').getAttribute('d')).toBe(before)
  })
  it('exports and actually reopens a complete project retaining IDs, raw/derived data and FFT settings', async () => {
    let blob: Blob | undefined
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: (value: Blob) => { blob = value; return 'blob:signal' } })
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() })
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const rendered = render(<SignalWorkbench />); await generate()
    input('窗函数', 'hann'); fireEvent.click(button('运行 FFT'))
    await waitFor(() => expect(screen.getByTestId('fft-metadata')).toHaveTextContent('周期 Hann 窗'))
    fireEvent.click(button('导出完整工程')); await waitFor(() => expect(screen.getByRole('status', { name: '信号处理状态' })).toHaveTextContent('完整信号工程已导出'))
    const text = await new Promise<string>(resolve => { const reader = new FileReader(); reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : ''); reader.readAsText(blob!) })
    const result = await deserializeProject(text); expect(result.kind).toBe('ready'); if (result.kind !== 'ready') throw Error('Expected project')
    expect(result.document.formatVersion).toBe(1); const ids = result.document.project.measurements.map(d => d.id).sort()
    rendered.unmount(); render(<SignalWorkbench />); fileInput('打开信号工程', text, 'signal.straylab.json')
    await waitFor(() => expect(screen.getByRole('status', { name: '信号处理状态' })).toHaveTextContent('工程已打开'))
    expect(screen.getByTestId('measurement-totalRms')).toHaveTextContent('0.7071068 V')
    expect(screen.getByLabelText('窗函数')).toHaveValue('hann')
    fireEvent.click(button('导出完整工程')); await waitFor(() => expect(screen.getByRole('status', { name: '信号处理状态' })).toHaveTextContent('完整信号工程已导出'))
    const reopenedText = await new Promise<string>(resolve => { const reader = new FileReader(); reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : ''); reader.readAsText(blob!) })
    const reopened = await deserializeProject(reopenedText); if (reopened.kind !== 'ready') throw Error('Expected project')
    expect(reopened.document.project.measurements.map(d => d.id).sort()).toEqual(ids)
  })
  it('retains the active dataset across existing circuit/editor navigation', async () => {
    render(<App />); fireEvent.click(button('信号实验室')); await generate()
    fireEvent.click(button('原理图编辑器')); expect(screen.getByRole('application', { name: '原理图编辑画布' })).toBeVisible()
    fireEvent.click(button('等效变换与课程')); expect(screen.getByRole('group', { name: '原始电路图' })).toBeVisible()
    fireEvent.click(button('信号实验室')); expect(screen.getByTestId('measurement-totalRms')).toBeVisible()
    expect(screen.getByTestId('fft-peak')).toHaveTextContent('100 Hz')
  })
})
