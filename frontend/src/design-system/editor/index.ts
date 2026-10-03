export { useEditor, type EditorContentValue, type EditorUploadedFile, type UseEditorOptions } from './hooks/useEditor'
export type { Editor as TiptapEditor, JSONContent } from './types/editor'

export { Editor, type EditorHandle, type EditorProps } from './components/Editor'
export { EditorContent, type EditorContentProps } from './components/EditorContent'
export { EditorDropZone, type EditorDropZoneProps } from './components/EditorDropZone'
export { EditorFixedMenu, type EditorFixedMenuProps } from './components/EditorFixedMenu'
export { EditorBubbleMenu, type EditorBubbleMenuProps } from './components/EditorBubbleMenu'
export { EditorTableMenu, type EditorTableMenuProps } from './components/EditorTableMenu'
export { EditorFloatingMenu, type EditorFloatingMenuProps } from './components/EditorFloatingMenu'
export { MenuItems, type MenuItemsProps } from './components/MenuItems'
export { InsertImage } from './components/InsertImage'
export { InsertVideo } from './components/InsertVideo'
export { InsertLink } from './components/InsertLink'
export { EditorContext, useResolvedEditor } from './hooks/useResolvedEditor'

export {
  CommentKit,
  RichTextKit,
  InlineKit,
  type CommentKitOptions,
  type RichTextKitOptions,
  type InlineKitOptions,
} from './kits'

export * from './extensions'
export * from './menu'
