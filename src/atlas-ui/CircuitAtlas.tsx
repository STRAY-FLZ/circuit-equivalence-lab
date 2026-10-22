import { useId, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { EngineeringProject } from '../engineering'
import { circuitCategories, circuitTemplates, instantiateTemplate, matchesTemplate, textbookReference } from '../atlas'
import { SchematicPreview } from '../editor'
import './atlas.css'

function Disclosure({ title, open, onToggle, children, marker, className = '' }: { readonly title: ReactNode; readonly open: boolean; readonly onToggle: () => void; readonly children: ReactNode; readonly marker: string; readonly className?: string }) {
  const id = `atlas-${useId().replaceAll(':', '')}`
  return <div className={`atlas-disclosure ${className}`} data-atlas-id={marker} data-open={open}>
    <button type="button" className="atlas-toggle" aria-expanded={open} aria-controls={id} onClick={onToggle}><svg className="atlas-chevron" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="m5 3 5 5-5 5" /></svg>{title}</button>
    <div id={id} className="atlas-collapse" aria-hidden={!open} inert={!open}><div className="atlas-collapse-inner">{children}</div></div>
  </div>
}

export function CircuitAtlas({ onOpen }: { readonly onOpen: (project: EngineeringProject, mode?: 'dc') => boolean }) {
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set(['resistive', 'resistive.series-parallel']))
  const [selectedId, setSelectedId] = useState('resistor-series'), [query, setQuery] = useState(''), [libraryOpen, setLibraryOpen] = useState(false), [message, setMessage] = useState('')
  const detailHeading = useRef<HTMLHeadingElement>(null)
  const selected = circuitTemplates.find(t => t.id === selectedId)!, preview = useMemo(() => instantiateTemplate(selectedId), [selectedId])
  const term = query.trim().toLocaleLowerCase(), toggle = (id: string) => setExpanded(previous => { const next = new Set(previous); if (next.has(id)) next.delete(id); else next.add(id); return next })
  const matches = circuitTemplates.filter(t => matchesTemplate(t.id, term)), familyMatches = (name: string, categoryName: string) => `${name} ${categoryName}`.toLocaleLowerCase().includes(term)
  return <section className="circuit-atlas" aria-label="典型电路图谱工作区">
    <header className="atlas-heading"><p className="eyebrow">参考 / 连接 / 实验</p><h1>典型电路图谱</h1><p>按电路类型探索结构，从真实模板开始编辑。十二类 · {circuitCategories.reduce((n, c) => n + c.families.length, 0)} 个电路族 · {circuitTemplates.length} 个可编辑模板。</p><p className="muted">首批结构库持续扩充，并非教材全部内容。能查看或编辑，不代表已支持该电路的数值仿真。</p></header>
    <div className="atlas-layout">
      <aside className="atlas-library" aria-label="电路模板库" data-mobile-open={libraryOpen}>
        <button className="atlas-library-toggle" aria-expanded={libraryOpen} aria-controls="atlas-library-content" onClick={() => setLibraryOpen(!libraryOpen)}>{libraryOpen ? '收起电路目录' : '展开电路目录'}</button>
        <div id="atlas-library-content" className="atlas-library-content">
          <label className="atlas-search">查找电路、方法或章节<input type="search" aria-label="搜索电路图谱" value={query} onChange={e => setQuery(e.target.value)} placeholder="如 RC、叠加、第2章" /></label>
          <p className="atlas-count" role="status" aria-label="图谱搜索结果">{term ? `找到 ${matches.length} 个可用模板；匹配的规划电路族也会列出。` : '按类型展开，再选择模板。规划中表示尚无模板。'}</p>
          <nav aria-label="电路分类"><ul className="atlas-categories">{circuitCategories.map((category, index) => {
            const families = category.families.filter(f => !term || familyMatches(f.name, category.name) || matches.some(t => t.familyId === f.id))
            if (!families.length) return null
            const count = circuitTemplates.filter(t => t.categoryId === category.id).length
            return <li key={category.id}><Disclosure marker={category.id} className="atlas-category" open={expanded.has(category.id) || !!term} onToggle={() => { if (term) setQuery(''); toggle(category.id) }} title={<span><small>{String(index + 1).padStart(2, '0')}</small>{category.name}<em>{count ? `${count} 个模板` : '规划中'}</em></span>}>
              <ul className="atlas-families">{families.map(family => { const entries = circuitTemplates.filter(t => t.familyId === family.id && (!term || matches.includes(t))); return <li key={family.id}><Disclosure marker={family.id} className="atlas-family" open={expanded.has(family.id) || !!term} onToggle={() => { if (term) setQuery(''); toggle(family.id) }} title={<span>{family.name}<em>{circuitTemplates.some(t => t.familyId === family.id) ? `${entries.length} 个` : '规划中'}</em></span>}>
                {entries.length ? <ul className="atlas-templates">{entries.map(t => <li key={t.id}><button aria-pressed={selectedId === t.id} data-template-id={t.id} onClick={() => { setSelectedId(t.id); setMessage(''); setLibraryOpen(false); detailHeading.current?.focus({ preventScroll: true }) }}>{t.name}</button></li>)}</ul> : <p className="atlas-planned">暂未提供可编辑模板。待元件、模型或内容完成后开放；当前不能启动此类仿真。</p>}
              </Disclosure></li> })}</ul>
            </Disclosure></li>
          })}</ul></nav>
        </div>
      </aside>
      <article className="atlas-detail" aria-label="所选电路详情">
        <div className="atlas-detail-heading"><div><p className="eyebrow">{circuitCategories.find(c => c.id === selected.categoryId)!.name} / {selected.difficulty}</p><h2 ref={detailHeading} tabIndex={-1}>{selected.name}</h2></div><button className="primary-button" onClick={() => { const opened = onOpen(instantiateTemplate(selected.id)); setMessage(opened ? '已在编辑器中打开独立工程。' : '已保留原工程；可先返回编辑器导出，再打开模板。') }}>在编辑器中打开</button>{selected.capabilities.dc && <button onClick={() => { const opened = onOpen(instantiateTemplate(selected.id), 'dc'); setMessage(opened ? '已打开直流分析，请确认参考节点并运行。' : '已保留原工程。') }}>使用直流分析</button>}</div>
        <p>{selected.description}</p><p className="atlas-note">预览不会替换当前工程。打开时会创建独立副本；已有未导出的修改会先询问。</p>
        <div className="atlas-preview-scroll" tabIndex={0} role="region" aria-label="原理图预览滚动区"><SchematicPreview project={preview} /></div>
        <p className="atlas-note">窄屏可横向滚动查看完整标注；修改元件请在编辑器中打开。</p>
        <div className="atlas-metadata">
          <section aria-label="模板能力"><h3>当前可用能力</h3><dl className="atlas-capabilities"><div><dt>原理图</dt><dd>可查看</dd></div><div><dt>工程模板</dt><dd>可编辑 · 可导出重开</dd></div><div><dt>数值分析</dt><dd>{selected.capabilities.numerical ? '电阻等效变换与端口数值核对（依候选条件）' : '暂未提供'}</dd></div><div><dt>直流分析</dt><dd>{selected.capabilities.dc ? 'MNA 工作点（请明确参考节点）' : '当前器件模型不支持'}</dd></div><div><dt>教学实验</dt><dd>{selected.capabilities.experiment ? '已有电阻变换五阶段课程（依候选条件）' : '暂未提供'}</dd></div></dl><p className="atlas-note">{selected.note}</p></section>
          <section aria-label="电路学习主题"><h3>结构与学习主题</h3><p>元件：{selected.components.join('、')}</p><div className="atlas-tags">{selected.methods.map(method => <span key={method}>{method}</span>)}</div><p className="atlas-note">方法标签只作学习索引，不是计算按钮。</p><p>教材关联：{selected.chapters.map(n => `第${n}章`).join('、')}</p><a href={textbookReference.url} target="_blank" rel="noreferrer">{textbookReference.title} · 出版社目录</a><p className="atlas-note">原创示例拓扑，按目录主题关联；未复制教材习题或宣称全书实验覆盖。</p></section>
        </div><p role="status" aria-label="图谱操作状态">{message}</p>
      </article>
    </div>
  </section>
}
