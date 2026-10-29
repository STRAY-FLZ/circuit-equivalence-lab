import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CapstoneWorkbench } from './CapstoneWorkbench'

describe('integrated experiment UI', () => {
  it('runs actual scenarios, invalidates source edits and archives an inspectable waveform', async () => {
    render(<CapstoneWorkbench onOpen={() => true} onNavigate={() => {}} onOpenSignal={vi.fn().mockResolvedValue(true)} />)
    fireEvent.click(screen.getByRole('button', { name: '打开综合实验' }))
    await waitFor(() => expect(screen.getByRole('button', { name: '运行综合参数研究' })).toBeInTheDocument())
    const select = screen.getByLabelText('研究参数'), option = within(select).getByRole<HTMLOptionElement>('option', { name: /R1.resistance/ })
    fireEvent.change(select, { target: { value: option.value } }); fireEvent.change(screen.getByLabelText('场景值列表'), { target: { value: '1000,2000' } })
    fireEvent.click(screen.getByRole('button', { name: '运行综合参数研究' }))
    await waitFor(() => expect(screen.getByLabelText('综合实验状态')).toHaveTextContent('综合实验完成'), { timeout: 20000 })
    expect(screen.getByLabelText('实验有效性')).toHaveTextContent('当前运行已验证')
    expect(screen.getByRole('region', { name: '参数场景比较' })).toHaveTextContent('0.001 s')
    fireEvent.change(screen.getByLabelText('用户实验结论'), { target: { value: '观察到R增加后时间常数增加。' } })
    fireEvent.click(screen.getByRole('button', { name: '保存综合实验记录' }))
    await waitFor(() => expect(screen.getByLabelText('综合实验状态')).toHaveTextContent('实验记录已归档'), { timeout: 10000 })
    expect(screen.getByRole('button', { name: '在信号实验室查看实际波形' })).not.toBeDisabled()
    fireEvent.change(screen.getByLabelText('源参数值'), { target: { value: '1500' } }); fireEvent.click(screen.getByRole('button', { name: '应用源参数' }))
    await waitFor(() => expect(screen.getByLabelText('实验有效性')).toHaveTextContent('过期'))
    expect(screen.getByRole('button', { name: '保存综合实验记录' })).toBeDisabled()
  }, 30000)
})
