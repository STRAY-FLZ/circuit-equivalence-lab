import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createRef } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { instantiateTemplate } from '../atlas'
import { SchematicEditor } from '../editor'
import type { SchematicEditorHandle } from '../editor'
import { SignalWorkbench } from '../signal-ui'
import type { SignalWorkbenchHandle } from '../signal-ui/SignalWorkbench'
import { configureTransientExperiment, readTransientRecord } from '../transient'
import type { ProjectDocumentV1 } from '../project-format'

const button = (name: string) => screen.getByRole('button', { name })
beforeEach(() => { vi.spyOn(window, 'confirm').mockReturnValue(true) })
describe('actual transient editor integration', () => {
  it('runs RC, synchronizes exact sample, persists waveforms and invalidates/restores after circuit undo', async () => {
    const ref = createRef<SchematicEditorHandle>(), opened = vi.fn<(doc: ProjectDocumentV1) => Promise<boolean>>().mockResolvedValue(true)
    render(<SchematicEditor ref={ref} onOpenSignal={opened} />)
    const base = instantiateTemplate('rc-charge-topology'), project = configureTransientExperiment(base, base.sheets[0]!.id, 'zero-state')
    act(() => { expect(ref.current!.openTemplate(project, 'transient')).toBe(true) })
    fireEvent.click(button('运行暂态分析'))
    await waitFor(() => expect(screen.getByLabelText('暂态分析状态')).toHaveTextContent('模拟完成'), { timeout: 20000 })
    fireEvent.change(screen.getByLabelText('精确样本索引'), { target: { value: '100' } })
    expect(screen.getByLabelText('暂态精确样本读数')).toHaveTextContent('t=0.001 s')
    expect(screen.getByLabelText('暂态精确样本读数')).toHaveTextContent('解析参考 6.32120559 V')
    expect(screen.getByLabelText('U(C1) 光标读数')).toHaveTextContent('样本 100')
    fireEvent.click(button('保存本次模拟到工程'))
    await waitFor(() => expect(screen.getByLabelText('暂态分析状态')).toHaveTextContent('完整保存到工程'), { timeout: 10000 })
    fireEvent.click(button('R1 元件')); fireEvent.change(screen.getByLabelText('电阻值'), { target: { value: '2000' } }); fireEvent.click(button('应用属性'))
    expect(screen.getByLabelText('暂态分析状态')).toHaveTextContent('结果已过期')
    expect(screen.queryByLabelText('暂态模拟结果')).not.toBeInTheDocument()
    fireEvent.click(button('撤销'))
    await waitFor(() => expect(screen.getByLabelText('暂态模拟结果')).toBeInTheDocument())
    fireEvent.click(button('在信号实验室打开所选波形'))
    await waitFor(() => expect(opened).toHaveBeenCalledTimes(1), { timeout: 10000 })
    const saved = opened.mock.calls[0]![0], record = readTransientRecord(saved, project.sheets[0]!.id)!
    expect(record.axis.count).toBe(501); expect(saved.project.measurements.some(d => d.metadata.simulated === true)).toBe(true)
  }, 30000)
  it('protects unsaved transient configuration and rejects invalid numerical inputs', async () => {
    const ref = createRef<SchematicEditorHandle>(); render(<SchematicEditor ref={ref} />)
    const base = instantiateTemplate('rl-series-topology'), p = configureTransientExperiment(base, base.sheets[0]!.id, 'complete')
    act(() => { ref.current!.openTemplate(p, 'transient') })
    fireEvent.change(screen.getByLabelText('输出采样间隔 / s'), { target: { value: '-1' } })
    fireEvent.click(button('运行暂态分析'))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('配置无效'))
    vi.spyOn(window, 'confirm').mockReturnValueOnce(false)
    fireEvent.click(button('暂态分析')); expect(screen.getByLabelText('暂态分析面板')).toBeInTheDocument()
    expect(screen.queryByLabelText('暂态模拟结果')).not.toBeInTheDocument()
  })
  it('signal handoff inspects transient data without attempting an unsuitable automatic FFT', async () => {
    const editor = createRef<SchematicEditorHandle>(), signal = createRef<SignalWorkbenchHandle>()
    render(<><SchematicEditor ref={editor} onOpenSignal={doc => signal.current!.openDocument(doc, undefined, 'inspect')} /><SignalWorkbench ref={signal} /></>)
    const base = instantiateTemplate('rl-series-topology'), p = configureTransientExperiment(base, base.sheets[0]!.id, 'zero-state')
    act(() => { editor.current!.openTemplate(p, 'transient') }); fireEvent.click(button('运行暂态分析'))
    await waitFor(() => expect(screen.getByLabelText('暂态分析状态')).toHaveTextContent('模拟完成'), { timeout: 20000 })
    fireEvent.change(screen.getByLabelText('精确样本索引'), { target: { value: '100' } }); expect(screen.getByLabelText('暂态精确样本读数')).toHaveTextContent('解析参考 0.0632120559 A')
    fireEvent.click(button('保存本次模拟到工程')); await waitFor(() => expect(screen.getByLabelText('暂态分析状态')).toHaveTextContent('完整保存'), { timeout: 10000 })
    fireEvent.click(button('在信号实验室打开所选波形'))
    await waitFor(() => expect(screen.getByText(/暂态模拟波形未自动运行 FFT/)).toBeInTheDocument(), { timeout: 10000 })
    expect(screen.queryByRole('img', { name: 'FFT 单边幅度谱' })).not.toBeInTheDocument()
  }, 30000)
})
