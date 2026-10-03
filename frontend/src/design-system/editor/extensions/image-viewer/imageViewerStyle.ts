const STYLE_ATTR = 'data-image-viewer-style'
const STYLE_CONTENT = `
  .ProseMirror:not(.ProseMirror-focused) img {
    cursor: pointer;
  }
`

let refCount = 0
let styleEl: HTMLStyleElement | null = null

export function acquireImageViewerStyle(): void {
  refCount += 1
  if (refCount > 1) return

  const existing = document.querySelector<HTMLStyleElement>(`style[${STYLE_ATTR}]`)
  if (existing) {
    styleEl = existing
    return
  }

  const style = document.createElement('style')
  style.textContent = STYLE_CONTENT
  style.setAttribute(STYLE_ATTR, 'true')
  document.head.appendChild(style)
  styleEl = style
}

export function releaseImageViewerStyle(): void {
  if (refCount === 0) return
  refCount -= 1
  if (refCount > 0) return

  if (styleEl && styleEl.parentNode) {
    styleEl.parentNode.removeChild(styleEl)
  }
  styleEl = null
}
