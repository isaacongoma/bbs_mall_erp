import type { AnyExtension } from '@tiptap/core'
import { uploadFile as uploadToServer } from '@/design-system'
import { RichTextKit, type EditorUploadedFile, type MentionSuggestionItem } from '@/design-system/editor'
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Blockquote,
  Bold,
  BulletList,
  FontColor,
  HeadingGroup,
  HorizontalRule,
  InlineCode,
  InsertImage,
  InsertLink,
  InsertTable,
  InsertVideo,
  Italic,
  OrderedList,
  Paragraph,
  Separator,
  Strike,
  type MenuItem,
} from '@/design-system/editor/menu'

export type MentionItem = MentionSuggestionItem

export interface EditorExtensionOptions {
  mentions?: MentionItem[] | (() => MentionItem[])
  starterKit?: Record<string, unknown>
  extra?: AnyExtension[]
}

export function buildEditorExtensions(options: EditorExtensionOptions = {}): AnyExtension[] {
  return [
    RichTextKit.configure({
      heading: { levels: [2, 3, 4, 5, 6] },
      ...(options.mentions ? { mention: { items: options.mentions } } : {}),
      ...(options.starterKit ? { starterKit: options.starterKit } : {}),
    }),
    ...(options.extra ?? []),
  ]
}

export const fullToolbar: MenuItem[] = [
  Paragraph,
  HeadingGroup,
  Separator,
  Bold,
  Italic,
  Separator,
  BulletList,
  OrderedList,
  Separator,
  AlignLeft,
  AlignCenter,
  AlignRight,
  FontColor,
  Separator,
  InsertImage,
  InsertVideo,
  InsertLink,
  Blockquote,
  InlineCode,
  HorizontalRule,
  InsertTable,
]

export const bubbleToolbar: MenuItem[] = [Bold, Italic, Strike, InsertLink]

export function uploadFile(
  file: File,
  doctype?: string,
  docname?: string,
  isPrivate = true,
): Promise<EditorUploadedFile> {
  return uploadToServer(file, { private: isPrivate, doctype, docname }).then((uploaded) => ({ ...uploaded }))
}
