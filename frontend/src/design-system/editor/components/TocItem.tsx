import type { HTMLAttributes } from 'react'
import { cn } from '../../utils/cn'
import type { HeadingTreeNode } from '../extensions/shared/heading-tree-utils'
import type { EnrichedAnchor } from '../hooks/useTocActiveHeading'

export interface TocItemProps {
  node: HeadingTreeNode<EnrichedAnchor>
  orderedAttrs: HTMLAttributes<HTMLOListElement>
  listAttrs: HTMLAttributes<HTMLLIElement>
  onSelect: (anchor: EnrichedAnchor) => void
}

export function TocItem({ node, orderedAttrs, listAttrs, onSelect }: TocItemProps) {
  return (
    <li
      {...listAttrs}
      className={cn(
        'toc-item',
        node.value.isScrolledOver ? 'text-ink-gray-5' : 'text-ink-gray-8',
        node.value.isActive && !node.value.isScrolledOver && 'font-medium',
      )}
    >
      <p
        style={{ margin: 0, cursor: 'pointer' }}
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          onSelect(node.value)
        }}
      >
        {node.value.text}
      </p>
      {node.children.length > 0 && (
        <ol {...orderedAttrs} onClick={(event) => event.stopPropagation()}>
          {node.children.map((child) => (
            <TocItem
              key={child.value.id || child.value.pos}
              node={child}
              orderedAttrs={orderedAttrs}
              listAttrs={listAttrs}
              onSelect={onSelect}
            />
          ))}
        </ol>
      )}
    </li>
  )
}
