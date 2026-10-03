import type { ViewableImage } from '../extensions/image-viewer/collectImages'

export function downloadImage(image: ViewableImage | undefined): void {
  if (!image) return

  const base =
    image.alt?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || image.src.split('/').pop()?.split(/[?#]/)[0] || 'download'

  const ext = extensionOf(image.src) ?? extensionOf(base)
  const filename = ext ? withExtension(base, ext) : base.includes('.') ? base : `${base}.jpg`

  const link = document.createElement('a')
  link.href = image.src
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

function extensionOf(value: string): string | null {
  const name = (value.split(/[?#]/)[0] ?? '').split('/').pop() ?? ''
  const dot = name.lastIndexOf('.')
  if (dot <= 0 || dot === name.length - 1) return null
  return name.slice(dot + 1).toLowerCase()
}

function withExtension(base: string, ext: string): string {
  const cleaned = base.endsWith(`.${ext}`) ? base : `${base}.${ext}`
  return cleaned
}
