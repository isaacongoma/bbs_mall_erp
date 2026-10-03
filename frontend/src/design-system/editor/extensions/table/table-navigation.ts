import { Extension } from '@tiptap/core'
import type { Editor } from '@tiptap/core'
import { Plugin, Selection, TextSelection } from '@tiptap/pm/state'
import type { EditorView } from '@tiptap/pm/view'
import type { ResolvedPos } from '@tiptap/pm/model'
import {
  CellSelection,
  TableMap,
  cellAround,
  columnResizingPluginKey,
  goToNextCell,
  isInTable,
  nextCell,
  selectionCell,
} from '@tiptap/pm/tables'
import { trackPointerDrag } from './drag-scroll'

type Axis = 'horiz' | 'vert'

const ARROWS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'] as const

const LONG_PRESS_MS = 500
const LONG_PRESS_SLOP = 8

function arrowLeavesCell(view: EditorView, event: KeyboardEvent): boolean {
  if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) {
    return false
  }
  const { state } = view
  if (!state.selection.empty) return false
  const $head = state.selection.$head
  const $cell = cellAround($head)
  if (!$cell) return false
  const cell = $cell.nodeAfter
  if (!cell) return false
  const firstPos = Selection.near(state.doc.resolve($cell.pos + 1), 1).from
  const lastPos = Selection.near(state.doc.resolve($cell.pos + cell.nodeSize - 1), -1).from
  switch (event.key) {
    case 'ArrowLeft':
      return $head.pos <= firstPos
    case 'ArrowRight':
      return $head.pos >= lastPos
    case 'ArrowUp':
      return view.endOfTextblock('up') && $head.start() === state.doc.resolve(firstPos).start()
    case 'ArrowDown':
      return view.endOfTextblock('down') && $head.start() === state.doc.resolve(lastPos).start()
    default:
      return false
  }
}

function selectCell(editor: Editor, pos: number): boolean {
  const { state, view } = editor
  view.dispatch(state.tr.setSelection(CellSelection.create(state.doc, pos)).scrollIntoView())
  return true
}

function editCell(editor: Editor, $cell: ResolvedPos, at?: number): boolean {
  const { state, view } = editor
  const cell = $cell.nodeAfter
  if (!cell) return false
  const pos = at ?? $cell.pos + cell.nodeSize - 1
  const selection = TextSelection.near(state.doc.resolve(pos), -1)
  view.dispatch(state.tr.setSelection(selection).scrollIntoView())
  return true
}

function tableAround($cell: ResolvedPos) {
  const table = $cell.node(-1)
  return { table, start: $cell.start(-1), map: TableMap.get(table) }
}

function exitTable(editor: Editor, dir: 1 | -1): boolean {
  const { state, view } = editor
  const $cell = selectionCell(state)
  let depth = $cell.depth
  while (depth > 0 && $cell.node(depth).type.name !== 'table') depth--
  if (!depth) return true
  const pos = dir === 1 ? $cell.after(depth) : $cell.before(depth)
  const target = Selection.findFrom(state.doc.resolve(pos), dir, true)
  if (target) {
    view.dispatch(state.tr.setSelection(target).scrollIntoView())
    return true
  }
  const paragraph = state.schema.nodes.paragraph
  if (!paragraph) return true
  const tr = state.tr.insert(pos, paragraph.create())
  tr.setSelection(TextSelection.create(tr.doc, pos + 1)).scrollIntoView()
  view.dispatch(tr)
  return true
}

function moveCell(editor: Editor, axis: Axis, dir: number): boolean {
  const { state } = editor
  const $next = nextCell(selectionCell(state), axis, dir)
  if ($next) return selectCell(editor, $next.pos)
  if (axis === 'vert') return exitTable(editor, dir as 1 | -1)
  return true
}

function extendCell(editor: Editor, axis: Axis, dir: number): boolean {
  const { state, view } = editor
  const sel = state.selection
  if (!(sel instanceof CellSelection)) return false
  const $next = nextCell(sel.$headCell, axis, dir)
  if ($next) {
    view.dispatch(state.tr.setSelection(new CellSelection(sel.$anchorCell, $next)).scrollIntoView())
  }
  return true
}

