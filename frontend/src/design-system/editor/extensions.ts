import { Extension, type Editor, type Extensions } from '@tiptap/core'
import { Blockquote, type BlockquoteOptions } from '@tiptap/extension-blockquote'
import { Bold, type BoldOptions } from '@tiptap/extension-bold'
import { Document } from '@tiptap/extension-document'
import { HardBreak, type HardBreakOptions } from '@tiptap/extension-hard-break'
import { HorizontalRule, type HorizontalRuleOptions } from '@tiptap/extension-horizontal-rule'
import { Italic, type ItalicOptions } from '@tiptap/extension-italic'
import {
  BulletList,
  type BulletListOptions,
  ListItem,
  type ListItemOptions,
  ListKeymap,
  type ListKeymapOptions,
  OrderedList,
  type OrderedListOptions,
} from '@tiptap/extension-list'
import { Paragraph, type ParagraphOptions } from '@tiptap/extension-paragraph'
import { Strike, type StrikeOptions } from '@tiptap/extension-strike'
import { Text } from '@tiptap/extension-text'
import { Underline, type UnderlineOptions } from '@tiptap/extension-underline'
import {
  Dropcursor,
  type DropcursorOptions,
  Gapcursor,
  TrailingNode,
  type TrailingNodeOptions,
  UndoRedo,
  type UndoRedoOptions,
} from '@tiptap/extensions'
import PlaceholderExtension from '@tiptap/extension-placeholder'
import HeadingExtension, { type HeadingOptions } from '@tiptap/extension-heading'
import HeadingIdsExtension from './extensions/heading/heading-ids'
import { LinkExtension } from './extensions/link'
import { ExtendedCode, ExtendedCodeBlock } from './extensions/code-block'
import {
  Table as TiptapTable,
  TableRow,
  TableCell as TiptapTableCell,
  TableHeader as TiptapTableHeader,
} from '@tiptap/extension-table'
import { columnResizing, tableEditing, TableView } from '@tiptap/pm/tables'
import {
  cellBackgroundAttributes,
  TableCellColor as TableCellColorExtension,
} from './extensions/table/table-cell-color'
import { TableSelectionOverlay as TableSelectionOverlayExtension } from './extensions/table/table-selection-overlay'
import TaskListExtension from '@tiptap/extension-task-list'
import TaskItemExtension from '@tiptap/extension-task-item'
import TypographyExtension from '@tiptap/extension-typography'
import TextAlignExtension from '@tiptap/extension-text-align'
import { TextStyle as TextStyleExtension } from '@tiptap/extension-text-style'
import { NamedColorExtension } from './extensions/color'
import { NamedHighlightExtension } from './extensions/highlight'
import { ImageExtension } from './extensions/image'
import { ImageGroup as ImageGroupExtension } from './extensions/image-group'
import ImageViewerExtension from './extensions/image-viewer'
import { VideoExtension } from './extensions/video'
import { AttachmentExtension } from './extensions/attachment'
import { MediaDrop as MediaDropExtension } from './extensions/media-drop/media-drop-extension'
import { IframeExtension } from './extensions/iframe'
import { MentionExtension, type MentionSuggestionItem } from './extensions/mention/mention-extension'
import { TagComposite, type TagSuggestionItem } from './extensions/tag'
import EmojiExtension from './extensions/emoji/emoji-extension'
import { SlashCommands } from './extensions/slash-commands/slash-commands-extension'
import { TocNodeExtension } from './extensions/toc-node'
import { ContentPasteExtension } from './extensions/content-paste'
import StyleClipboardExtension from './extensions/copy-styles'
export { SuggestionExtension, type SuggestionExtensionOptions, type SuggestionRange } from './SuggestionExtension'
export type { MentionSuggestionItem, TagSuggestionItem }

type StarterKitMember<O> = Partial<O> | false

export interface StarterKitOptions {
  blockquote?: StarterKitMember<BlockquoteOptions>
  bold?: StarterKitMember<BoldOptions>
  bulletList?: StarterKitMember<BulletListOptions>
  code?: false
  codeBlock?: false
  document?: false
  dropcursor?: StarterKitMember<DropcursorOptions>
  gapcursor?: false
  hardBreak?: StarterKitMember<HardBreakOptions>
  heading?: StarterKitMember<HeadingOptions>
  horizontalRule?: StarterKitMember<HorizontalRuleOptions>
  italic?: StarterKitMember<ItalicOptions>
  link?: false
  listItem?: StarterKitMember<ListItemOptions>
  listKeymap?: StarterKitMember<ListKeymapOptions>
  orderedList?: StarterKitMember<OrderedListOptions>
  paragraph?: StarterKitMember<ParagraphOptions>
  strike?: StarterKitMember<StrikeOptions>
  text?: false
  trailingNode?: StarterKitMember<TrailingNodeOptions>
  underline?: StarterKitMember<UnderlineOptions>
  undoRedo?: StarterKitMember<UndoRedoOptions>
}

