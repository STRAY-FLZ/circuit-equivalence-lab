import type { ConnectivitySnapshot, EngineeringProject } from './types'
import { createEngineeringProject, freezeSnapshot } from './project'

/** Every anchor, including unconnected pins, is represented. No geometry is read. */
export function deriveElectricalNets(input: EngineeringProject): ConnectivitySnapshot {
  const project = createEngineeringProject(input)
  const parents = new Map(project.sheets.flatMap(s => s.anchors.map(a => [a.id, a.id] as const)))
  function find(id: string): string {
    let root = id
    while (parents.get(root) !== root) root = parents.get(root)!
    while (id !== root) { const next = parents.get(id)!; parents.set(id, root); id = next }
    return root
  }
  function join(a: string, b: string): void {
    const left = find(a), right = find(b)
    if (left !== right) parents.set(left < right ? right : left, left < right ? left : right)
  }
  const labelRoots = new Map<string, string>()
  for (const sheet of project.sheets) {
    for (const edge of sheet.connections) join(edge.endpoints[0], edge.endpoints[1])
    for (const label of sheet.labels) {
      const group = JSON.stringify([label.scope, label.scope === 'sheet' ? sheet.id : null, label.name])
      const other = labelRoots.get(group)
      if (other === undefined) labelRoots.set(group, label.anchorId)
      else join(other, label.anchorId)
    }
  }
  const groups = new Map<string, string[]>()
  for (const id of parents.keys()) {
    const root = find(id), group = groups.get(root) ?? []
    group.push(id); groups.set(root, group)
  }
  const pins = new Map<string, string[]>(), labels = new Map<string, string[]>()
  for (const sheet of project.sheets) {
    for (const c of sheet.components) for (const p of c.pins) {
      const root = find(p.anchorId), group = pins.get(root) ?? []
      group.push(p.id); pins.set(root, group)
    }
    for (const label of sheet.labels) {
      const root = find(label.anchorId), group = labels.get(root) ?? []
      group.push(label.id); labels.set(root, group)
    }
  }
  const nets = [...groups].map(([root, anchorIds]) => {
    anchorIds.sort()
    return { key: `net:${anchorIds[0]!}`, anchorIds, pinIds: (pins.get(root) ?? []).sort(), labelIds: (labels.get(root) ?? []).sort() }
  }).sort((a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0)
  const anchorToNet = Object.fromEntries(nets.flatMap(net => net.anchorIds.map(id => [id, net.key])))
  return freezeSnapshot({ projectId: project.id, projectRevision: project.revision, nets, anchorToNet })
}
