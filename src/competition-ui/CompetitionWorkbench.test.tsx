import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createRef } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CompetitionWorkbench } from './CompetitionWorkbench'
import type { CompetitionWorkbenchHandle } from './CompetitionWorkbench'
import App from '../App'
import { createCompetitionProject, readWorkspace } from '../competition'
import { serializeProject } from '../project-format'
import type { ProjectDocumentV1 } from '../project-format'
const button = (name: string) => screen.getByRole('button', { name })
beforeEach(() => { vi.spyOn(window, 'confirm').mockReturnValue(true); Object.defineProperty(window, 'matchMedia', { configurable: true, value: vi.fn().mockReturnValue({ matches: false }) }); window.localStorage.clear() })
afterEach(() => vi.restoreAllMocks())
async function create() { fireEvent.click(button('创建独立训练工程')); await waitFor(() => expect(screen.getByLabelText('电赛工作台状态')).toHaveTextContent('已创建独立训练工程')) }
describe('competition user workflow and existing tool boundary', () => {
  it('shows actual source attribution and protects an unsaved independent project', async () => {
    render(<CompetitionWorkbench onOpenTool={() => Promise.resolve(true)} onContext={() => {}} />)
    fireEvent.change(screen.getByLabelText('搜索历史赛题'), { target: { value: '广东' } })
    fireEvent.click(screen.getByRole('button', { name: /2026 G · 周期信号测量分析装置/ }))
    const detail = screen.getByLabelText('赛题详情'); expect(within(detail).getByRole('link', { name: '打开原始赛题文件' })).toHaveAttribute('href', expect.stringContaining('scut.edu.cn'))
    expect(within(detail).getByText(/未单列组别/)).toBeInTheDocument(); await create()
    expect(screen.getByRole('region', { name: '工程需求表' })).toHaveTextContent('原题公布要求')
    expect(screen.getByRole('region', { name: '工程需求表' })).toHaveTextContent('自定训练目标')
    fireEvent.click(button('赛题库')); vi.mocked(vi.spyOn(window, 'confirm')).mockReturnValueOnce(false); fireEvent.click(button('创建独立训练工程'))
    await waitFor(() => expect(button('创建独立训练工程')).not.toBeDisabled()); expect(vi.spyOn(window, 'confirm')).toHaveBeenCalled(); fireEvent.click(button('我的项目')); expect(screen.getByRole('region', { name: '工程需求表' })).toHaveTextContent('第一组信号有效值')
  })
  it('runs actual AC from the existing editor, attaches immutable evidence and evaluates a metric', async () => {
    render(<App />); fireEvent.click(button('电子设计竞赛')); await create(); fireEvent.click(button('开始训练实验')); fireEvent.click(button('打开交流频率响应训练'))
    await waitFor(() => expect(screen.getByLabelText('交流分析面板')).toBeVisible()); fireEvent.click(button('运行频率扫描'))
    await waitFor(() => expect(screen.getByLabelText('交流分析状态')).toHaveTextContent('分析完成')); fireEvent.click(button('关联到电赛实验'))
    await waitFor(() => expect(screen.getByLabelText('电赛工作台状态')).toHaveTextContent('实际结果与原始数据已关联'))
    expect(screen.getByLabelText('实际观测值')).toHaveDisplayValue(/扫描半功率交点/)
    fireEvent.click(button('记录本次尝试')); await waitFor(() => expect(screen.getByRole('region', { name: '指标比较表' })).toHaveTextContent('训练比较通过'))
    fireEvent.click(button('原理图编辑器')); fireEvent.click(button('R1 元件')); fireEvent.change(screen.getByLabelText('电阻值'), { target: { value: 2000 } }); fireEvent.click(button('应用属性')); fireEvent.click(button('电子设计竞赛'))
    expect(screen.getByRole('region', { name: '指标比较表' })).toHaveTextContent('无法判定')
    expect(screen.getByLabelText('交流分析状态')).toHaveTextContent('结果已过期')
  })
  it('runs the real signal engine and associates RMS plus immutable source samples', async () => {
    render(<App />); fireEvent.click(button('电子设计竞赛')); fireEvent.change(screen.getByLabelText('搜索历史赛题'), { target: { value: '广东' } }); fireEvent.click(screen.getByRole('button', { name: /2026 G/ })); await create(); fireEvent.click(button('开始训练实验')); fireEvent.click(button('打开信号测量训练'))
    await waitFor(() => expect(screen.getByLabelText('频率 / Hz')).toHaveValue(20000)); fireEvent.click(button('生成并分析'))
    await waitFor(() => expect(screen.getByTestId('measurement-totalRms')).toHaveTextContent('0.07071068 V')); fireEvent.click(button('关联到电赛实验'))
    await waitFor(() => expect(screen.getByLabelText('电赛工作台状态')).toHaveTextContent('实际结果与原始数据已关联')); fireEvent.click(button('记录本次尝试'))
    await waitFor(() => expect(screen.getByRole('region', { name: '指标比较表' })).toHaveTextContent('训练比较通过')); expect(screen.getByRole('region', { name: '指标比较表' })).toHaveTextContent('软件合成')
  })
  it('opens a portable project, records plans/notes and rejects invalid imported workspace data', async () => {
    const source = await createCompetitionProject('nuedc-2019-d', { name: 'test', version: '2.5.0' }), ref = createRef<CompetitionWorkbenchHandle>(), onOpenTool = vi.fn().mockResolvedValue(true)
    render(<CompetitionWorkbench ref={ref} onOpenTool={onOpenTool} onContext={() => {}} />)
    const text = await serializeProject(source), file = new File([text], 'training.json', { type: 'application/json' }); Object.defineProperty(file, 'text', { value: () => Promise.resolve(text) })
    fireEvent.change(screen.getByLabelText('打开电赛工程或报告'), { target: { files: [file] } }); await waitFor(() => expect(screen.getByLabelText('电赛工作台状态')).toHaveTextContent('电赛工程已打开'))
    fireEvent.click(button('实验与测量')); expect(screen.getByLabelText('当前电赛实验')).toHaveDisplayValue('RC频率响应子训练')
    fireEvent.click(button('任务与方案')); fireEvent.change(screen.getByLabelText('方案名称'), { target: { value: '方案A' } }); fireEvent.change(screen.getByLabelText('技术方法与假设'), { target: { value: '理想RC' } }); fireEvent.change(screen.getByLabelText('选择依据'), { target: { value: '先验证线性参考' } }); fireEvent.click(button('保存方案记录')); await waitFor(() => expect(screen.getByText('方案A')).toBeInTheDocument())
    fireEvent.click(button('实验与测量')); fireEvent.change(screen.getByLabelText('实验结论'), { target: { value: '等待真实测量后补充' } }); fireEvent.click(button('保存实验笔记')); await waitFor(() => expect(screen.getByLabelText('电赛工作台状态')).toHaveTextContent('记录已更新'))
    fireEvent.click(button('打开交流频率响应训练')); await waitFor(() => expect(onOpenTool).toHaveBeenCalled())
    const handed = onOpenTool.mock.calls[0]![0] as ProjectDocumentV1; expect(readWorkspace(handed.project).alternatives[0]!.title).toBe('方案A'); expect(readWorkspace(handed.project).notebooks.some(n => n.conclusion === '等待真实测量后补充')).toBe(true)
    const bad = new File(['{}'], 'bad.json'); Object.defineProperty(bad, 'text', { value: () => Promise.resolve('{}') }); fireEvent.change(screen.getByLabelText('打开电赛工程或报告'), { target: { files: [bad] } }); await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('当前工程保留'))
    await act(async () => { const receiving = ref.current!.receive({ kind: 'snapshot', document: handed }); ref.current!.sourceChanged(source.project.id, crypto.randomUUID()); await receiving })
    expect(screen.getByText(/编辑器存在待回传修订/)).toBeInTheDocument()
    await act(async () => { ref.current!.sourceChanged(source.project.id, handed.project.revision); await ref.current!.receive({ kind: 'snapshot', document: handed }) })
    expect(screen.queryByText(/编辑器存在待回传修订/)).not.toBeInTheDocument()
  })
})
