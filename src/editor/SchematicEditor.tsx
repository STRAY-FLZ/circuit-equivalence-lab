import { useCallback, useEffect, useId, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, Ref } from 'react'
import { ProjectValidationError, reviseProject } from '../engineering'
import type { EngineeringProject, Position } from '../engineering'
import { commitEdit, commitSnapshot, createHistory, emptySheet, newEditorProject, PALETTE, redoEdit, snap, undoEdit, wireRoute } from '../editing'
import type { EditOperation, Endpoint, PaletteKind, Selection } from '../editing'
import { createProjectDocument, deserializeProject, serializeProject } from '../project-format'
import type { InlineAsset, ProjectDocumentV1 } from '../project-format'
import type { AnalysisCapture } from '../analysis'
import type { DcSolution } from '../dc'
import type { AcResult } from '../ac'
import type { AnalogSolution } from '../analog'
import packageText from '../../package.json?raw'
import { buildEditorView, componentValueText, nearestAnchor, netInspection } from './view'
import { SymbolBody } from './SymbolBody'
import { ComponentProperties } from './Properties'
import { TransformationPanel } from './TransformationPanel'
import { writebackTransformation } from '../integration'
import type { TransformationHighlight, TransformationPreview } from '../integration'
import { TransientPanel } from '../transient-ui/TransientPanel'
import { AnalogPanel } from '../analog-ui/AnalogPanel'
import { AmplifierPanel } from '../amplifier-ui/AmplifierPanel'
import { AcAnalysisPanel } from '../ac-ui/AcAnalysisPanel'
import { DcAnalysisPanel } from '../dc-ui/DcAnalysisPanel'
import type { DcHighlight } from '../dc-ui/DcAnalysisPanel'
import { voltageDefined } from '../dc'
import './editor.css'

type Tool = 'select' | 'pan' | 'place' | 'wire' | 'junction' | 'ground' | 'label' | 'reference' | 'port'
interface Viewport { readonly x: number; readonly y: number; readonly zoom: number }
type Gesture = { pointerId: number; client: Position } & (
  | { kind: 'wire'; anchorId: string; source: Position; moved: boolean }
  | { kind: 'component'; id: string; world: Position; origin: Position }
  | { kind: 'pan'; origin: Position; scale: number }
)
interface WirePreview { sourceId: string; source: Position; end: Position; targetId: string | undefined }
const INITIAL_VIEW: Viewport = { x: 0, y: 0, zoom: 1 }
function fittedViewport(positions: Readonly<Record<string, Position>>): Viewport {
  const points = Object.values(positions)
  if (!points.length) return INITIAL_VIEW
  const xs = points.map(p => p.x), ys = points.map(p => p.y), minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys)
  const zoom = Math.min(2, 1000 / (maxX - minX + 160), 600 / (maxY - minY + 160))
  return { x: (minX + maxX) / 2 - 500 / zoom, y: (minY + maxY) / 2 - 300 / zoom, zoom }
}
const writer = { name: 'STRAY Electronics Lab', version: (JSON.parse(packageText) as { version: string }).version }
const tools: readonly [Tool, string][] = [['select', '选择 V'], ['pan', '平移'], ['wire', '接线 W'], ['junction', '结点 J'], ['ground', '接地 GND'], ['label', '网络标签'], ['port', '外部端口'], ['reference', '求解参考']]
function errorMessage(error: unknown): string {
  if (error instanceof ProjectValidationError) {
    const code = error.issues[0]?.code
    if (code === 'resistance' || code === 'positive') return '电阻必须是有限正数；理想短路请使用导线。'
    if (code === 'finite-number' || code === 'unit' || code === 'parameter-kind') return '参数必须是可表示的有限数值，并使用定义规定的单位。'
    if (code === 'reference') return '此操作会使已有引用失效，工程保持不变。'
    return '操作未保存：输入不符合工程约束，请检查参数和关联对象。'
  }
  return error instanceof Error ? error.message : '操作失败，工程保持不变。'
}

