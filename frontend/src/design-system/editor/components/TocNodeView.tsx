import { NodeViewWrapper, type ReactNodeViewProps } from '@tiptap/react'
import { useMemo, type HTMLAttributes } from 'react'
import { LucideIcon } from '../../icons'
import { dispatchIfAlive, getExtensionHTMLAttributes, safeGetPos } from '../extensions/shared/node-view'
import { foldHeadings } from '../extensions/shared/heading-tree-utils'
import { scrollToHeading } from '../extensions/toc-node/toc-scroll-controller'
import { useNodeViewEditable } from '../hooks/useNodeViewEditable'
import { useScrollContainer } from '../hooks/useScrollContainer'
import { useTocActiveHeading, type EnrichedAnchor } from '../hooks/useTocActiveHeading'
import { useTocAnchors } from '../hooks/useTocAnchors'
import { TocItem } from './TocItem'

function toReactAttrs<T extends HTMLElement>(attributes: Record<string, unknown>): HTMLAttributes<T> {
  const { class: className, ...rest } = attributes
  return { ...rest, className: typeof className === 'string' ? className : undefined } as HTMLAttributes<T>
}

export function TocNodeView({ node, editor, getPos }: ReactNodeViewProps) {
  const isEditable = useNodeViewEditable(editor)
  const container = useScrollContainer()
  const { anchors } = useTocAnchors(editor)
  const { enrichedAnchors } = useTocActiveHeading(editor, anchors, container)

  const anchorTree = useMemo(
    () => foldHeadings<EnrichedAnchor>(enrichedAnchors, (item) => item as EnrichedAnchor),
    [enrichedAnchors],
  )

  const orderedListAttrs = toReactAttrs<HTMLOListElement>(getExtensionHTMLAttributes(editor, 'orderedList'))
  const listItemAttrs = toReactAttrs<HTMLLIElement>(getExtensionHTMLAttributes(editor, 'listItem'))

  const removeNode = () => {
    if (!isEditable) return
    const pos = safeGetPos(() => getPos())
    if (pos === null) return
    const view = editor.view
    dispatchIfAlive(view, view.state.tr.delete(pos, pos + node.nodeSize))
  }

  return (
    <NodeViewWrapper className="table-of-contents-node group relative" contentEditable={false}>
      {anchorTree.length === 0 ? (
        <p className="py-3 text-sm text-ink-gray-5">There are no headings in this document.</p>
      ) : (
        <ol {...orderedListAttrs}>
          {anchorTree.map((item) => (
            <TocItem
              key={item.value.id || item.value.pos}
              node={item}
              orderedAttrs={orderedListAttrs}
              listAttrs={listItemAttrs}
              onSelect={(anchor) => scrollToHeading(editor, anchor, container)}
            />
          ))}
        </ol>
      )}

      {isEditable && (
        <button
          type="button"
          onClick={removeNode}
          className="absolute right-2 top-2 rounded bg-black/65 p-1 text-ink-gray-4 opacity-0 transition-opacity hover:bg-black/80 hover:text-ink-base group-hover:opacity-100"
          title="Remove table of contents"
        >
          <LucideIcon name="lucide-x" className="size-4" />
        </button>
      )}
    </NodeViewWrapper>
  )
}
