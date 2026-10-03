import { computePosition, flip, offset, shift } from '@floating-ui/dom'
import { CellSelection, cellAround, isInTable, selectionCell } from '@tiptap/pm/tables'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLatest } from '../../hooks/useLatest'
import { cn } from '../../utils/cn'
import { verticalScrollParent } from '../extensions/table/drag-scroll'
import { useResolvedEditor } from '../hooks/useResolvedEditor'
import { tableToolbar } from '../menu'
import type { Editor } from '../types/editor'
import { openFloatingPopup, type FloatingPopupHandle } from '../utils/floatingPopup'
import { MenuItems } from './MenuItems'
import { TableContextMenu } from './TableContextMenu'

export interface EditorTableMenuProps {
  editor?: Editor | null
}

function activeTableEl(editor: Editor): HTMLElement | null {
  if (!editor.isEditable || !editor.isActive('table')) return null
  if (!editor.isInitialized) return null
  const { $from } = editor.state.selection
  for (let depth = $from.depth; depth > 0; depth--) {
    if ($from.node(depth).type.name === 'table') {
      const dom = editor.view.nodeDOM($from.before(depth))
      if (dom instanceof HTMLElement) {
        return dom.tagName === 'TABLE' ? dom : (dom.querySelector('table') ?? dom)
      }
    }
  }
  return null
}

function verticalBounds(table: HTMLElement): { top: number; bottom: number } {
  const parent = verticalScrollParent(table)
  if (parent === document.scrollingElement || parent === document.documentElement) {
    return { top: 0, bottom: window.innerHeight }
  }
  const rect = parent.getBoundingClientRect()
  return { top: Math.max(rect.top, 0), bottom: Math.min(rect.bottom, window.innerHeight) }
}

function tableInView(table: HTMLElement): boolean {
  const rect = table.getBoundingClientRect()
  const bounds = verticalBounds(table)
  return rect.bottom > bounds.top && rect.top < bounds.bottom && rect.right > 0 && rect.left < window.innerWidth
}

function reposition(table: HTMLElement, el: HTMLElement) {
  const wrapper = table.closest<HTMLElement>('.tableWrapper')
  const reference = wrapper
    ? {
        getBoundingClientRect: () => {
          const t = table.getBoundingClientRect()
          const w = wrapper.getBoundingClientRect()
          const left = Math.max(t.left, w.left)
          const right = Math.min(t.right, w.right)
          return new DOMRect(left, t.top, Math.max(0, right - left), 0)
        },
      }
    : table
  void computePosition(reference, el, {
    strategy: 'fixed',
    placement: 'top',
    middleware: [offset(4), flip(), shift({ padding: 8 })],
  }).then(({ x, y }) => {
    const bounds = verticalBounds(table)
    const minY = bounds.top + 4
    const maxY = bounds.bottom - el.offsetHeight - 4
    el.style.left = `${x}px`
    el.style.top = `${Math.min(Math.max(y, minY), Math.max(maxY, minY))}px`
  })
}

export function EditorTableMenu({ editor }: EditorTableMenuProps) {
  const resolved = useResolvedEditor(editor)
  const [floating, setFloating] = useState<HTMLDivElement | null>(null)
  const [state, setState] = useState<{ table: HTMLElement | null; visible: boolean }>({ table: null, visible: false })
  const contextMenu = useRef<FloatingPopupHandle | null>(null)
  const latest = useLatest({ floating })

  useEffect(() => {
    if (!resolved || typeof resolved.on !== 'function') return
    let scrollRaf = 0

    const sync = () => {
      const table = resolved.isDestroyed ? null : activeTableEl(resolved)
      const visible = !!table && tableInView(table)
      setState((previous) => (previous.table === table && previous.visible === visible ? previous : { table, visible }))
      if (visible && table) {
        requestAnimationFrame(() => {
          const el = latest().floating
          if (el) reposition(table, el)
        })
      }
    }

    const closeContextMenu = () => {
      contextMenu.current?.destroy()
      contextMenu.current = null
    }

    const openContextMenu = (clientX: number, clientY: number) => {
      closeContextMenu()
      contextMenu.current = openFloatingPopup({
        anchor: resolved.view.dom as HTMLElement,
        component: TableContextMenu,
        props: { editor: resolved, items: tableToolbar, onRun: closeContextMenu },
        virtualReference: { getBoundingClientRect: () => new DOMRect(clientX, clientY, 0, 0) },
        closeOnAnchorPointerDown: true,
        animate: true,
        floatingOptions: { placement: 'right-start', strategy: 'fixed', offset: 0 },
      })
    }

    const onContextMenu = (event: MouseEvent) => {
      if (resolved.isDestroyed || !resolved.isEditable) return
      let dom: HTMLElement
      try {
        dom = resolved.view.dom as HTMLElement
      } catch {
        return
      }
      const target = event.target
      if (!(target instanceof Node) || !dom.contains(target)) return
      const coords = resolved.view.posAtCoords({ left: event.clientX, top: event.clientY })
      let $cell = coords ? cellAround(resolved.state.doc.resolve(coords.pos)) : null
      let point = { x: event.clientX, y: event.clientY }
      if (!$cell) {
        if (event.button === 2) return
        if (!isInTable(resolved.state)) return
        $cell = selectionCell(resolved.state)
        const cellDom = resolved.view.nodeDOM($cell.pos)
        if (!(cellDom instanceof HTMLElement)) return
        const rect = cellDom.getBoundingClientRect()
        point = { x: rect.left + Math.min(rect.width / 2, 24), y: rect.bottom - 4 }
      }
      event.preventDefault()
      const selection = resolved.state.selection
      let inSelection = false
      const cellPos = $cell.pos
      if (selection instanceof CellSelection) {
        selection.forEachCell((_node, pos) => {
          if (pos === cellPos) inSelection = true
        })
      }
      if (!inSelection) {
        resolved.view.dispatch(resolved.state.tr.setSelection(CellSelection.create(resolved.state.doc, cellPos)))
      }
      openContextMenu(point.x, point.y)
    }

    const onScroll = () => {
      if (scrollRaf) return
      scrollRaf = requestAnimationFrame(() => {
        scrollRaf = 0
        sync()
      })
    }

    resolved.on('transaction', sync)
    resolved.on('focus', sync)
    document.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', sync)
    document.addEventListener('contextmenu', onContextMenu, true)
    const initial = requestAnimationFrame(sync)

    return () => {
      cancelAnimationFrame(initial)
      resolved.off('transaction', sync)
      resolved.off('focus', sync)
      if (scrollRaf) cancelAnimationFrame(scrollRaf)
      document.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', sync)
      document.removeEventListener('contextmenu', onContextMenu, true)
      closeContextMenu()
    }
  }, [resolved, latest])

  if (!resolved) return null

  return createPortal(
    <div
      ref={setFloating}
      data-slot="table-menu"
      className={cn(
        'fixed left-0 top-0 z-[100] flex items-center gap-1 rounded-lg border border-outline-gray-2 bg-surface-elevation-2 p-1 shadow-sm',
        state.visible ? 'table-menu-enter' : 'hidden',
      )}
    >
      <MenuItems editor={resolved} items={tableToolbar} />
    </div>,
    document.body,
  )
}
