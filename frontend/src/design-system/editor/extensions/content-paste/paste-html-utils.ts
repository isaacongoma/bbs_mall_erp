import { DOMParser, Slice } from '@tiptap/pm/model'
import type { Node, Schema } from '@tiptap/pm/model'

export function normalizeFontSizePtToPx(html: string): string {
  return html.replace(/font-size:\s*([\d.]+)pt/gi, (_match, pt: string) => {
    const px = Math.round((parseFloat(pt) * 96) / 72)
    return `font-size:${px}px`
  })
}

export function htmlContainsImage(html: string): boolean {
  const div = document.createElement('div')
  div.innerHTML = html
  return div.querySelector('img') !== null
}

export function parseHtmlToSlice(html: string, schema: Schema): Slice {
  const div = document.createElement('div')
  div.innerHTML = normalizeFontSizePtToPx(html)
  return DOMParser.fromSchema(schema).parseSlice(div, {
    preserveWhitespace: true,
  })
}

export interface PastedImage {
  node: Node
  pos: number
  src: string
}

export function collectImageNodes(doc: Node, from: number, to: number): PastedImage[] {
  const seen = new Set<Node>()
  const images: PastedImage[] = []
  doc.nodesBetween(from, to, (node, pos) => {
    if (node.type.name !== 'image') return
    if (seen.has(node)) return
    const src = node.attrs.src as string | null | undefined
    if (typeof src !== 'string') return
    if (!src.startsWith('data:') && !src.startsWith('blob:')) return
    seen.add(node)
    images.push({ node, pos, src })
  })
  return images
}