function tabToCell(editor: Editor, dir: 1 | -1): boolean {
  const { state, view } = editor
  if (!isInTable(state)) return false
  if (!goToNextCell(dir)(state, view.dispatch)) {
    if (dir !== 1) return true
    if (!editor.can().addRowAfter()) return true
    editor.chain().addRowAfter().run()
    if (!goToNextCell(dir)(editor.state, view.dispatch)) return true
  }
  const $cell = cellAround(editor.state.selection.$head)
  if ($cell) selectCell(editor, $cell.pos)
  return true
}

function selectWholeTable(editor: Editor, $cell: ResolvedPos): boolean {
  const { state, view } = editor
  const { start, map } = tableAround($cell)
  view.dispatch(
    state.tr.setSelection(
      new CellSelection(
        state.doc.resolve(start + map.map[0]!),
        state.doc.resolve(start + map.map[map.map.length - 1]!),
      ),
    ),
  )
  return true
}

function escalateSelectAll(editor: Editor): boolean {
  const { state, view } = editor
  const sel = state.selection
  if (sel instanceof CellSelection) {
    const { start, map } = tableAround(sel.$anchorCell)
    const rect = map.rectBetween(sel.$anchorCell.pos - start, sel.$headCell.pos - start)
    const wholeTable = rect.left === 0 && rect.top === 0 && rect.right === map.width && rect.bottom === map.height
    if (wholeTable) return false
    return selectWholeTable(editor, sel.$anchorCell)
  }
  const $cell = cellAround(sel.$head)
  if (!$cell) return false
  const cell = $cell.nodeAfter
  if (!cell) return false
  const from = Selection.near(state.doc.resolve($cell.pos + 1), 1).from
  const to = Selection.near(state.doc.resolve($cell.pos + cell.nodeSize - 1), -1).from
  if (sel.from === from && sel.to === to) {
    return selectWholeTable(editor, $cell)
  }
  view.dispatch(state.tr.setSelection(TextSelection.create(state.doc, from, to)))
  return true
}

function isOnCell(selection: unknown, $cell: ResolvedPos): boolean {
  return (
    selection instanceof CellSelection &&
    selection.$anchorCell.pos === $cell.pos &&
    selection.$headCell.pos === $cell.pos
  )
}

function cellAtCoords(view: EditorView, event: { clientX: number; clientY: number }): ResolvedPos | null {
  const coords = view.posAtCoords({ left: event.clientX, top: event.clientY })
  if (!coords) return null
  return cellAround(view.state.doc.resolve(coords.pos))
}

function watchLongPress(event: PointerEvent): boolean {
  const { clientX, clientY, pointerId } = event
  const target = event.target
  if (!(target instanceof Element)) return false

  const cleanup = () => {
    clearTimeout(timer)
    document.removeEventListener('pointermove', onMove)
    document.removeEventListener('pointerup', onEnd)
    document.removeEventListener('pointercancel', onEnd)
    document.removeEventListener('contextmenu', onNativeMenu, true)
  }
  const timer = window.setTimeout(() => {
    cleanup()
    target.dispatchEvent(
      new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        clientX,
        clientY,
      }),
    )
  }, LONG_PRESS_MS)
  const onMove = (e: PointerEvent) => {
    if (e.pointerId !== pointerId) return
    if (Math.hypot(e.clientX - clientX, e.clientY - clientY) > LONG_PRESS_SLOP) {
      cleanup()
    }
  }
  const onEnd = (e: PointerEvent) => {
    if (e.pointerId === pointerId) cleanup()
  }
  const onNativeMenu = () => cleanup()
  document.addEventListener('pointermove', onMove)
  document.addEventListener('pointerup', onEnd)
  document.addEventListener('pointercancel', onEnd)
  document.addEventListener('contextmenu', onNativeMenu, true)
  return false
}

