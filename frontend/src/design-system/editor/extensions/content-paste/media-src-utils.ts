import { Fragment } from '@tiptap/pm/model'
import type { Node } from '@tiptap/pm/model'

const MEDIA_NODES = new Set(['image', 'video'])

export function absolutizeMediaSrcs(fragment: Fragment, origin: string): Fragment {
  const children: Node[] = []
  let changed = false

  fragment.forEach((node) => {
    let next = node

    if (MEDIA_NODES.has(node.type.name)) {
      const src = node.attrs.src as string | null | undefined
      if (typeof src === 'string' && src.startsWith('/')) {
        next = node.type.create({ ...node.attrs, src: `${origin}${src}` }, node.content, node.marks)
        changed = true
      }
    }

    if (node.content.size > 0) {
      const newContent = absolutizeMediaSrcs(next.content, origin)
      if (newContent !== next.content) {
        next = next.copy(newContent)
        changed = true
      }
    }

    children.push(next)
  })

  return changed ? Fragment.fromArray(children) : fragment
}
