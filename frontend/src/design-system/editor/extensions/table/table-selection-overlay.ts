import { Extension } from '@tiptap/core'
import { Plugin } from '@tiptap/pm/state'
import { CellSelection } from '@tiptap/pm/tables'
import type { EditorView } from '@tiptap/pm/view'

interface Rect {
  left: number
  top: number
  right: number
  bottom: number
}

class SelectionOverlay {
  private el: HTMLElement | null = null
  private resizeObserver: ResizeObserver | null = null
  private observed: HTMLElement | null = null
  private onResize = () => this.update(this.view)

  constructor(private view: EditorView) {
    window.addEventListener('resize', this.onResize)
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.update(this.view))
    }
    this.update(view)
  }

  update(view: EditorView): void {
    this.view = view
    const { selection } = view.state
    const isRange = selection instanceof CellSelection && selection.$anchorCell.pos !== selection.$headCell.pos
    view.dom.classList.toggle('table-cell-range', isRange)
    if (!isRange) {
      this.remove()
      return
    }
    this.draw(view, selection as CellSelection)
  }

  private draw(view: EditorView, selection: CellSelection): void {
    let union: Rect | null = null
    selection.forEachCell((_cell, pos) => {
      const dom = view.nodeDOM(pos)
      if (!(dom instanceof HTMLElement)) return
      const r = dom.getBoundingClientRect()
      union = union
        ? {
            left: Math.min(union.left, r.left),
            top: Math.min(union.top, r.top),
            right: Math.max(union.right, r.right),
            bottom: Math.max(union.bottom, r.bottom),
          }
        : { left: r.left, top: r.top, right: r.right, bottom: r.bottom }
    })
    if (!union) {
      this.remove()
      return
    }

    const anchorDom = view.nodeDOM(selection.$anchorCell.pos)
    const host =
      (anchorDom instanceof HTMLElement ? (anchorDom.closest('.tableWrapper') as HTMLElement | null) : null) ??
      (view.dom as HTMLElement)
    const hostRect = host.getBoundingClientRect()
    this.observe(host)

    const box: Rect = union
    const el = this.ensure(host)
    el.style.left = `${box.left - hostRect.left + host.scrollLeft}px`
    el.style.top = `${box.top - hostRect.top + host.scrollTop}px`
    el.style.width = `${box.right - box.left}px`
    el.style.height = `${box.bottom - box.top}px`
  }

  private ensure(host: HTMLElement): HTMLElement {
    if (this.el && this.el.parentElement === host) return this.el
    this.remove()
    const el = document.createElement('div')
    el.className = 'table-selection-box'
    el.setAttribute('aria-hidden', 'true')
    host.appendChild(el)
    this.el = el
    return el
  }

  private observe(host: HTMLElement): void {
    if (!this.resizeObserver || this.observed === host) return
    this.resizeObserver.disconnect()
    this.resizeObserver.observe(host)
    this.observed = host
  }

  private remove(): void {
    this.el?.remove()
    this.el = null
    this.resizeObserver?.disconnect()
    this.observed = null
  }

  destroy(): void {
    this.view.dom.classList.remove('table-cell-range')
    this.remove()
    window.removeEventListener('resize', this.onResize)
    this.resizeObserver = null
  }
}

export const TableSelectionOverlay = Extension.create({
  name: 'tableSelectionOverlay',
  addProseMirrorPlugins() {
    return [new Plugin({ view: (view) => new SelectionOverlay(view) })]
  },
})

export { TableSelectionOverlay as default }
