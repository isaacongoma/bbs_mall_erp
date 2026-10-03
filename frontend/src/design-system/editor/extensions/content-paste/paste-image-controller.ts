import type { Editor } from '@tiptap/core'
import { dataUrlOrBlobToFile, type MediaUploadEngine, type MediaUploadOptions } from '../shared/media-upload-engine'
import { collectImageNodes, parseHtmlToSlice } from './paste-html-utils'

export async function processHTMLImages(
  html: string,
  editor: Editor,
  engine: MediaUploadEngine,
  options: MediaUploadOptions,
): Promise<void> {
  const view = editor.view
  const slice = parseHtmlToSlice(html, view.state.schema)

  const { from } = view.state.selection
  view.dispatch(view.state.tr.replaceSelection(slice))
  const insertedFrom = from
  const insertedTo = Math.min(view.state.selection.to, view.state.doc.content.size)

  const pasted = collectImageNodes(view.state.doc, Math.min(insertedFrom, insertedTo), insertedTo)
  if (pasted.length === 0) return

  const fetched = await Promise.all(
    pasted.map(async ({ src }): Promise<{ src: string; file: File } | null> => {
      try {
        const file = await dataUrlOrBlobToFile(src, 'pasted-image.png')
        return { src, file }
      } catch (error) {
        console.error('Failed to fetch pasted image:', error)
        return null
      }
    }),
  )
  if (editor.isDestroyed) return

  for (const entry of fetched) {
    if (entry === null) continue
    if (editor.isDestroyed) return
    const pos = engine.findNodeBySource(editor, entry.src)
    if (pos === null) continue
    await engine.processMultiple([entry.file], editor, pos, options)
  }
}
