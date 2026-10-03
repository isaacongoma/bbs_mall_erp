export interface HeadingTreeNode<T> {
  value: T
  children: HeadingTreeNode<T>[]
}

export interface TocRenderNode {
  text: string
  children: TocRenderNode[]
}

export function foldHeadings<T>(
  items: { level: number }[],
  makeNode: (item: { level: number }) => T,
): HeadingTreeNode<T>[] {
  const roots: HeadingTreeNode<T>[] = []
  const stack: { level: number; node: HeadingTreeNode<T> }[] = []

  for (const item of items) {
    const node: HeadingTreeNode<T> = { value: makeNode(item), children: [] }

    while (stack.length && stack[stack.length - 1]!.level >= item.level) {
      stack.pop()
    }

    if (stack.length === 0) {
      roots.push(node)
    } else {
      stack[stack.length - 1]!.node.children.push(node)
    }

    stack.push({ level: item.level, node })
  }

  return roots
}

export function headingsToRenderSpec(tree: HeadingTreeNode<{ text: string; level: number }>[]): TocRenderNode[] {
  return tree.map((node) => ({
    text: node.value.text,
    children: headingsToRenderSpec(node.children),
  }))
}
