import { openFloatingPopup, type VirtualReference } from '../../utils/floatingPopup'
import { LinkEditorPopup } from '../../components/LinkEditorPopup'

export interface OpenLinkPopupOptions {
  href: string | null
  startInEdit?: boolean
  anchor: HTMLElement
  virtualReference?: VirtualReference
  onEscape?: () => void
}

export function openLinkPopup(options: OpenLinkPopupOptions): Promise<string | null> {
  const { href, anchor } = options

  const unlockScroll = lockScroll(getScrollParent(anchor))

  return new Promise<string | null>((resolve) => {
    let settled = false
    const settle = (value: string | null) => {
      if (settled) return
      settled = true
      resolve(value)
    }

    const popup = openFloatingPopup({
      anchor,
      component: LinkEditorPopup,
      closeOnAnchorPointerDown: true,
      closeOnEscape: false,
      virtualReference: options.virtualReference ?? {
        getBoundingClientRect: () => selectionRect(anchor),
      },
      floatingOptions: { placement: 'top' },
      props: {
        href: href ?? '',
        startInEdit: options.startInEdit ?? !href,
        onClose: () => {
          settle(null)
          popup.destroy()
          options.onEscape?.()
        },
        onUpdateHref: (newHref: string) => {
          settle(newHref)
          popup.destroy()
        },
      },
    })

    const originalDestroy = popup.destroy
    popup.destroy = () => {
      unlockScroll()
      settle(null)
      originalDestroy()
    }

    if (!popup.floating) {
      unlockScroll()
      settle(null)
    }
  })
}

export function lockScroll(el: HTMLElement | null): () => void {
  if (!el) return () => {}
  const previous = { x: el.style.overflowX, y: el.style.overflowY }
  el.style.overflowX = 'hidden'
  el.style.overflowY = 'hidden'
  return () => {
    el.style.overflowX = previous.x
    el.style.overflowY = previous.y
  }
}

function getScrollParent(el: HTMLElement | null): HTMLElement | null {
  let node: HTMLElement | null = el
  while (node && node !== document.body) {
    const { overflowY } = getComputedStyle(node)
    if (/(auto|scroll|overlay)/.test(overflowY) && node.scrollHeight > node.clientHeight) {
      return node
    }
    node = node.parentElement
  }
  return null
}

function selectionRect(anchor: HTMLElement): DOMRect {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) {
    return anchor.getBoundingClientRect()
  }

  const range = selection.getRangeAt(0)
  const rect = range.getBoundingClientRect()
  const isCollapsed = range.collapsed

  return {
    width: 0,
    height: rect.height,
    top: rect.top,
    right: isCollapsed ? rect.left : rect.right,
    bottom: rect.bottom,
    left: rect.left,
    x: rect.left,
    y: rect.top,
    toJSON: () => ({}),
  } as DOMRect
}
