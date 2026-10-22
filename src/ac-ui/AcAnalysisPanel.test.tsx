import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { AcAnalysisPanel } from './AcAnalysisPanel'
import { circuitTemplates, instantiateTemplate } from '../atlas'
import { SchematicEditor } from '../editor'
import type { SchematicEditorHandle } from '../editor'
import { applyEdit } from '../editing'
import { acEngine, createAcInput, parseAcSettings } from '../ac'
import type { JsonObject } from '../engineering'
import { createProjectDocument, deserializeProject, serializeProject } from '../project-format'

describe('AC editor and experiment boundaries', () => {
  it.each(circuitTemplates.filter(t => t.capabilities.ac))('$id has a real portable source/probe configuration and solvable sweep', async template => {
    const original = instantiateTemplate(template.id), restored = await deserializeProject(await serializeProject(await createProjectDocument(original, { name: 'AC fixture', version: '2.4.0' })))
    if (restored.kind !== 'ready') throw new Error('roundtrip')
    const p = restored.document.project, id = p.sheets[0]!.id, settings = parseAcSettings((p.extensions['org.stray.ac'] as JsonObject)[id] as JsonObject)
    const result = await acEngine.run(await createAcInput(p, id, settings), { signal: new AbortController().signal, readAsset: () => Promise.resolve(new Uint8Array()), onProgress: () => {} })
    expect(result.outcome.kind, JSON.stringify(result.outcome)).toBe('success')
    if (result.outcome.kind === 'success') { expect(result.outcome.value.sweep!.points.every(p => p.kind === 'available')).toBe(true); expect(result.outcome.value.sweep!.analyticalReference).not.toBeNull() }
  })
  it('uses real Bode cursor values, invalidates source/frequency and topology edits, and saves settings', async () => {
    const p = instantiateTemplate('rc-lowpass'), id = p.sheets[0]!.id, onSave = vi.fn(), onHighlight = vi.fn(), view = render(<AcAnalysisPanel project={p} sheetId={id} onSave={onSave} onHighlight={onHighlight} />)
    fireEvent.change(screen.getByLabelText('单频频率 / Hz'), { target: { value: 1 / (2 * Math.PI * .001) } })
    fireEvent.click(screen.getByRole('button', { name: '运行频率扫描' }))
    await waitFor(() => expect(screen.getByLabelText('交流分析状态')).toHaveTextContent('分析完成'))
    expect(screen.getByTestId('ac-analytical')).toHaveTextContent('159.1549 Hz')
    fireEvent.change(screen.getByLabelText('频点游标'), { target: { value: 88 } })
    expect(screen.getByLabelText('频点读数')).toHaveTextContent('158.4893 Hz')
    const table = screen.getByRole('region', { name: '交流支路结果表' }); fireEvent.click(within(table).getByRole('button', { name: 'R1' }))
    expect(onHighlight).toHaveBeenLastCalledWith(expect.objectContaining({ revision: p.revision }))
    fireEvent.change(screen.getByLabelText('V1 相位 / °'), { target: { value: 45 } })
    expect(screen.getByLabelText('交流分析状态')).toHaveTextContent('结果已过期'); expect(screen.queryByLabelText('Bode 频率响应')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '保存交流配置' })); expect(onSave).toHaveBeenLastCalledWith(expect.objectContaining({ sources: [expect.objectContaining({ magnitudeRms: 1, phaseDegrees: 45 })] }))
    fireEvent.click(screen.getByRole('button', { name: '运行单频交流分析' })); await waitFor(() => expect(screen.getByLabelText('交流分析状态')).toHaveTextContent('分析完成'))
    const r = p.sheets[0]!.components.find(c => c.reference === 'R1')!, changed = applyEdit(p, id, { type: 'properties', id: r.id, reference: 'R1', parameters: { resistance: { kind: 'quantity', quantity: { value: 2000, unit: 'ohm' } } } })
    view.rerender(<AcAnalysisPanel project={changed} sheetId={id} onSave={onSave} onHighlight={onHighlight} />)
    expect(screen.getByLabelText('交流分析状态')).toHaveTextContent('结果已过期'); expect(screen.queryByRole('region', { name: '交流支路结果表' })).not.toBeInTheDocument()
  })
  it('opens editor AC mode and saving configuration participates in undo history', () => {
    const ref = createRef<SchematicEditorHandle>(); render(<SchematicEditor ref={ref} />)
    act(() => { expect(ref.current!.openTemplate(instantiateTemplate('rc-highpass'), 'ac')).toBe(true) })
    expect(screen.getByLabelText('交流分析面板')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('V1 RMS / V'), { target: { value: 2 } }); fireEvent.click(screen.getByRole('button', { name: '保存交流配置' }))
    expect(screen.getByRole('button', { name: '撤销' })).not.toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: '撤销' })); expect(screen.getByRole('button', { name: '重做' })).not.toBeDisabled()
  })
})