export interface SchematicEditorHandle { openDocument: (document: ProjectDocumentV1, mode?: 'dc' | 'ac' | 'transient' | 'analog' | 'amplifier') => boolean; openTemplate: (project: EngineeringProject, mode?: 'dc' | 'ac' | 'transient' | 'analog' | 'amplifier') => boolean }
export function SchematicEditor({ ref, onCapture, onSync, onSourceRevision, onOpenSignal, onWaveformCapture }: { readonly ref?: Ref<SchematicEditorHandle>; readonly onOpenSignal?: ((document: ProjectDocumentV1) => Promise<boolean>) | undefined; readonly onWaveformCapture?: ((document: ProjectDocumentV1, datasetId: string, channelId: string) => Promise<boolean>) | undefined; readonly onCapture?: ((document: ProjectDocumentV1, capture: AnalysisCapture<DcSolution> | AnalysisCapture<AcResult> | AnalysisCapture<AnalogSolution>) => Promise<boolean>) | undefined; readonly onSync?: ((document: ProjectDocumentV1) => Promise<boolean>) | undefined; readonly onSourceRevision?: (projectId: string, revision: string) => void }) {
  const [history, setHistory] = useState(() => createHistory(newEditorProject()))
  const [transformHighlight, setTransformHighlight] = useState<TransformationHighlight | null>(null)
  const [documentGeneration, setDocumentGeneration] = useState(0)
  const [transientOpen, setTransientOpen] = useState(false), [transientDirty, setTransientDirty] = useState(false)
  const [acOpen, setAcOpen] = useState(false)
  const [analogOpen, setAnalogOpen] = useState(false)
  const [amplifierOpen, setAmplifierOpen] = useState(false)
  const [dcOpen, setDcOpen] = useState(false), [dcReference, setDcReference] = useState('')
  const [dcHighlight, setDcHighlight] = useState<DcHighlight | null>(null)
  const project = history.present
  const [activeSheet, setActiveSheet] = useState<string | null>(null), sheetId = activeSheet ?? project.sheets[0]!.id
  const [selection, setSelection] = useState<Selection>(null), [tool, setTool] = useState<Tool>('select'), [kind, setKind] = useState<PaletteKind>('resistor')
  const [wireStart, setWireStart] = useState<Endpoint | null>(null), [label, setLabel] = useState('NET'), [labelScope, setLabelScope] = useState<'sheet' | 'project'>('sheet')
  const [viewport, setViewport] = useState(INITIAL_VIEW), [drag, setDrag] = useState<{ id: string; origin: Position } | undefined>()
  const gesture = useRef<Gesture | null>(null)
  const [wirePreview, setWirePreview] = useState<WirePreview | null>(null)
  const suppressClick = useRef(false)
  const [message, setMessage] = useState('从左侧选择元件，再点击画布放置。'), [error, setError] = useState(false), [busy, setBusy] = useState(false)
  const [assets, setAssets] = useState<readonly InlineAsset[]>([]), [savedRevision, setSavedRevision] = useState(project.revision)
  const latest = useRef({ history, assets })
  useLayoutEffect(() => { latest.current = { history, assets } }, [history, assets])
  const activeAssets = useMemo(() => assets.filter(a => project.assets.some(entry => entry.id === a.assetId)), [assets, project.assets])
  const svg = useRef<SVGSVGElement>(null), fileInput = useRef<HTMLInputElement>(null)
  const gridId = `editor-grid-${useId().replaceAll(':', '')}`
  const cancelGesture = useCallback(() => {
    const g = gesture.current; gesture.current = null
    if (g) suppressClick.current = true
    setDrag(undefined); setWirePreview(null)
    if (g && svg.current?.hasPointerCapture(g.pointerId)) svg.current.releasePointerCapture(g.pointerId)
  }, [])
  useEffect(() => {
    window.addEventListener('blur', cancelGesture)
    return () => window.removeEventListener('blur', cancelGesture)
  }, [cancelGesture])
  const view = useMemo(() => buildEditorView(project, sheetId, drag), [project, sheetId, drag]), nets = useMemo(() => netInspection(project), [project])
  const component = selection?.kind === 'component' ? view.sheet.components.find(c => c.id === selection.id) : undefined
  const anchorId = selection?.kind === 'anchor' ? selection.id : selection?.kind === 'connection' ? view.sheet.connections.find(c => c.id === selection.id)?.endpoints[0] : undefined
  const selectedNet = anchorId ? nets.anchorToNet[anchorId] : undefined, net = nets.nets.find(n => n.key === selectedNet)
  const activeHighlight = transformHighlight?.revision === project.revision && transformHighlight.sheetId === sheetId ? transformHighlight : null
  const activeDc = dcHighlight?.revision === project.revision && dcHighlight.sheetId === sheetId && (dcOpen || acOpen) ? dcHighlight : null
  const dcAt = activeDc?.componentId ? view.sheet.geometry.placements.find(p => p.componentId === activeDc.componentId)?.origin : activeDc ? view.positions[activeDc.anchorIds.find(id => sheet.ports.some(p => p.anchorId === id)) ?? activeDc.anchorIds[0]!] : undefined
  const announce = (text: string, failed = false) => { setMessage(text); setError(failed) }
  function edit(operation: EditOperation) {
    if (busy) return
    try { const next = commitEdit(history, sheetId, operation); setHistory(next); onSourceRevision?.(next.present.id, next.present.revision); announce('编辑已保存到当前工程。'); if (operation.type === 'delete') setSelection(null); return next.present }
    catch (failure) { announce(errorMessage(failure), true); return undefined }
  }
  function chooseTool(next: Tool) { cancelGesture(); setTool(next); setWireStart(null) }
  function commitTransformation(preview: TransformationPreview): boolean {
    if (busy) return false
    try {
      const next = writebackTransformation(project, preview)
      setHistory(commitSnapshot(history, project.revision, next)); onSourceRevision?.(next.id, next.revision); setSelection(null); chooseTool('select'); setTransformHighlight(null)
      setViewport(fittedViewport(next.sheets.find(s => s.id === sheetId)!.geometry.anchorPositions))
      announce('数值验证通过的变换已作为一次工程事务应用；可撤销或重做。')
      return true
    } catch (failure) { announce(errorMessage(failure), true); return false }
  }
  function undo() { if (busy) return; cancelGesture(); const next = undoEdit(history); setHistory(next); onSourceRevision?.(next.present.id, next.present.revision); setSelection(null); setWireStart(null); announce('已撤销；恢复内容并生成新的工程修订。') }
  function redo() { if (busy) return; cancelGesture(); const next = redoEdit(history); setHistory(next); onSourceRevision?.(next.present.id, next.present.revision); setSelection(null); setWireStart(null); announce('已重做。') }
  function world(event: { readonly clientX: number; readonly clientY: number }): Position {
    const matrix = svg.current?.getScreenCTM()
    if (!matrix) return { x: 0, y: 0 }
    const point = svg.current!.createSVGPoint(); point.x = event.clientX; point.y = event.clientY
    const result = point.matrixTransform(matrix.inverse()); return { x: result.x, y: result.y }
  }
  function endpoint(point: Position): Endpoint { const scale = svg.current?.getScreenCTM()?.a ?? viewport.zoom; const id = nearestAnchor(view.positions, point, 12 / scale); return id ? { anchorId: id } : { position: snap(point) } }
  function activate(at: Endpoint) {
    if (busy) return
    if (tool === 'wire') {
      if (!wireStart) { setWireStart(at); announce('已选起点；点击另一个引脚或空白位置完成接线。') }
      else if (edit({ type: 'connect', from: wireStart, to: at })) { setWireStart(null); announce('导线已创建。交叉位置不会自动导通。') }
    } else if (['ground', 'label', 'reference', 'port'].includes(tool)) {
      edit({ type: 'marker', kind: tool as 'ground' | 'label' | 'reference' | 'port', at, name: label, scope: labelScope })
    } else if ('anchorId' in at) setSelection({ kind: 'anchor', id: at.anchorId })
  }
  function canvasClick(event: React.MouseEvent<SVGSVGElement>) {
    if (suppressClick.current) { suppressClick.current = false; return }
    if (busy || gesture.current) return
    const point = world(event)
    if (tool === 'place') {
      const next = edit({ type: 'add', kind, position: snap(point) })
      const added = next?.sheets.find(s => s.id === sheetId)?.components.at(-1)
      if (added) { chooseTool('select'); setSelection({ kind: 'component', id: added.id }) }
    } else if (tool === 'wire' || ['ground', 'label', 'reference', 'port'].includes(tool)) activate(endpoint(point))
    else if (tool === 'select') setSelection(null)
  }
  function pointerDown(event: ReactPointerEvent<SVGSVGElement>) {
    if (event.button !== 0 || gesture.current || tool !== 'pan' || busy) return
    event.preventDefault(); const matrix = svg.current?.getScreenCTM()
    gesture.current = { kind: 'pan', pointerId: event.pointerId, client: { x: event.clientX, y: event.clientY }, origin: { x: viewport.x, y: viewport.y }, scale: Math.hypot(matrix?.a ?? 1, matrix?.b ?? 0) }
    svg.current?.setPointerCapture(event.pointerId)
  }
  function beginWire(event: ReactPointerEvent<SVGCircleElement>, id: string, source: Position) {
    if (tool === 'pan') return
    event.stopPropagation()
    if (event.button !== 0 || gesture.current || busy || (tool !== 'select' && tool !== 'wire')) return
    event.preventDefault(); svg.current?.focus()
    gesture.current = { kind: 'wire', pointerId: event.pointerId, anchorId: id, source, moved: false, client: { x: event.clientX, y: event.clientY } }
    setSelection({ kind: 'anchor', id }); setWirePreview({ sourceId: id, source, end: source, targetId: undefined })
    svg.current?.setPointerCapture(event.pointerId)
  }
  function previewAt(g: Extract<Gesture, { kind: 'wire' }>, event: { clientX: number; clientY: number }): WirePreview {
    const point = world(event), matrix = svg.current?.getScreenCTM()
    const scale = Math.hypot(matrix?.a ?? viewport.zoom, matrix?.b ?? 0)
    const nearby = nearestAnchor(view.positions, point, 14 / scale)
    const targetId = nearby && nearby !== g.anchorId && !view.sheet.connections.some(c => c.endpoints.includes(g.anchorId) && c.endpoints.includes(nearby)) ? nearby : undefined
    return { sourceId: g.anchorId, source: g.source, end: targetId ? view.positions[targetId]! : point, targetId }
  }
  function beginComponent(event: ReactPointerEvent<SVGGElement>, id: string, origin: Position) {
    if (event.button !== 0 || gesture.current || (tool !== 'select' && tool !== 'place') || busy) return
    if (tool === 'place') chooseTool('select')
    event.stopPropagation(); event.preventDefault(); setSelection({ kind: 'component', id })
    gesture.current = { kind: 'component', pointerId: event.pointerId, id, client: { x: event.clientX, y: event.clientY }, world: world(event), origin }
    svg.current?.setPointerCapture(event.pointerId)
  }
  function pointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    const g = gesture.current; if (!g || g.pointerId !== event.pointerId) return
    if (g.kind === 'pan') setViewport({ ...viewport, x: g.origin.x - (event.clientX - g.client.x) / g.scale, y: g.origin.y - (event.clientY - g.client.y) / g.scale })
    else if (g.kind === 'wire') {
      g.moved ||= Math.hypot(event.clientX - g.client.x, event.clientY - g.client.y) >= 3
      if (g.moved) setWireStart(null)
      setWirePreview(previewAt(g, event))
    } else { const point = world(event); setDrag({ id: g.id, origin: snap({ x: g.origin.x + point.x - g.world.x, y: g.origin.y + point.y - g.world.y }) }) }
  }
  function pointerUp(event: ReactPointerEvent<SVGSVGElement>) {
    const g = gesture.current; if (!g || g.pointerId !== event.pointerId) return
    gesture.current = null
    if (g) suppressClick.current = true
    if (g.kind === 'wire') {
      const preview = previewAt(g, event)
      const moved = g.moved || Math.hypot(event.clientX - g.client.x, event.clientY - g.client.y) >= 3
      if (!moved) activate({ anchorId: g.anchorId })
      else {
        setWireStart(null)
        if (preview.targetId) {
          if (edit({ type: 'connect', from: { anchorId: g.anchorId }, to: { anchorId: preview.targetId } })) announce('导线已创建。交叉位置不会自动导通。')
        } else announce('接线已取消：请拖到其他未直连的引脚或连接点。')
      }
    }
    if (g.kind === 'component' && drag && Math.hypot(drag.origin.x - g.origin.x, drag.origin.y - g.origin.y) > 0) edit({ type: 'move', id: g.id, position: drag.origin })
    setDrag(undefined); setWirePreview(null)
    if (svg.current?.hasPointerCapture(event.pointerId)) svg.current.releasePointerCapture(event.pointerId)
  }
  function zoom(factor: number) { setViewport(v => { const next = Math.max(0.1, Math.min(8, v.zoom * factor)); return { x: v.x + 500 / v.zoom - 500 / next, y: v.y + 300 / v.zoom - 300 / next, zoom: next } }) }
  function fit() {
    setViewport(fittedViewport(view.positions))
  }
  async function save() {
    if (busy) return; setBusy(true)
    try {
      const doc = await createProjectDocument(project, writer, activeAssets), text = await serializeProject(doc)
      const url = URL.createObjectURL(new Blob([text], { type: 'application/json;charset=utf-8' })), link = document.createElement('a')
      link.href = url; link.download = `${project.title.replace(/[<>:"/\\|?*]/g, '-') || 'circuit'}.straylab.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
      setSavedRevision(project.revision); announce('工程文件已导出，可使用“打开工程”重新载入。')
    } catch (failure) { announce(failure instanceof ProjectValidationError ? errorMessage(failure) : '导出失败，当前工程保持不变。', true) } finally { setBusy(false) }
  }
  function reset(projectToOpen: EngineeringProject, inlineAssets: readonly InlineAsset[], saved: boolean) {
    setDocumentGeneration(n => n + 1); setTransientDirty(false); setTransientOpen(false); setAcOpen(false); setDcOpen(false); setDcReference(''); setDcHighlight(null)
    setHistory(createHistory(projectToOpen)); setAssets(inlineAssets); setActiveSheet(null); setSelection(null); chooseTool('select'); setViewport(INITIAL_VIEW); setSavedRevision(saved ? projectToOpen.revision : '')
  }
  const mayReplace = () => project.revision === savedRevision && !transientDirty || window.confirm('当前工程有未导出的修改，继续将替换当前工程。是否继续？')
  useImperativeHandle(ref, () => ({ openDocument(document, mode) {
    if (busy || !mayReplace()) return false
    cancelGesture(); setTransformHighlight(null); setWireStart(null); reset(document.project, document.inlineAssets, true); setAmplifierOpen(mode === 'amplifier'); setAnalogOpen(mode === 'analog'); setTransientOpen(mode === 'transient'); setAcOpen(mode === 'ac'); setDcOpen(mode === 'dc'); setDcReference(mode === 'dc' ? document.project.sheets[0]?.ports.find(p => ['COM', 'B'].includes(p.label))?.anchorId ?? '' : ''); setViewport(fittedViewport(document.project.sheets[0]!.geometry.anchorPositions)); announce('已载入电赛工程；运行后可关联真实结果，或回传编辑后的工程。'); return true
  }, openTemplate(next, mode) {
    if (busy || !mayReplace()) return false
    cancelGesture(); setTransformHighlight(null); setWireStart(null)
    reset(next, [], false); setAmplifierOpen(mode === 'amplifier'); setAnalogOpen(mode === 'analog'); setTransientOpen(mode === 'transient'); setAcOpen(mode === 'ac'); setDcOpen(mode === 'dc'); setDcReference(mode === 'dc' ? next.sheets[0]?.ports.find(p => ['COM', 'B'].includes(p.label))?.anchorId ?? '' : ''); setDcHighlight(null); setViewport(fittedViewport(next.sheets[0]!.geometry.anchorPositions))
    announce('已打开独立模板工程，可编辑、撤销并导出保存。')
    return true
  } }))
  async function open(file: File) {
    if (busy || !mayReplace()) return; setBusy(true)
    try {
      const result = await deserializeProject(new Uint8Array(await file.arrayBuffer()))
      if (result.kind !== 'ready') { announce(result.kind === 'unrecognized' ? '此工程格式、版本或扩展尚不支持，当前工程保持不变。' : '文件数据或资产校验失败，当前工程保持不变。', true); return }
      const p = result.document.project, hasSheet = p.sheets.length > 0
      reset(hasSheet ? p : reviseProject(p, p.revision, { sheets: [emptySheet()] }), result.document.inlineAssets, hasSheet)
      announce(hasSheet ? '工程已打开，连接、参数与身份已保留。' : '空工程已打开，并建立第一张空白图纸。')
    } catch { announce('读取文件失败，当前工程保持不变。', true) } finally { setBusy(false) }
  }
  const sheet = view.sheet
  const valueText = (id: string) => { const c = sheet.components.find(c => c.id === id); return c ? componentValueText(c, project.definitions.find(d => d.id === c.definitionId)!.kind) : '' }
  return <section className="schematic-editor" aria-label="原理图编辑工作区" aria-busy={busy} onKeyDown={event => {
    const target = event.target as HTMLElement
    if (target.closest('input,select,textarea,[contenteditable=true],.transient-panel,.analog-panel,.amplifier-panel')) return
    const modified = event.ctrlKey || event.metaKey, key = event.key.toLowerCase()
    if (modified && key === 's') { event.preventDefault(); void save(); return }
    if (modified && key === 'o') { event.preventDefault(); fileInput.current?.click(); return }
    if (modified && key === 'z') { event.preventDefault(); if (event.shiftKey) redo(); else undo(); return }
    if (modified && key === 'y') { event.preventDefault(); redo(); return }
    if (event.key === 'Escape') { chooseTool('select'); return }
    if ((event.key === 'Delete' || event.key === 'Backspace') && selection) { event.preventDefault(); edit({ type: 'delete', selection }); return }
    if (key === 'r' && component) { event.preventDefault(); edit({ type: 'rotate', id: component.id }); return }
    if (key === 'w') chooseTool('wire'); else if (key === 'j') chooseTool('junction'); else if (key === 'v') chooseTool('select')
    if (event.key.startsWith('Arrow') && component) { event.preventDefault(); const at = sheet.geometry.placements.find(p => p.componentId === component.id)?.origin ?? { x: 200, y: 200 }; edit({ type: 'move', id: component.id, position: { x: at.x + (event.key === 'ArrowRight' ? 20 : event.key === 'ArrowLeft' ? -20 : 0), y: at.y + (event.key === 'ArrowDown' ? 20 : event.key === 'ArrowUp' ? -20 : 0) } }) }
  }}>
    <div className="editor-heading"><div><p className="eyebrow">工程 / 自由编辑</p><h1>原理图编辑器</h1><p className="muted">编辑真实连接，预览电阻等效变换，验证后应用或分步学习。</p></div>
      <div className="editor-file-actions"><button disabled={busy} onClick={() => { if (mayReplace()) { reset(newEditorProject(), [], true); announce('已新建空白工程。') } }}>新建工程</button><button disabled={busy} onClick={() => fileInput.current?.click()}>打开工程</button><input hidden ref={fileInput} aria-label="打开工程文件" type="file" accept=".json,application/json" onChange={event => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ''; if (file) void open(file) }} /><button disabled={busy} onClick={() => { void save() }}>导出工程</button></div>
    </div>
    <div className="editor-project-row"><form key={`title-${project.revision}`} onSubmit={event => { event.preventDefault(); const title = new FormData(event.currentTarget).get('title'); if (typeof title === 'string') edit({ type: 'title', title }) }}><label>工程名称<input name="title" aria-label="工程名称" defaultValue={project.title} /></label><button disabled={busy}>更新名称</button></form><span>{project.revision === savedRevision ? '已导出或未修改' : '有未导出的修改'}</span><label>当前图纸<select aria-label="当前图纸" value={sheetId} onChange={event => { cancelGesture(); setActiveSheet(event.target.value); setSelection(null); setWireStart(null) }}>{project.sheets.map(s => <option key={s.id} value={s.id}>{s.title || '未命名图纸'}</option>)}</select></label></div>
    {onSync && <button disabled={busy} onClick={() => { setBusy(true); void createProjectDocument(project, writer, activeAssets).then(onSync).then(ok => { if (!ok) announce('回传未完成，当前工程保留，请检查电赛工作台。', true) }).catch(e => announce(errorMessage(e), true)).finally(() => setBusy(false)) }}>回传当前工程到电赛</button>}
    <div className="editor-toolbar" aria-label="编辑工具"><button disabled={!history.past.length || busy} onClick={undo}>撤销</button><button disabled={!history.future.length || busy} onClick={redo}>重做</button><span className="editor-divider" />{tools.map(([key, name]) => <button key={key} disabled={busy} aria-pressed={tool === key} onClick={() => chooseTool(key)}>{name}</button>)}<span className="editor-divider" /><button onClick={() => zoom(1.25)} aria-label="放大画布">＋</button><button onClick={() => zoom(0.8)} aria-label="缩小画布">−</button><button onClick={fit}>适合视图</button><button onClick={() => setViewport(INITIAL_VIEW)}>重置视图</button><span>{Math.round(viewport.zoom * 100)}%</span><button aria-pressed={amplifierOpen} onClick={() => setAmplifierOpen(!amplifierOpen)}>放大器频率响应</button><button aria-pressed={analogOpen} onClick={() => setAnalogOpen(!analogOpen)}>模拟电子</button><button aria-pressed={dcOpen} onClick={() => { setDcOpen(!dcOpen); setDcHighlight(null) }}>直流分析</button><button aria-pressed={acOpen} onClick={() => { setAcOpen(!acOpen); setDcHighlight(null) }}>交流分析与滤波</button><button aria-pressed={transientOpen} onClick={() => { if (transientOpen && transientDirty && !window.confirm('暂态设置或模拟结果尚未保存到工程，关闭将丢失这些修改。继续？')) return; setTransientDirty(false); setTransientOpen(!transientOpen); setDcHighlight(null) }}>暂态分析</button></div>
    {(tool === 'label' || tool === 'port') && <div className="editor-marker-options"><label>标注名称<input aria-label="标注名称" value={label} onChange={e => setLabel(e.target.value)} /></label>{tool === 'label' && <label>标签作用域<select value={labelScope} onChange={e => setLabelScope(e.target.value as 'sheet' | 'project')}><option value="sheet">当前图纸</option><option value="project">整个工程</option></select></label>}</div>}
    <p role={error ? 'alert' : 'status'} className={`editor-message ${error ? 'error' : ''}`}>{message}</p>
    <div className="editor-layout"><aside className="editor-palette" aria-label="元件库"><h2>01 / 元件</h2>{(Object.keys(PALETTE) as PaletteKind[]).map(key => <button key={key} aria-pressed={tool === 'place' && kind === key} disabled={busy} onClick={() => { setKind(key); chooseTool('place'); announce(`点击画布放置${PALETTE[key].title}；Esc 返回选择。`) }}>{PALETTE[key].title} {PALETTE[key].prefix}</button>)}<p className="muted">先选元件，再点画布。拖动元件本体移动；拖动引脚接线；R 旋转；Delete 删除。</p><p className="muted">GND 建立显式地网连接；求解参考只标记零电位，不连接网络。</p></aside>
      <div className="editor-canvas-area"><p className="editor-summary" data-testid="editor-summary">{sheet.components.length} 个元件 · {sheet.connections.length} 条导线 · {nets.nets.filter(n => n.anchorIds.some(id => sheet.anchors.some(a => a.id === id))).length} 个电气网络</p>
        <svg ref={svg} className={`editor-canvas tool-${tool}`} role="application" aria-label="原理图编辑画布" tabIndex={0} viewBox={`${viewport.x} ${viewport.y} ${1000 / viewport.zoom} ${600 / viewport.zoom}`} onClick={canvasClick} onClickCapture={event => { if (suppressClick.current) { suppressClick.current = false; event.stopPropagation() } }} onPointerDownCapture={() => { suppressClick.current = false }} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={event => { if (gesture.current?.pointerId === event.pointerId) cancelGesture() }} onLostPointerCapture={event => { if (gesture.current?.pointerId === event.pointerId) cancelGesture() }} onBlur={cancelGesture}>
          <defs><pattern id={gridId} width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="0" cy="0" r="1" className="editor-grid-dot" /></pattern></defs><rect x={viewport.x} y={viewport.y} width={1000 / viewport.zoom} height={600 / viewport.zoom} fill={`url(#${gridId})`} />
          {view.wires.map(({ connection, route }) => { const path = route.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join(' '); return <g key={connection.id} className={`editor-wire ${activeDc?.anchorIds.includes(connection.endpoints[0]) ? 'dc-highlight' : ''} ${selection?.kind === 'connection' && selection.id === connection.id ? 'selected' : ''} ${selectedNet && nets.anchorToNet[connection.endpoints[0]] === selectedNet ? 'net-highlight' : ''}`} data-connection-id={connection.id}><path d={path} className="wire-underlay" /><path d={path} className="wire-ink" /><path d={path} className="wire-hit" role="button" tabIndex={0} aria-label={`导线 ${sheet.connections.indexOf(connection) + 1}`} onClick={event => { event.stopPropagation(); if (tool === 'junction') edit({ type: 'junction', connectionId: connection.id, position: world(event) }); else setSelection({ kind: 'connection', id: connection.id }) }} onKeyDown={event => { if (event.key === 'Enter') { event.stopPropagation(); setSelection({ kind: 'connection', id: connection.id }) } }} /></g> })}
          {view.components.map(({ component: c, definition, placement: p, symbol }) => <g key={c.id} className={`editor-component ${activeDc?.componentId === c.id ? 'dc-highlight' : ''} ${activeHighlight?.componentIds.includes(c.id) ? 'candidate-highlight' : ''} ${selection?.kind === 'component' && selection.id === c.id ? 'selected' : ''}`} role="button" tabIndex={0} aria-label={`${c.reference} 元件`} data-component-id={c.id} onPointerDown={event => beginComponent(event, c.id, p.origin)} onClick={event => { event.stopPropagation(); suppressClick.current = false; setSelection({ kind: 'component', id: c.id }) }} onKeyDown={event => { if (event.key === 'Enter') { event.stopPropagation(); setSelection({ kind: 'component', id: c.id }) } }}>
            <g transform={`translate(${p.origin.x} ${p.origin.y}) rotate(${p.rotationDegrees}) scale(${p.mirrored ? -1 : 1} 1)`}><rect className="component-hit" x="-65" y="-36" width="130" height="72" />{!Object.keys(PALETTE).includes(definition.kind) && Object.entries(symbol.pinPositions).map(([key, at]) => <path key={key} d={`M${at.x} ${at.y}H${at.x < 0 ? -45 : 45}`} />)}<SymbolBody kind={definition.kind} /></g><text x={p.origin.x} y={p.origin.y - 45} textAnchor="middle">{c.reference}</text><text className="component-value" x={p.origin.x} y={p.origin.y + 50} textAnchor="middle">{valueText(c.id)}</text>
          </g>)}
          {sheet.anchors.map((a, i) => { const at = view.positions[a.id]; if (!at) return null; const owner = sheet.components.find(c => c.pins.some(p => p.anchorId === a.id)), pin = owner?.pins.find(p => p.anchorId === a.id), degree = sheet.connections.filter(c => c.endpoints.includes(a.id)).length; return <g key={a.id} className={`editor-anchor ${activeDc?.anchorIds.includes(a.id) ? 'dc-highlight' : ''} ${wirePreview?.targetId === a.id ? 'wire-target' : ''} ${wirePreview?.sourceId === a.id ? 'wire-source' : ''} ${activeHighlight?.anchorIds.includes(a.id) ? 'candidate-highlight' : ''} ${selection?.kind === 'anchor' && selection.id === a.id ? 'selected' : ''} ${selectedNet && nets.anchorToNet[a.id] === selectedNet ? 'net-highlight' : ''}`}>{wirePreview?.targetId === a.id && <circle className="wire-target-ring" cx={at.x} cy={at.y} r="10" />}<circle cx={at.x} cy={at.y} r={degree > 1 && !owner ? 5 : 4} data-anchor-id={a.id} className={degree > 1 && !owner ? 'junction-dot' : ''} role="button" tabIndex={0} aria-label={owner ? `${owner.reference}.${pin!.definitionPinKey} 引脚` : `连接点 ${i + 1}`} onClick={event => { event.stopPropagation(); activate({ anchorId: a.id }) }} onPointerDown={event => beginWire(event, a.id, at)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); activate({ anchorId: a.id }) } }} />{sheet.labels.filter(l => l.anchorId === a.id).map((l, j) => l.name === 'GND' ? <g key={l.id} className="editor-ground"><path d={`M${at.x} ${at.y}v16 m-12 0h24 m-20 5h16 m-12 5h8`} /><text x={at.x + 16} y={at.y + 28}>GND</text></g> : <text key={l.id} x={at.x + 8} y={at.y - 12 - j * 16}>{l.name}{l.scope === 'project' ? ' ↗' : ''}</text>)}{sheet.ports.filter(p => p.anchorId === a.id).map(p => <text key={p.id} x={at.x + 8} y={at.y + 20}>{p.label}</text>)}{sheet.references.filter(r => r.anchorId === a.id).map(r => <g key={r.id} className="editor-reference"><rect x={at.x - 9} y={at.y - 9} width="18" height="18" /><text x={at.x + 12} y={at.y - 24}>参考</text></g>)}</g> })}
          {activeDc && dcAt && <text className="dc-annotation" x={dcAt.x + 12} y={dcAt.y + (activeDc.componentId ? 100 : -32)}>{activeDc.text}</text>}
          {wirePreview && <path className={`editor-wire-preview ${wirePreview.targetId ? 'snapped' : ''}`} data-testid="wire-preview" data-source-id={wirePreview.sourceId} data-target-id={wirePreview.targetId} d={wireRoute(wirePreview.source, wirePreview.end).map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join(' ')} />}
          {(wireStart || wirePreview) && <text className="editor-wire-hint" x={viewport.x + 20 / viewport.zoom} y={viewport.y + 30 / viewport.zoom}>{wirePreview ? wirePreview.targetId ? '松开连接到双圈目标 · Esc 取消' : '拖到其他引脚或连接点 · Esc 取消' : '接线中：点击第二个端点 · Esc 取消'}</text>}
        </svg><p className="editor-legend">拖动引脚或连接点接线 · 虚线＝接线预览 · 双圈＝可连接目标 · Esc 取消 · 跨越不自动导通</p>
        {(view.unplaced.length > 0 || view.missingAnchors.length > 0) && <div className="editor-unplaced"><p>尚有 {view.unplaced.length} 个未放置元件、{view.missingAnchors.length} 个无坐标连接点；电气数据已完整保留。</p>{view.unplaced.map((c, i) => <button key={c.id} onClick={() => edit({ type: 'move', id: c.id, position: { x: 160 + i * 160, y: 200 } })}>放置 {c.reference}</button>)}</div>}
      </div>
      <aside className="editor-inspector" aria-label="属性与连接检查"><h2>02 / 属性与连接</h2>
        {component ? <><ComponentProperties key={`${component.id}-${project.revision}`} component={component} controllers={sheet.components.filter(c => voltageDefined(project.definitions.find(d => d.id === c.definitionId)!.kind))} definition={project.definitions.find(d => d.id === component.definitionId)!} onEdit={edit} /><div className="editor-inspector-actions"><button disabled={busy} onClick={() => edit({ type: 'rotate', id: component.id })}>旋转 90°</button><button disabled={busy} onClick={() => edit({ type: 'delete', selection: { kind: 'component', id: component.id } })}>删除元件</button></div><p>引脚连接</p>{component.pins.map(p => <button key={p.id} onClick={() => setSelection({ kind: 'anchor', id: p.anchorId })}>{component.reference}.{p.definitionPinKey} · N{nets.nets.findIndex(n => n.key === nets.anchorToNet[p.anchorId]) + 1}</button>)}</> : <>
          {selection?.kind === 'connection' && <button onClick={() => edit({ type: 'delete', selection })}>删除导线</button>}
          {anchorId ? <><h3>网络 N{nets.nets.findIndex(n => n.key === selectedNet) + 1}</h3><p>{net?.anchorIds.length ?? 0} 个连接点 · {net?.pinIds.length ?? 0} 个元件引脚</p><ul>{project.sheets.flatMap(s => s.components.flatMap(c => c.pins.filter(p => net?.pinIds.includes(p.id)).map(p => <li key={p.id}>{c.reference}.{p.definitionPinKey}</li>)))}</ul><details><summary>连接点身份</summary><p className="editor-id">{anchorId}</p></details>{[...sheet.labels, ...sheet.references, ...sheet.ports].filter(item => item.anchorId === anchorId).map(item => <div key={item.id} className="editor-marker-entry"><span>{'name' in item ? `标签 ${item.name}` : 'label' in item ? `端口 ${item.label}` : '求解参考（不连接）'}</span><button onClick={() => edit({ type: 'remove-marker', id: item.id })}>移除标记</button></div>)}{!sheet.components.some(c => c.pins.some(p => p.anchorId === anchorId)) && <button onClick={() => edit({ type: 'delete', selection: { kind: 'anchor', id: anchorId } })}>删除连接点及相连导线</button>}</> : <p className="muted">选择元件以编辑属性；点击引脚或导线可高亮真实电气网络。</p>}
        </>}
        <details className="editor-shortcuts"><summary>操作提示与快捷键</summary><p>V 选择，W 接线，J 结点，R 旋转，方向键微移，Delete 删除。Ctrl / ⌘ Z 撤销，Shift Z 或 Y 重做，S 导出，O 打开。</p><p>结点工具会显式连接点击处经过的导线。平移、缩放、选中和拖动预览不改变工程修订。</p></details>
      </aside>
    </div>
    {amplifierOpen && <AmplifierPanel key={`amplifier:${project.id}:${sheetId}:${documentGeneration}`} project={project} sheetId={sheetId} onCommit={(next, expected) => { const current = latest.current.history; if (current.present.revision !== expected) return false; setHistory(commitSnapshot(current, expected, next)); onSourceRevision?.(next.id, next.revision); return true }} />}
    {analogOpen && <AnalogPanel key={`analog:${project.id}:${sheetId}:${documentGeneration}`} project={project} sheetId={sheetId} onCapture={onCapture ? async capture => onCapture(await createProjectDocument(capture.project, writer, activeAssets), capture) : undefined} onCommit={(next, expected) => { const current = latest.current.history; if (current.present.revision !== expected) return false; setHistory(commitSnapshot(current, expected, next)); onSourceRevision?.(next.id, next.revision); return true }} />}
    {transientOpen && <TransientPanel key={`transient:${project.id}:${sheetId}:${documentGeneration}`} project={project} sheetId={sheetId} assets={activeAssets} writer={writer} onDirty={setTransientDirty} onOpenSignal={onOpenSignal} onCapture={onWaveformCapture} onPreset={(next, expected) => { const current = latest.current.history; if (current.present.revision !== expected) return false; setHistory(commitSnapshot(current, expected, next)); onSourceRevision?.(next.id, next.revision); return true }} onCommit={(document, expected) => { const current = latest.current; if (current.history.present.revision !== expected) return false; setHistory(commitSnapshot(current.history, expected, document.project)); setAssets([...current.assets, ...document.inlineAssets.filter(a => !current.assets.some(old => old.assetId === a.assetId))]); onSourceRevision?.(document.project.id, document.project.revision); announce('暂态数据已作为完整事务写入工程，可撤销/重做；请导出文件保存。'); return true }} />}
    {acOpen && <AcAnalysisPanel key={`ac:${project.id}:${sheetId}`} project={project} sheetId={sheetId} onHighlight={setDcHighlight} onCapture={onCapture ? async capture => onCapture(await createProjectDocument(capture.project, writer, activeAssets), capture) : undefined} onSave={settings => { const stored = project.extensions['org.stray.ac']; const sheets = stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : {}; const next = reviseProject(project, project.revision, { extensions: { ...project.extensions, 'org.stray.ac': { ...sheets, [sheetId]: { ...settings } } } }); setHistory(commitSnapshot(history, project.revision, next)); onSourceRevision?.(next.id, next.revision); setDcHighlight(null); announce('交流配置已保存到当前工程；请导出工程文件以保留。') }} />}
    {dcOpen && <DcAnalysisPanel key={`dc:${project.id}:${sheetId}`} project={project} sheetId={sheetId} initialReference={dcReference} onHighlight={setDcHighlight} onCapture={onCapture ? async capture => onCapture(await createProjectDocument(capture.project, writer, activeAssets), capture) : undefined} />}
    <TransformationPanel key={`${project.id}:${sheetId}`} project={project} sheetId={sheetId} {...(anchorId ? { selectedAnchorId: anchorId } : {})} busy={busy} onCommit={commitTransformation} onHighlight={setTransformHighlight} />
  </section>
}
