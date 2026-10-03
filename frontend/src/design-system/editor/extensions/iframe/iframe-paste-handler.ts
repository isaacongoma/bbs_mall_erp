import { Plugin, PluginKey } from '@tiptap/pm/state'
import type { EditorView } from '@tiptap/pm/view'
import { dispatchIfAlive } from '../shared/node-view'
import { validateIframeUrl } from './iframe-allowlist'
import { processEmbedUrl, getOptimalDimensions } from './iframe-embed-utils'
import { parseIframeFromHTML, type ParsedIframeEmbed } from './parseIframeEmbed'

function insertIframeNode(
  view: EditorView,
  nodeName: string,
  embed: ParsedIframeEmbed,
  allowlist?: readonly string[],
): boolean {
  const processedSrc = processEmbedUrl(embed.src)
  if (!validateIframeUrl(processedSrc, { allowlist })) return false

  const nodeType = view.state.schema.nodes[nodeName]
  if (!nodeType) return false

  const editorWidth = view.dom.clientWidth || 800
  const optimal = getOptimalDimensions(processedSrc, editorWidth)
  const width = embed.width ?? optimal.width
  const height = embed.height ?? optimal.height

  const node = nodeType.create({
    src: processedSrc,
    width,
    height,
    title: embed.title ?? null,
    align: 'center',
    aspectRatio: height / width,
  })

  return dispatchIfAlive(view, view.state.tr.replaceSelectionWith(node))
}

export function createIframePastePlugin(nodeName: string, allowlist?: readonly string[]): Plugin {
  return new Plugin({
    key: new PluginKey('iframe-paste-handler'),
    props: {
      handlePaste: (view: EditorView, event: ClipboardEvent): boolean => {
        const html = event.clipboardData?.getData('text/html')
        const text = event.clipboardData?.getData('text/plain')

        if (html) {
          const embed = parseIframeFromHTML(html)
          if (embed && insertIframeNode(view, nodeName, embed, allowlist)) return true
        }

        if (text && text.includes('<iframe')) {
          const embed = parseIframeFromHTML(text)
          if (embed && insertIframeNode(view, nodeName, embed, allowlist)) return true
        }

        if (text) {
          const trimmed = text.trim()
          const processed = processEmbedUrl(trimmed)
          if (validateIframeUrl(processed, { allowlist })) {
            if (insertIframeNode(view, nodeName, { src: trimmed }, allowlist)) return true
          }
        }

        return false
      },
    },
  })
}
