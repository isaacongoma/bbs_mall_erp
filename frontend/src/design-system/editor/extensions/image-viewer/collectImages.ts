import type { Node as ProseMirrorNode } from '@tiptap/pm/model'

export interface ViewableImage {
  src: string
  alt: string | null
}

export function collectViewableImages(doc: ProseMirrorNode): ViewableImage[] {
  const images: ViewableImage[] = []
  doc.descendants((node: ProseMirrorNode) => {
    if (node.type.name !== 'image') return true
    const src = node.attrs.src
    if (typeof src !== 'string' || src.length === 0) return true
    if (node.attrs.loading) return true
    if (node.attrs.error) return true
    images.push({ src, alt: node.attrs.alt ?? null })
    return true
  })
  return images
}

export function indexOfSrc(images: ViewableImage[], src: string): number {
  const index = images.findIndex((image) => image.src === src)
  return index === -1 ? 0 : index
}
