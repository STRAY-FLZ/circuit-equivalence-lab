interface SetEntry {
  readonly id: string
  parent: string
  size: number
}

/** Internal helper: roots are implementation details, never public electrical-node IDs. */
export class DisjointSet {
  private readonly entries = new Map<string, SetEntry>()

  constructor(ids: readonly string[]) {
    for (const id of ids) this.entries.set(id, { id, parent: id, size: 1 })
  }

  find(id: string): string {
    let root = this.entry(id)
    while (root.parent !== root.id) root = this.entry(root.parent)

    // Iterative full path compression avoids a call-stack dependency on graph depth.
    let current = this.entry(id)
    while (current.parent !== root.id) {
      const parent = this.entry(current.parent)
      current.parent = root.id
      current = parent
    }
    return root.id
  }

  union(firstId: string, secondId: string): void {
    let first = this.entry(this.find(firstId))
    let second = this.entry(this.find(secondId))
    if (first.id === second.id) return

    // Attach the smaller tree to the larger tree, independently of canonical ID order.
    if (first.size < second.size) [first, second] = [second, first]
    second.parent = first.id
    first.size += second.size
  }

  private entry(id: string): SetEntry {
    const entry = this.entries.get(id)
    if (!entry) throw new RangeError(`Unknown disjoint-set member: ${id}`)
    return entry
  }
}
