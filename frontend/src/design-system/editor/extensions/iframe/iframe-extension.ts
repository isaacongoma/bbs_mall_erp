import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { IframeNodeView } from '../../components/IframeNodeView'
import { IFRAME_SANDBOX, validateIframeUrl } from './iframe-allowlist'
import { processEmbedUrl } from './iframe-embed-utils'
import { buildIframeCommands, type IframeAlign } from './iframe-commands'
import { createIframePastePlugin } from './iframe-paste-handler'

export type { SetIframeOptions, IframeAlign } from './iframe-commands'

export interface IframeOptions {
  allowlist?: readonly string[]
  HTMLAttributes: Record<string, unknown>
}

const ALIGNMENTS: readonly IframeAlign[] = ['left', 'center', 'right']

function normalizeAlign(value: string | null): IframeAlign {
  const align = (value ?? 'center').toLowerCase()
  return (ALIGNMENTS as readonly string[]).includes(align) ? (align as IframeAlign) : 'center'
}

function parseDimension(value: string | null): number | null {
  if (!value) return null
  const n = parseInt(value, 10)
  return Number.isNaN(n) ? null : n
}

export const IframeExtension = Node.create<IframeOptions>({
  name: 'iframe',
  group: 'block',
  selectable: true,
  draggable: true,
  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (element) => element.getAttribute('src'),
        renderHTML: (attributes) => ({ src: attributes.src }),
      },
      width: {
        default: null,
        parseHTML: (element) => parseDimension(element.getAttribute('width')),
        renderHTML: (attributes) => ({
          width: attributes.width ? String(attributes.width) : null,
        }),
      },
      height: {
        default: null,
        parseHTML: (element) => parseDimension(element.getAttribute('height')),
        renderHTML: (attributes) => ({
          height: attributes.height ? String(attributes.height) : null,
        }),
      },
      aspectRatio: {
        default: 9 / 16,
        parseHTML: () => null,
        renderHTML: () => ({}),
      },
      align: {
        default: 'center',
        parseHTML: (element) => normalizeAlign(element.getAttribute('data-align') ?? element.getAttribute('align')),
        renderHTML: (attributes) => ({
          'data-align': attributes.align || 'center',
        }),
      },
      title: {
        default: null,
        parseHTML: (element) => element.getAttribute('title'),
        renderHTML: (attributes) => ({ title: attributes.title }),
      },
      frameborder: {
        default: '0',
        renderHTML: () => ({ frameborder: '0' }),
      },
      allowfullscreen: {
        default: 'true',
        renderHTML: () => ({ allowfullscreen: 'true' }),
      },
      sandbox: {
        default: IFRAME_SANDBOX,
        parseHTML: () => IFRAME_SANDBOX,
        renderHTML: () => ({ sandbox: IFRAME_SANDBOX }),
      },
      interactive: {
        default: false,
        parseHTML: (element) => element.getAttribute('data-interactive') === 'true',
        renderHTML: (attributes) => ({
          'data-interactive': attributes.interactive ? 'true' : 'false',
        }),
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'iframe[src]',
        getAttrs: (element) => {
          const raw = (element as HTMLElement).getAttribute('src')
          if (!raw) return false
          const src = processEmbedUrl(raw)
          if (!validateIframeUrl(src, { allowlist: this.options.allowlist })) {
            return false
          }
          return {
            src,
            width: parseDimension((element as HTMLElement).getAttribute('width')),
            height: parseDimension((element as HTMLElement).getAttribute('height')),
            title: (element as HTMLElement).getAttribute('title') || null,
            align: normalizeAlign((element as HTMLElement).getAttribute('data-align')),
          }
        },
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'iframe',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        sandbox: IFRAME_SANDBOX,
        loading: 'lazy',
        referrerpolicy: 'no-referrer-when-downgrade',
      }),
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(IframeNodeView)
  },

  addCommands() {
    return buildIframeCommands(this.name, this.options.allowlist)
  },

  addProseMirrorPlugins() {
    return [createIframePastePlugin(this.name, this.options.allowlist)]
  },
})

export default IframeExtension
