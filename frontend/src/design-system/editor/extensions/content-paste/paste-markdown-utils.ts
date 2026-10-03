import type { Schema, Slice } from '@tiptap/pm/model'
import { detectMarkdown, markdownToHTML } from '../../../utils/markdown'
import { parseHtmlToSlice } from './paste-html-utils'

export function tryMarkdownSlice(text: string, schema: Schema): Slice | null {
  if (!text || !detectMarkdown(text)) return null
  const html = markdownToHTML(text)
  return parseHtmlToSlice(html, schema)
}
