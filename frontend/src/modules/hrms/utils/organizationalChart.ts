export interface HierarchyNode {
  id: string
  name: string
  title?: string
  image?: string
  reports_to?: string
  expandable?: boolean
}

interface HierarchyGroup {
  parent?: string
  data?: HierarchyNode[]
}

export function buildHierarchy(groups: HierarchyGroup[]): { roots: HierarchyNode[]; children: Map<string, HierarchyNode[]> } {
  const nodes = new Map<string, HierarchyNode>()
  for (const group of groups) {
    for (const node of group.data ?? []) {
      const existing = nodes.get(node.id)
      nodes.set(node.id, { ...existing, ...node })
    }
  }
  const children = new Map<string, HierarchyNode[]>()
  for (const node of nodes.values()) {
    const parent = node.reports_to ?? ''
    children.set(parent, [...(children.get(parent) ?? []), node])
  }
  const roots = [...nodes.values()].filter((node) => !node.reports_to || !nodes.has(node.reports_to))
  return { roots, children }
}
