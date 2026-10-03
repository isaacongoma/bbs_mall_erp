import type { ComponentType, ReactNode } from 'react'
import type { IconSource } from '../icons'
import type { Editor } from './types/editor'
import { commandMeta, headingMeta, type EditorCommandContext, type EditorCommandMeta } from './commands'
import { CellSelection } from '@tiptap/pm/tables'
import { openFontColorPicker } from './utils/fontColorController'
import { openTableCellColorPicker } from './utils/tableCellColorController'
import { openTableSizePicker } from './utils/tableSizePickerController'

function isCellRangeSelection(editor: Editor): boolean {
  return editor.state?.selection instanceof CellSelection
}

export type MenuActionContext = EditorCommandContext

export type MenuItemTrigger = { isActive?: boolean; onClick: () => void }

export type MenuItemComponent = ComponentType<{
  editor: Editor
  children: (trigger: MenuItemTrigger) => ReactNode
}>

export type CommandMenuItem = {
  icon?: IconSource
  label: string
  getLabel?: (editor: Editor) => string
  action: (editor: Editor, context?: MenuActionContext) => boolean | void | Promise<boolean | void>
  isActive?: (editor: Editor) => boolean
  isDisabled?: (editor: Editor) => boolean
  component?: MenuItemComponent
  isAvailable?: (editor: Editor) => boolean
}

export type MenuGroupItem = {
  type: 'group'
  icon?: IconSource
  label: string
  items: CommandMenuItem[]
}

export type MenuItem = CommandMenuItem | MenuGroupItem | { type: 'separator' }

function canRun(editor: Editor, command: CommandMenuItem['action']) {
  const canEditor = editor.can?.()
  if (!canEditor?.chain) return true

  const canChain = canEditor.chain()
  const proxyEditor = {
    ...editor,
    chain: () => canChain,
  } as Editor

  try {
    command(proxyEditor)
    return canChain.run?.() !== false
  } catch {
    return true
  }
}

function command(
  meta: EditorCommandMeta,
  action: CommandMenuItem['action'],
  component?: MenuItemComponent,
  canCheck = true,
): CommandMenuItem {
  return {
    label: meta.label,
    icon: meta.icon,
    action,
    isActive: meta.isActive,
    isDisabled: canCheck ? (editor) => !canRun(editor, action) : undefined,
    isAvailable: meta.isAvailable,
    component,
  }
}

export const Bold = command(commandMeta.bold, (editor) => {
  if (isCellRangeSelection(editor)) {
    return editor.chain().toggleCellBold().run()
  }
  return editor.chain().focus().toggleBold().run()
})
export const Italic = command(commandMeta.italic, (editor) => editor.chain().focus().toggleItalic().run())
export const Strike = command(commandMeta.strike, (editor) => editor.chain().focus().toggleStrike().run())
export const InlineCode = command(commandMeta.inlineCode, (editor) => editor.chain().focus().toggleCode().run())
export const BulletList = command(commandMeta.bulletList, (editor) => editor.chain().focus().toggleBulletList().run())
export const OrderedList = command(commandMeta.orderedList, (editor) =>
  editor.chain().focus().toggleOrderedList().run(),
)
export const Blockquote = command(commandMeta.blockquote, (editor) => editor.chain().focus().toggleBlockquote().run())
export const Paragraph = command(commandMeta.paragraph, (editor) => editor.chain().focus().setParagraph().run())

function heading(level: 1 | 2 | 3 | 4 | 5 | 6): CommandMenuItem {
  return command(headingMeta(level), (editor) => editor.chain().focus().toggleHeading({ level }).run())
}

export const H1 = heading(1)
export const H2 = heading(2)
export const H3 = heading(3)
export const H4 = heading(4)
export const H5 = heading(5)
export const H6 = heading(6)
export const HeadingGroup: MenuGroupItem = {
  type: 'group',
  label: 'Heading',
  items: [H2, H3, H4],
}

function align(meta: EditorCommandMeta, alignment: string): CommandMenuItem {
  return command(meta, (editor) => {
    if (isCellRangeSelection(editor)) {
      return editor.chain().setCellTextAlign(alignment).run()
    }
    return editor.chain().focus().setTextAlign(alignment).run()
  })
}
export const AlignLeft = align(commandMeta.alignLeft, 'left')
export const AlignCenter = align(commandMeta.alignCenter, 'center')
export const AlignRight = align(commandMeta.alignRight, 'right')
export const FontColor = command(
  commandMeta.fontColor,
  (editor, context) => {
    if (!context?.trigger) return
    openFontColorPicker({ editor, anchor: context.trigger })
  },
  undefined,
  false,
)
export const FontHighlight = command(commandMeta.fontHighlight, (editor) =>
  editor.chain().focus().toggleHighlightByName('yellow').run(),
)
export const InsertImage = command(
  commandMeta.image,
  (editor) => editor.chain().focus().selectAndUploadImage().run(),
  undefined,
  false,
)
export const InsertVideo = command(
  commandMeta.video,
  (editor) => editor.chain().focus().selectAndUploadVideo().run(),
  undefined,
  false,
)
export const InsertAttachment = command(
  commandMeta.attachment,
  (editor) => editor.chain().focus().selectAndUploadFile().run(),
  undefined,
  false,
)
export const InsertLink = command(commandMeta.link, (editor) => editor.commands.openLinkEditor(), undefined, false)
export const InsertIframe = command(commandMeta.embed, (editor) => editor.commands.openIframeDialog(), undefined, false)
export const InsertTable = command(
  commandMeta.table,
  (editor, context) => {
    if (context?.trigger) {
      openTableSizePicker({ editor, anchor: context.trigger })
      return
    }
    return editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
  },
  undefined,
  false,
)
export const HorizontalRule = command(commandMeta.horizontalRule, (editor) =>
  editor.chain().focus().setHorizontalRule().run(),
)

