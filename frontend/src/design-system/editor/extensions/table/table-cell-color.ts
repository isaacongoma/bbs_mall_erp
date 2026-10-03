import { Extension } from '@tiptap/core'
import type { EditorState } from '@tiptap/pm/state'
import type { MarkType, Node as PMNode } from '@tiptap/pm/model'
import { CellSelection, isInTable, selectionCell } from '@tiptap/pm/tables'
import { PALETTE_NAMES } from '../shared/color-palette'

const ALIGNABLE_NODES = new Set(['paragraph', 'heading'])

function cellContentRanges(state: EditorState): Array<{ from: number; to: number }> {
  const ranges: Array<{ from: number; to: number }> = []
  const addCell = (cell: PMNode | null, pos: number) => {
    if (!cell) return
    ranges.push({ from: pos + 1, to: pos + cell.nodeSize - 1 })
  }
  const { selection } = state
  if (selection instanceof CellSelection) {
    selection.forEachCell((cell, pos) => addCell(cell, pos))
  } else {
    const $cell = selectionCell(state)
    if ($cell) addCell($cell.nodeAfter, $cell.pos)
  }
  return ranges
}

function isRangeFullyMarked(state: EditorState, from: number, to: number, markType: MarkType): boolean {
  let hasText = false
  let allMarked = true
  state.doc.nodesBetween(from, to, (node) => {
    if (!node.isText) return
    hasText = true
    if (!markType.isInSet(node.marks)) allMarked = false
  })
  return hasText && allMarked
}
import { extractHighlightColorFromStyle, highlightColorStyle } from '../shared/color-style'

export const cellBackgroundAttributes = {
  backgroundColor: {
    default: null as string | null,
    parseHTML: (element: HTMLElement) => {
      const style = element.getAttribute('style')
      if (!style) return null
      return extractHighlightColorFromStyle(style, PALETTE_NAMES)
    },
    renderHTML: (attributes: Record<string, unknown>) => {
      const name = attributes.backgroundColor
      if (typeof name !== 'string' || !PALETTE_NAMES.includes(name)) return {}
      return { style: highlightColorStyle(name) }
    },
  },
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    tableCellColor: {
      setCellBackground: (colorName: string | null) => ReturnType
      setCellTextColor: (colorName: string | null) => ReturnType
      setCellTextAlign: (alignment: string) => ReturnType
      toggleCellBold: () => ReturnType
    }
  }
}

export const TableCellColor = Extension.create({
  name: 'tableCellColor',

  addCommands() {
    return {
      setCellBackground:
        (colorName) =>
        ({ chain }) => {
          if (colorName !== null && !PALETTE_NAMES.includes(colorName)) {
            return false
          }
          return chain().setCellAttribute('backgroundColor', colorName).run()
        },

      setCellTextColor:
        (colorName) =>
        ({ state, tr, dispatch }) => {
          if (colorName !== null && !PALETTE_NAMES.includes(colorName)) {
            return false
          }
          if (!isInTable(state)) return false
          const markType = state.schema.marks.textStyle
          if (!markType) return false

          const ranges = cellContentRanges(state)
          if (!ranges.length) return false

          for (const { from, to } of ranges) {
            tr.removeMark(from, to, markType)
            if (colorName) tr.addMark(from, to, markType.create({ color: colorName }))
          }
          if (dispatch) dispatch(tr.scrollIntoView())
          return true
        },

      setCellTextAlign:
        (alignment) =>
        ({ state, tr, dispatch }) => {
          if (!isInTable(state)) return false
          const ranges = cellContentRanges(state)
          if (!ranges.length) return false

          for (const { from, to } of ranges) {
            state.doc.nodesBetween(from, to, (node, pos) => {
              if (!ALIGNABLE_NODES.has(node.type.name)) return
              tr.setNodeAttribute(pos, 'textAlign', alignment)
            })
          }
          if (dispatch) dispatch(tr.scrollIntoView())
          return true
        },

      toggleCellBold:
        () =>
        ({ state, tr, dispatch }) => {
          if (!isInTable(state)) return false
          const markType = state.schema.marks.bold
          if (!markType) return false
          const ranges = cellContentRanges(state)
          if (!ranges.length) return false

          const allBold = ranges.every(({ from, to }) =>
            from >= to ? true : isRangeFullyMarked(state, from, to, markType),
          )
          for (const { from, to } of ranges) {
            if (from >= to) continue
            if (allBold) tr.removeMark(from, to, markType)
            else tr.addMark(from, to, markType.create())
          }
          if (dispatch) dispatch(tr.scrollIntoView())
          return true
        },
    }
  },
})

export { TableCellColor as default }
