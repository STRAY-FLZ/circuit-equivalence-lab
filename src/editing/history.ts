import { createEngineeringProject, reviseProject } from '../engineering'
import type { EngineeringProject } from '../engineering'
import { applyEdit } from './model'
import type { EditOperation } from './model'

export interface EditorHistory { readonly past: readonly EngineeringProject[]; readonly present: EngineeringProject; readonly future: readonly EngineeringProject[] }
export function createHistory(project: EngineeringProject): EditorHistory { return { past: [], present: createEngineeringProject(project), future: [] } }
export function commitEdit(history: EditorHistory, sheetId: string, operation: EditOperation): EditorHistory {
  return { past: [...history.past, history.present], present: applyEdit(history.present, sheetId, operation), future: [] }
}
function restore(current: EngineeringProject, snapshot: EngineeringProject): EngineeringProject {
  const { id, revision, ...content } = snapshot
  if (id !== current.id) throw new TypeError('History cannot change project identity.')
  void revision
  return reviseProject(current, current.revision, content)
}
export function undoEdit(history: EditorHistory): EditorHistory {
  const target = history.past.at(-1)
  return target ? { past: history.past.slice(0, -1), present: restore(history.present, target), future: [history.present, ...history.future] } : history
}
export function redoEdit(history: EditorHistory): EditorHistory {
  const target = history.future[0]
  return target ? { past: [...history.past, history.present], present: restore(history.present, target), future: history.future.slice(1) } : history
}
