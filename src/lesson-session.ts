import type { LessonContent, LessonStepIndex } from './education'
import type { EquivalenceResult, TransformResult } from './transforms'
export interface PreviewSnapshot { readonly result: TransformResult; readonly evidence: EquivalenceResult | null }
export type LabSession = { readonly kind: 'idle' } | { readonly kind: 'preview'; readonly snapshot: PreviewSnapshot }
  | { readonly kind: 'lesson'; readonly snapshot: PreviewSnapshot; readonly lesson: LessonContent; readonly step: LessonStepIndex }
export type SessionAction = { readonly type: 'clear' } | { readonly type: 'preview'; readonly snapshot: PreviewSnapshot }
  | { readonly type: 'start'; readonly snapshot: PreviewSnapshot; readonly lesson: LessonContent }
  | { readonly type: 'previous' | 'next' | 'restart' | 'exit' }
/** One progression source, with cached operation/evidence snapshots on navigation. */
export function lessonSessionReducer(state: LabSession, action: SessionAction): LabSession {
  switch (action.type) {
    case 'clear': return { kind: 'idle' }
    case 'preview': return { kind: 'preview', snapshot: action.snapshot }
    case 'start': return { kind: 'lesson', snapshot: action.snapshot, lesson: action.lesson, step: 0 }
    case 'exit': return state.kind === 'lesson' ? { kind: 'preview', snapshot: state.snapshot } : state
    case 'restart': return state.kind === 'lesson' ? { ...state, step: 0 } : state
    case 'previous': return state.kind === 'lesson' && state.step > 0 ? { ...state, step: (state.step - 1) as LessonStepIndex } : state
    case 'next': return state.kind === 'lesson' && state.step < 4 ? { ...state, step: (state.step + 1) as LessonStepIndex } : state
  }
}
