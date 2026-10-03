import { useState, type ReactNode } from 'react'

type AnyRecord = Record<string, any>

export interface HierarchyTreeProps {
  node: AnyRecord
  indentWidth?: string
  defaultCollapsed?: boolean
  renderNode: (api: { node: AnyRecord; hasChildren: boolean; isCollapsed: boolean; toggle: () => void }) => ReactNode
}

export function HierarchyTree({
  node,
  indentWidth = '28px',
  defaultCollapsed = false,
  renderNode,
}: HierarchyTreeProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed)
  const hasChildren = (node.children?.length ?? 0) > 0

  return (
    <>
      {renderNode({
        node,
        hasChildren,
        isCollapsed: collapsed,
        toggle: () => hasChildren && setCollapsed((current) => !current),
      })}
      {hasChildren && !collapsed && (
        <div className="flex">
          <ul className="w-full" style={{ paddingLeft: indentWidth }}>
            {node.children.map((child: AnyRecord) => (
              <li key={child.name}>
                <HierarchyTree
                  node={child}
                  indentWidth={indentWidth}
                  defaultCollapsed={defaultCollapsed}
                  renderNode={renderNode}
                />
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  )
}