function pushConfigured<O>(
  list: Extensions,
  extension: { configure: (options?: Partial<O>) => any },
  option: StarterKitMember<O> | undefined,
) {
  if (option !== false) list.push(extension.configure(option ?? {}))
}

export const EditorDropcursor = Dropcursor.configure({
  width: 3,
  color: 'var(--surface-gray-10, #383838)',
  class: 'editor-drop-cursor',
})

export const StarterKit = Extension.create<StarterKitOptions>({
  name: 'starterKit',
  addOptions() {
    return {}
  },
  addExtensions() {
    const list: Extensions = []
    pushConfigured(list, Bold, this.options.bold)
    pushConfigured(list, Blockquote, this.options.blockquote)
    pushConfigured(list, BulletList, this.options.bulletList)
    if (this.options.document !== false) list.push(Document)
    pushConfigured(list, EditorDropcursor, this.options.dropcursor)
    if (this.options.gapcursor !== false) list.push(Gapcursor)
    pushConfigured(list, HardBreak, this.options.hardBreak)
    pushConfigured(list, HeadingExtension, this.options.heading)
    pushConfigured(list, UndoRedo, this.options.undoRedo)
    pushConfigured(list, HorizontalRule, this.options.horizontalRule)
    pushConfigured(list, Italic, this.options.italic)
    pushConfigured(list, ListItem, this.options.listItem)
    pushConfigured(list, ListKeymap, this.options.listKeymap)
    pushConfigured(list, OrderedList, this.options.orderedList)
    pushConfigured(list, Paragraph, this.options.paragraph)
    pushConfigured(list, Strike, this.options.strike)
    if (this.options.text !== false) list.push(Text)
    pushConfigured(list, Underline, this.options.underline)
    pushConfigured(list, TrailingNode, this.options.trailingNode)
    if (this.options.heading !== false) list.push(HeadingIds)
    return list
  },
})

type PlaceholderStorage = { text: string | null }

function placeholderStorage(editor: Editor | null | undefined): PlaceholderStorage | undefined {
  return (editor?.storage as Record<string, unknown> | undefined)?.placeholder as PlaceholderStorage | undefined
}

export const Placeholder = PlaceholderExtension.extend({
  addStorage() {
    return { ...(this.parent?.() ?? {}), text: null as string | null }
  },
}).configure({
  placeholder: ({ editor }) => placeholderStorage(editor)?.text ?? '',
})

export function setPlaceholder(editor: Editor | null | undefined, text: string | null): void {
  const storage = placeholderStorage(editor)
  if (!editor || !storage || storage.text === text) return
  storage.text = text
  editor.view?.dispatch(editor.state.tr)
}
export const Heading = HeadingExtension
export const HeadingIds = HeadingIdsExtension
export const Link = LinkExtension
export const Code = ExtendedCode
export const CodeBlock = ExtendedCodeBlock
export const Table = TiptapTable.configure({ resizable: true }).extend({
  addProseMirrorPlugins() {
    return [
      ...(this.options.resizable
        ? [
            columnResizing({
              handleWidth: this.options.handleWidth,
              cellMinWidth: this.options.cellMinWidth,
              defaultCellMinWidth: this.options.cellMinWidth,
              View: this.options.View ?? TableView,
              lastColumnResizable: this.options.lastColumnResizable,
            }),
          ]
        : []),
      tableEditing({ allowTableNodeSelection: this.options.allowTableNodeSelection }),
    ]
  },
})
export const TableCell = TiptapTableCell.extend({
  addAttributes() {
    return { ...this.parent?.(), ...cellBackgroundAttributes }
  },
})
export const TableHeader = TiptapTableHeader.extend({
  addAttributes() {
    return { ...this.parent?.(), ...cellBackgroundAttributes }
  },
})
export { TableRow }
export { TableNavigation } from './extensions/table/table-navigation'
export const TableCellColor = TableCellColorExtension
export const TableSelectionOverlay = TableSelectionOverlayExtension
export const TaskList = TaskListExtension
export const TaskItem = TaskItemExtension.configure({ nested: true })
export const Typography = TypographyExtension
export const TextAlign = TextAlignExtension.configure({
  types: ['heading', 'paragraph'],
})
export const TextStyle = TextStyleExtension
export const Color = NamedColorExtension
export const Highlight = NamedHighlightExtension
export const Image = ImageExtension
export const ImageGroup = ImageGroupExtension
export const ImageViewer = ImageViewerExtension
export const Video = VideoExtension
export const Attachment = AttachmentExtension
export const MediaDrop = MediaDropExtension
export const Iframe = IframeExtension
export const Mention = MentionExtension
export const Tag = TagComposite
export const Emoji = EmojiExtension
export { SlashCommands }
export const Toc = TocNodeExtension
export const ContentPaste = ContentPasteExtension
export const StyleClipboard = StyleClipboardExtension
export type { MediaUploadRequestOptions } from './extensions/shared/media-upload-engine'

export { Markdown, type MarkdownExtensionOptions } from '@tiptap/markdown'
