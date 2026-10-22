import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createRef } from 'react'
import { DcAnalysisPanel } from './DcAnalysisPanel'
import { dcFixture, load } from '../../tests/dc-fixtures'
import { applyEdit } from '../editing'
import { SchematicEditor } from '../editor'
import type { SchematicEditorHandle } from '../editor'
import { act } from '@testing-library/react'
import { circuitTemplates } from '../atlas'
import { CircuitAtlas } from '../atlas-ui'

describe('DC results and editor integration', () => {
  it('shows actual equations and values, highlights stable entities, invalidates edits and reruns', async () => {
    const p = dcFixture(load()), sheetId = p.sheets[0]!.id, onHighlight = vi.fn()
    const view = render(<DcAnalysisPanel project={p} sheetId={sheetId} onHighlight={onHighlight} />)
    fireEvent.click(screen.getByRole('button', { name: '运行直流分析' }))
    await waitFor(() => expect(screen.getByLabelText('直流分析状态')).toHaveTextContent('分析完成'))
    const table = screen.getByRole('region', { name: '支路结果表' })
    expect(within(table).getByText('0.01')).toBeInTheDocument()
    fireEvent.click(within(table).getByRole('button', { name: 'R1' }))
    expect(onHighlight).toHaveBeenLastCalledWith(expect.objectContaining({ revision: p.revision, componentId: p.sheets[0]!.components[1]!.id }))
    fireEvent.click(screen.getByText('实际 MNA 方程与矩阵'))
    expect(screen.getByText(/A\[0\] = \[ 0.001, 1 \]/)).toBeInTheDocument()
    const changed = applyEdit(p, sheetId, { type: 'properties', id: p.sheets[0]!.components[1]!.id, reference: 'R1', parameters: { resistance: { kind: 'quantity', quantity: { value: 2000, unit: 'ohm' } } } })
    view.rerender(<DcAnalysisPanel project={changed} sheetId={sheetId} onHighlight={onHighlight} />)
    expect(screen.getByLabelText('直流分析状态')).toHaveTextContent('结果已过期')
    expect(screen.queryByRole('region', { name: '支路结果表' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '运行直流分析' }))
    await waitFor(() => expect(screen.getByLabelText('直流分析状态')).toHaveTextContent('分析完成'))
    expect(within(screen.getByRole('region', { name: '支路结果表' })).getByText('0.005')).toBeInTheDocument()
    const options = within(screen.getByLabelText('直流参考节点')).getAllByRole('option')
    fireEvent.change(screen.getByLabelText('直流参考节点'), { target: { value: options[1]!.getAttribute('value') } })
    expect(screen.getByLabelText('直流分析状态')).toHaveTextContent('结果已过期')
  })
  it('displays unsupported diagnostics rather than successful results', async () => {
    const p = dcFixture([...load(), { ref: 'C1', kind: 'capacitor', value: 1e-6, nodes: ['a', 'g'] }])
    render(<DcAnalysisPanel project={p} sheetId={p.sheets[0]!.id} onHighlight={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: '运行直流分析' }))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('DC_MODEL_UNSUPPORTED'))
    expect(screen.queryByRole('region', { name: '支路结果表' })).not.toBeInTheDocument()
  })
  it('opens editor DC mode and offers stable voltage-defined current controls', async () => {
    const ref = createRef<SchematicEditorHandle>(), p = dcFixture([...load(), { ref: 'F1', kind: 'cccs', value: 2, nodes: ['o', 'g'], control: 'V1' }, { ref: 'R2', kind: 'resistor', value: 1000, nodes: ['o', 'g'] }])
    render(<SchematicEditor ref={ref} />)
    act(() => { expect(ref.current!.openTemplate(p, 'dc')).toBe(true) })
    expect(screen.getByLabelText('直流分析面板')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'F1 元件' }))
    expect(screen.getByLabelText('控制电流支路')).toHaveValue(p.sheets[0]!.components[0]!.id)
    expect(within(screen.getByLabelText('控制电流支路')).getAllByRole('option')).toHaveLength(2)
    fireEvent.click(screen.getByRole('button', { name: '运行直流分析' }))
    await waitFor(() => expect(screen.getByLabelText('直流分析状态')).toHaveTextContent('分析完成'))
    fireEvent.click(within(screen.getByRole('region', { name: '支路结果表' })).getByRole('button', { name: 'F1' }))
    expect(document.querySelector('.editor-component.dc-highlight')).toHaveAttribute('data-component-id', p.sheets[0]!.components[2]!.id)
    fireEvent.click(screen.getByRole('button', { name: '旋转 90°' }))
    expect(document.querySelector('.dc-annotation')).toBeNull()
    expect(screen.getByLabelText('直流分析状态')).toHaveTextContent('结果已过期')
  })
  it('exposes DC action only for sixteen compatible templates', () => {
    expect(circuitTemplates.filter(t => t.capabilities.dc)).toHaveLength(16)
    const onOpen = vi.fn().mockReturnValue(true)
    render(<CircuitAtlas onOpen={onOpen} />)
    fireEvent.click(screen.getByRole('button', { name: '使用直流分析' }))
    expect(onOpen).toHaveBeenLastCalledWith(expect.objectContaining({ title: '电阻串联电路' }), 'dc')
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'RC 充电' } })
    fireEvent.click(screen.getByRole('button', { name: 'RC 充电连接拓扑' }))
    expect(screen.queryByRole('button', { name: '使用直流分析' })).not.toBeInTheDocument()
  })
})