export const Undo: CommandMenuItem = {
  label: 'Undo',
  icon: 'lucide-undo-2',
  action: (editor) => editor.chain().focus().undo().run(),
  isDisabled: (editor) => !editor.can().undo(),
}
export const Redo: CommandMenuItem = {
  label: 'Redo',
  icon: 'lucide-redo-2',
  action: (editor) => editor.chain().focus().redo().run(),
  isDisabled: (editor) => !editor.can().redo(),
}

export const Separator: MenuItem = { type: 'separator' }

function tableLoaded(editor: Editor): boolean {
  return !!editor.schema.nodes.table
}

function tableCommand(
  label: string,
  icon: string,
  action: CommandMenuItem['action'],
  isActive?: (editor: Editor) => boolean,
): CommandMenuItem {
  return {
    label,
    icon,
    action,
    isActive,
    isDisabled: (editor) => !canRun(editor, action),
    isAvailable: tableLoaded,
  }
}

export const TableAddColumnBefore = tableCommand('Insert column left', 'lucide-arrow-left-to-line', (editor) =>
  editor.chain().focus().addColumnBefore().run(),
)
export const TableAddColumnAfter = tableCommand('Insert column right', 'lucide-arrow-right-to-line', (editor) =>
  editor.chain().focus().addColumnAfter().run(),
)
export const TableDeleteColumn = tableCommand('Delete column', 'lucide-square-x', (editor) =>
  editor.chain().focus().deleteColumn().run(),
)
export const TableAddRowBefore = tableCommand('Insert row above', 'lucide-arrow-up-to-line', (editor) =>
  editor.chain().focus().addRowBefore().run(),
)
export const TableAddRowAfter = tableCommand('Insert row below', 'lucide-arrow-down-to-line', (editor) =>
  editor.chain().focus().addRowAfter().run(),
)
export const TableDeleteRow = tableCommand('Delete row', 'lucide-square-x', (editor) =>
  editor.chain().focus().deleteRow().run(),
)
export const TableToggleHeaderRow = tableCommand(
  'Toggle header row',
  'lucide-panel-top',
  (editor) => editor.chain().focus().toggleHeaderRow().run(),
  (editor) => editor.isActive('tableHeader'),
)
export const TableMergeOrSplit: CommandMenuItem = {
  ...tableCommand('Merge or split cells', 'lucide-table-cells-merge', (editor) =>
    editor.chain().focus().mergeOrSplit().run(),
  ),
  getLabel: (editor) =>
    editor.can().mergeCells() ? 'Merge cells' : editor.can().splitCell() ? 'Split cell' : 'Merge or split cells',
}
export const TableDelete = tableCommand('Delete table', 'lucide-trash-2', (editor) =>
  editor.chain().focus().deleteTable().run(),
)
export const CellColor: CommandMenuItem = {
  label: 'Cell color',
  icon: 'lucide-paint-bucket',
  action: (editor, context) => {
    if (!context?.trigger) return
    openTableCellColorPicker({ editor, anchor: context.trigger })
  },
  isAvailable: tableLoaded,
}

export const tableToolbar: MenuItem[] = [
  TableAddColumnBefore,
  TableAddColumnAfter,
  TableDeleteColumn,
  Separator,
  TableAddRowBefore,
  TableAddRowAfter,
  TableDeleteRow,
  Separator,
  TableToggleHeaderRow,
  TableMergeOrSplit,
  CellColor,
  Separator,
  TableDelete,
]

export const minimalToolbar: MenuItem[] = [Bold, Italic, InsertLink]
export const commentToolbar: MenuItem[] = [Bold, Italic, Strike, Separator, BulletList, OrderedList, InsertLink]
export const articleToolbar: MenuItem[] = [
  HeadingGroup,
  Separator,
  Bold,
  Italic,
  Strike,
  Separator,
  BulletList,
  OrderedList,
  Blockquote,
  InsertLink,
  InsertImage,
  InsertTable,
]
