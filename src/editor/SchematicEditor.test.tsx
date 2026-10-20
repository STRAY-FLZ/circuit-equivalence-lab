import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { webcrypto } from 'node:crypto'
import App from '../App'
import { SchematicEditor } from './SchematicEditor'
import { applyEdit, newEditorProject } from '../editing'
import { createEngineeringProject, createId } from '../engineering'
import { createProjectDocument, deserializeProject, serializeProject } from '../project-format'

beforeEach(() => {
  Object.defineProperty(SVGSVGElement.prototype, 'getScreenCTM', { configurable: true, value: () => ({ inverse: () => ({}) }) })
  Object.defineProperty(SVGSVGElement.prototype, 'createSVGPoint', { configurable: true, value() { return { x: 0, y: 0, matrixTransform() { return { x: this.x, y: this.y } } } } })
  window.localStorage.clear()
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: vi.fn().mockReturnValue({ matches: false }) })
})
afterEach(() => vi.unstubAllGlobals())
const button = (name: string) => screen.getByRole('button', { name })
const canvas = () => screen.getByRole('application', { name: '原理图编辑画布' })
function place(x = 200, y = 200) { fireEvent.click(button('电阻 R')); fireEvent.click(canvas(), { clientX: x, clientY: y }) }
function importText(text: string) {
  const bytes = new TextEncoder().encode(text)
  const file = new File([text], 'test.json', { type: 'application/json' })
  Object.defineProperty(file, 'arrayBuffer', { value: () => Promise.resolve(bytes.buffer) })
  fireEvent.change(screen.getByLabelText('打开工程文件'), { target: { files: [file] } })
}

