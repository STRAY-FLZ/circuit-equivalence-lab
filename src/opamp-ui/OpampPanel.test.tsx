import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createRef } from 'react'
import { describe, expect, it } from 'vitest'
import { instantiateTemplate } from '../atlas'
import { SchematicEditor } from '../editor'
import type { SchematicEditorHandle } from '../editor'

describe('op-amp laboratory integration', () => {
  it('opens a real follower, computes, invalidates and records the analyzed revision', async () => {
    const editor = createRef<SchematicEditorHandle>()
    render(<SchematicEditor ref={editor} />)
    act(() => { expect(editor.current!.openTemplate(instantiateTemplate('opamp-follower'), 'opamp')).toBe(true) })
    expect(screen.getByRole('region', { name: '运放开环响应' })).toHaveTextContent('1000000 Hz')
    fireEvent.click(screen.getByRole('button', { name: '求解有限增益直流' }))
    await waitFor(() => expect(screen.getByLabelText('运放分析状态')).toHaveTextContent('直流已验证'))
    expect(screen.getByRole('region', { name: '运放直流结果' })).toHaveTextContent('Vout=0.099999')
    fireEvent.click(screen.getByRole('button', { name: '运行运放频率扫描' }))
    await waitFor(() => expect(screen.getByLabelText('运放分析状态')).toHaveTextContent('频率分析完成'), { timeout: 10000 })
    expect(screen.getByRole('region', { name: '运放闭环结果' })).toHaveTextContent('截止估计')
    expect(screen.getByRole('region', { name: '运放环路结果' })).toHaveTextContent('相位裕度')
    const loop = screen.getByRole('region', { name: '运放环路结果' })
    fireEvent.change(within(loop).getByLabelText('频点游标'), { target: { value: 200 } })
    expect(within(loop).getByLabelText('频点读数')).toHaveTextContent('100000000 Hz')
    fireEvent.click(screen.getByRole('button', { name: '将运放分析记录写入工程' }))
    expect(screen.getByText('工程内保存的运放分析记录')).toBeInTheDocument()
    expect(screen.getByText(/结果已过期/)).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: '运放闭环结果' })).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('运放开环增益'), { target: { value: '50000' } })
    fireEvent.click(screen.getByRole('button', { name: '应用运放模型' }))
    expect(screen.getByRole('region', { name: '运放开环响应' })).toHaveTextContent('500000 Hz')
    fireEvent.click(screen.getByRole('button', { name: '运行运放频率扫描' }))
    await waitFor(() => expect(screen.getByLabelText('运放分析状态')).toHaveTextContent('频率分析完成'), { timeout: 10000 })
    expect(screen.getByRole('region', { name: '运放闭环结果' })).toHaveTextContent('截止估计')
  }, 20000)
})