export const TableNavigation = Extension.create({
  name: 'tableNavigation',
  priority: 200,

  addProseMirrorPlugins() {
    const editor = this.editor

    return [
      new Plugin({
        props: {
          handleKeyDown(view, event) {
            if (!editor.isEditable) return false
            const { state } = view
            if (!isInTable(state)) return false
            const navigating = state.selection instanceof CellSelection

            if (
              (event.metaKey || event.ctrlKey) &&
              !event.altKey &&
              !event.shiftKey &&
              event.key.toLowerCase() === 'a'
            ) {
              return escalateSelectAll(editor)
            }

            if (event.key === 'Tab') {
              if (event.metaKey || event.ctrlKey || event.altKey) return false
              tabToCell(editor, event.shiftKey ? -1 : 1)
              return true
            }

            if (
              event.shiftKey &&
              !event.metaKey &&
              !event.ctrlKey &&
              !event.altKey &&
              (ARROWS as readonly string[]).includes(event.key)
            ) {
              if (!navigating) return false
              switch (event.key) {
                case 'ArrowRight':
                  return extendCell(editor, 'horiz', 1)
                case 'ArrowLeft':
                  return extendCell(editor, 'horiz', -1)
                case 'ArrowDown':
                  return extendCell(editor, 'vert', 1)
                case 'ArrowUp':
                  return extendCell(editor, 'vert', -1)
              }
            }

            if (!navigating && (ARROWS as readonly string[]).includes(event.key)) {
              return arrowLeavesCell(view, event)
            }

            switch (event.key) {
              case 'ArrowRight':
                return navigating ? moveCell(editor, 'horiz', 1) : false
              case 'ArrowLeft':
                return navigating ? moveCell(editor, 'horiz', -1) : false
              case 'ArrowDown':
                return navigating ? moveCell(editor, 'vert', 1) : false
              case 'ArrowUp':
                return navigating ? moveCell(editor, 'vert', -1) : false
              case 'Enter':
                if (navigating) {
                  return editCell(editor, (state.selection as CellSelection).$anchorCell)
                }
                if (!event.shiftKey && !event.metaKey && !event.ctrlKey && !event.altKey) {
                  return selectCell(editor, selectionCell(state).pos)
                }
                return false
              case 'Escape':
                if (!navigating) return selectCell(editor, selectionCell(state).pos)
                return false
              default:
                return false
            }
          },

          handleDOMEvents: {
            pointerdown(view, event: PointerEvent) {
              if (!editor.isEditable) return false

              if (event.pointerType === 'touch') {
                if (!cellAtCoords(view, event)) return false
                return watchLongPress(event)
              }

              const resizeState = columnResizingPluginKey.getState(view.state)
              if (resizeState && resizeState.activeHandle > -1) return false
              if (event.button !== 0 || event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) {
                return false
              }
              const $cell = cellAtCoords(view, event)
              if (!$cell) return false
              if (isOnCell(view.state.selection, $cell)) return false
              const $editing = cellAround(view.state.selection.$head)
              if (!(view.state.selection instanceof CellSelection) && $editing && $editing.pos === $cell.pos) {
                return false
              }

              event.preventDefault()
              const anchorPos = $cell.pos
              view.dispatch(view.state.tr.setSelection(CellSelection.create(view.state.doc, anchorPos)))
              if (!view.hasFocus()) view.focus()

              const anchorDom = view.nodeDOM(anchorPos)
              const wrapper = anchorDom instanceof HTMLElement ? anchorDom.closest<HTMLElement>('.tableWrapper') : null
              trackPointerDrag({
                event,
                area: wrapper,
                onPoint(x, y) {
                  const $head = cellAtCoords(view, { clientX: x, clientY: y })
                  if (!$head) return
                  const $anchor = view.state.doc.resolve(anchorPos)
                  if ($head.start(-1) !== $anchor.start(-1)) return
                  const next = CellSelection.create(view.state.doc, anchorPos, $head.pos)
                  if (!view.state.selection.eq(next)) {
                    view.dispatch(view.state.tr.setSelection(next))
                  }
                },
              })
              return true
            },

            compositionstart(view) {
              if (!editor.isEditable) return false
              const { selection } = view.state
              if (!(selection instanceof CellSelection)) return false
              editCell(editor, selection.$anchorCell)
              return false
            },
          },

          handleTextInput(view, _from, _to, text) {
            if (!editor.isEditable) return false
            const { selection } = view.state
            if (!(selection instanceof CellSelection)) return false
            const $cell = selection.$anchorCell
            const cell = $cell.nodeAfter
            if (!cell) return false
            const end = $cell.pos + cell.nodeSize - 1
            view.dispatch(
              view.state.tr
                .setSelection(TextSelection.near(view.state.doc.resolve(end), -1))
                .insertText(text)
                .scrollIntoView(),
            )
            return true
          },

          handlePaste(view, _event, slice) {
            if (!editor.isEditable) return false
            const { selection } = view.state
            if (!(selection instanceof CellSelection)) return false
            let tableContent = false
            slice.content.forEach((node) => {
              if (node.type.spec.tableRole) tableContent = true
            })
            if (tableContent) return false
            editCell(editor, selection.$anchorCell)
            return false
          },
        },
      }),
    ]
  },
})