describe('schematic editor UI', () => {
  it('places, edits, rotates, deletes and restores a real component with stable identity', () => {
    render(<SchematicEditor />); place()
    const id = button('R1 元件').getAttribute('data-component-id')
    fireEvent.change(screen.getByLabelText('元件标识'), { target: { value: 'R_LOAD' } })
    fireEvent.change(screen.getByLabelText('电阻值'), { target: { value: '330' } })
    fireEvent.click(button('应用属性'))
    expect(button('R_LOAD 元件')).toHaveAttribute('data-component-id', id)
    fireEvent.click(button('旋转 90°'))
    expect(button('R_LOAD.1 引脚')).toHaveAttribute('cy', '160')
    fireEvent.click(button('删除元件')); expect(screen.queryByRole('button', { name: 'R_LOAD 元件' })).not.toBeInTheDocument()
    fireEvent.click(button('撤销')); expect(button('R_LOAD 元件')).toHaveAttribute('data-component-id', id)
    fireEvent.click(button('重做')); expect(screen.getByTestId('editor-summary')).toHaveTextContent('0 个元件')
  })
  it('wires real pins and displays the derived connected pin list', () => {
    render(<SchematicEditor />); place(); place(400, 200)
    fireEvent.click(button('接线 W'))
    fireEvent.click(button('R1.2 引脚')); fireEvent.click(button('R2.1 引脚'))
    expect(screen.getByTestId('editor-summary')).toHaveTextContent('2 个元件 · 1 条导线 · 3 个电气网络')
    fireEvent.click(button('选择 V')); fireEvent.click(button('R1.2 引脚'))
    expect(screen.getByText('2 个连接点 · 2 个元件引脚')).toBeInTheDocument()
    expect(screen.getByText('R2.1', { selector: 'li' })).toBeInTheDocument()
    fireEvent.click(button('导线 1')); fireEvent.click(button('删除导线'))
    expect(screen.getByTestId('editor-summary')).toHaveTextContent('0 条导线 · 4 个电气网络')
  })
  it('shows failed property feedback without changing the previous component', () => {
    render(<SchematicEditor />); place()
    fireEvent.change(screen.getByLabelText('电阻值'), { target: { value: '-1' } })
    fireEvent.click(button('应用属性'))
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('100 Ω')).toBeInTheDocument()
    expect(button('撤销')).toBeEnabled()
  })
  it('selection and zoom do not consume undo steps; shortcuts do not intercept input edits', () => {
    render(<SchematicEditor />); place()
    fireEvent.click(button('放大画布')); fireEvent.click(button('R1.1 引脚'))
    fireEvent.keyDown(canvas(), { key: 'z', ctrlKey: true })
    expect(screen.getByTestId('editor-summary')).toHaveTextContent('0 个元件')
    fireEvent.keyDown(canvas(), { key: 'z', ctrlKey: true, shiftKey: true })
    expect(button('R1 元件')).toBeInTheDocument()
    fireEvent.click(button('R1 元件'))
    fireEvent.keyDown(screen.getByLabelText('元件标识'), { key: 'Delete' })
    expect(button('R1 元件')).toBeInTheDocument()
    fireEvent.keyDown(canvas(), { key: 'Delete' })
    expect(screen.getByTestId('editor-summary')).toHaveTextContent('0 个元件')
  })
  it('exports using B format and opens the actual file with identity and geometry intact', async () => {
    let exported: Blob | undefined
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn((blob: Blob) => { exported = blob; return 'blob:test' }) })
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() })
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => { })
    render(<SchematicEditor />); place()
    const id = button('R1 元件').getAttribute('data-component-id')
    fireEvent.click(button('导出工程'))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('工程文件已导出'))
    expect(exported).toBeDefined()
    const text = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : ''); reader.onerror = reject; reader.readAsText(exported!) })
    const parsed = await deserializeProject(text)
    expect(parsed.kind).toBe('ready')
    fireEvent.click(button('新建工程')); expect(screen.getByTestId('editor-summary')).toHaveTextContent('0 个元件')
    importText(text)
    await waitFor(() => expect(button('R1 元件')).toHaveAttribute('data-component-id', id))
    expect(button('R1.1 引脚')).toHaveAttribute('cx', '160')
    expect(button('撤销')).toBeDisabled()
  })
  it('rejects invalid and future-version files without replacing the active project', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<SchematicEditor />); place(); const id = button('R1 元件').getAttribute('data-component-id')
    for (const text of ['{broken', JSON.stringify({ format: 'org.stray.electronics.project', formatVersion: 99 })]) {
      importText(text); await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
      expect(button('R1 元件')).toHaveAttribute('data-component-id', id)
    }
  })
  it('retains inline asset bytes and opaque engineering metadata across UI open/edit/export', async () => {
    vi.stubGlobal('crypto', webcrypto)
    const initial = newEditorProject(), placed = applyEdit(initial, initial.sheets[0]!.id, { type: 'add', kind: 'resistor', position: { x: 200, y: 200 } })
    const assetId = createId()
    const p = createEngineeringProject({ ...placed, assets: [{ id: assetId, mediaType: 'text/plain', byteLength: 3, sha256: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad' }], extensions: { 'fixture.owner': { notes: ['中文', 'keep order'] } }, experiments: [{ id: createId(), title: '实验记录', analysisIds: [], datasetIds: [], notes: '保留元数据' }] })
    const assets = [{ assetId, encoding: 'base64' as const, data: 'YWJj' }]
    const text = await serializeProject(await createProjectDocument(p, { name: 'fixture', version: '0.1.0' }, assets))
    let exported: Blob | undefined
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn((blob: Blob) => { exported = blob; return 'blob:asset-test' }) })
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() })
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => { })
    render(<SchematicEditor />); importText(text)
    await waitFor(() => expect(button('R1 元件')).toBeInTheDocument())
    fireEvent.click(button('R1 元件')); fireEvent.click(button('旋转 90°'))
    fireEvent.click(button('导出工程'))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('工程文件已导出'))
    const saved = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : ''); reader.onerror = reject; reader.readAsText(exported!) })
    const result = await deserializeProject(saved)
    expect(result.kind).toBe('ready')
    if (result.kind !== 'ready') throw new Error('Expected valid project')
    expect(result.document.inlineAssets).toEqual(assets)
    expect(result.document.project.assets).toEqual(p.assets)
    expect(result.document.project.extensions).toEqual(p.extensions)
    expect(result.document.project.experiments).toEqual(p.experiments)
    expect(result.document.project.sheets[0]!.components[0]!.id).toBe(p.sheets[0]!.components[0]!.id)
  })
  it('honors cancel when replacing an unexported project', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<SchematicEditor />); place(); fireEvent.click(button('新建工程'))
    expect(button('R1 元件')).toBeInTheDocument()
  })
  it('opens geometry-free B projects without silently losing their engineering content', async () => {
    const p = newEditorProject(), withPart = applyEdit(p, p.sheets[0]!.id, { type: 'add', kind: 'capacitor', position: { x: 300, y: 200 } })
    const unplaced = createEngineeringProject({ ...withPart, sheets: withPart.sheets.map(s => ({ ...s, geometry: { placements: [], anchorPositions: {}, connectionRoutes: {} } })) })
    const text = await serializeProject(await createProjectDocument(unplaced, { name: 'fixture', version: '0.1.0' }))
    render(<SchematicEditor />); importText(text)
    await waitFor(() => expect(button('放置 C1')).toBeInTheDocument())
    fireEvent.click(button('放置 C1'))
    await waitFor(() => expect(button('C1 元件')).toBeInTheDocument())
    expect(button('C1.1 引脚')).toHaveAttribute('cx', '120')
  })
  it('preserves editor state across V1 navigation and uses the existing theme and home link', () => {
    render(<App />)
    expect(screen.getByRole('group', { name: '原始电路图' })).toBeInTheDocument()
    fireEvent.click(button('原理图编辑器')); place()
    fireEvent.click(screen.getByRole('switch', { name: '夜间模式' }))
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(screen.getByRole('link', { name: '返回首页' })).toHaveAttribute('href', 'https://stray-flz.github.io/stray-articles/')
    fireEvent.click(button('等效变换与课程'))
    expect(screen.getByRole('group', { name: '原始电路图' })).toBeInTheDocument()
    fireEvent.click(button('原理图编辑器'))
    expect(button('R1 元件')).toBeInTheDocument()
  })
})
