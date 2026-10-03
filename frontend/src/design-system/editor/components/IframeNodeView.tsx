import { NodeViewWrapper, type ReactNodeViewProps } from '@tiptap/react'
import { useRef, useState, type KeyboardEvent } from 'react'
import { cn } from '../../utils/cn'
import { IFRAME_SANDBOX } from '../extensions/iframe/iframe-allowlist'
import type { IframeAlign } from '../extensions/iframe/iframe-commands'
import { openIframeInsertDialog } from '../extensions/iframe/iframeInsertDialogController'
import { safeGetPos } from '../extensions/shared/node-view'
import { useNodeViewEditable } from '../hooks/useNodeViewEditable'
import { useNodeViewResize, type ResizeEdge } from '../hooks/useNodeViewResize'
import { MediaResizeHandles } from './MediaResizeHandles'
import { MediaToolbar } from './MediaToolbar'

const MIN_WIDTH = 200
const EDITOR_PADDING = 40

export function IframeNodeView({ node, editor, getPos, updateAttributes, selected }: ReactNodeViewProps) {
  const [iframeEl, setIframeEl] = useState<HTMLIFrameElement | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isEditable = useNodeViewEditable(editor)
  const attrs = node.attrs

  const aspectRatio: number = (attrs.aspectRatio as number | null) ?? 9 / 16
  const width: number = (attrs.width as number | null) ?? 640
  const height: number = (attrs.height as number | null) ?? Math.round(width * aspectRatio)
  const isInteractive = !!attrs.interactive
  const overlayActive = isEditable && !isInteractive

  const { startResize } = useNodeViewResize(editor, {
    mediaEl: () => iframeEl,
    containerEl: () => containerRef.current,
    getAspectRatio: () => aspectRatio,
    getPos: () => getPos(),
    onCommit: ({ width: w, height: h }) => updateAttributes({ width: w, height: h, aspectRatio: h / w }),
    minWidth: MIN_WIDTH,
    maxWidthPadding: EDITOR_PADDING,
    mediaSizing: 'style',
  })

  const [showCaption, setShowCaption] = useState(Boolean(attrs.title))
  const [previousTitle, setPreviousTitle] = useState<string | null>(attrs.title ?? null)
  if ((attrs.title ?? null) !== previousTitle) {
    setPreviousTitle(attrs.title ?? null)
    if (attrs.title) setShowCaption(true)
  }

  const selectIframe = () => {
    const pos = safeGetPos(() => getPos())
    if (pos === null) return
    editor.commands.setNodeSelection(pos)
  }

  const onResizeStart = (event: { clientX: number }, edge: ResizeEdge) => {
    selectIframe()
    startResize(event, edge)
  }

  const toggleCaption = () => {
    const next = !showCaption
    setShowCaption(next)
    if (!next) updateAttributes({ title: '' })
  }

  const changeEmbedLink = () =>
    openIframeInsertDialog({
      editor,
      getReplacePos: () => safeGetPos(() => getPos()) ?? undefined,
      initialUrl: (attrs.src as string | null) ?? undefined,
    })

  const setCursorAt = (pos: number) => {
    editor.commands.focus()
    editor.chain().setTextSelection(pos).scrollIntoView().run()
  }

  const onKeyDown = (event: KeyboardEvent) => {
    const pos = safeGetPos(() => getPos())
    if (pos === null) return
    if (event.key === 'Enter') {
      event.preventDefault()
      editor.commands.focus()
      editor
        .chain()
        .setTextSelection(pos + 1)
        .createParagraphNear()
        .scrollIntoView()
        .run()
    } else if (event.key === 'Escape' || event.key === 'ArrowDown') {
      event.preventDefault()
      setCursorAt(pos + 1)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setCursorAt(pos - 1)
    }
  }

  return (
    <NodeViewWrapper>
      <div
        ref={containerRef}
        className={cn(
          'relative isolate my-6 block max-w-full overflow-hidden rounded not-prose focus:outline-none',
          selected && 'ring-2 ring-outline-gray-3 ring-offset-2',
          attrs.align === 'center' && 'mx-auto',
          attrs.align === 'right' && 'ml-auto mr-0',
          attrs.align === 'left' && 'mr-auto ml-0',
        )}
        style={{ width: attrs.width ? `${attrs.width}px` : 'auto', maxWidth: '100%' }}
        tabIndex={0}
        onKeyDown={onKeyDown}
      >
        <div className="relative">
          {attrs.src && (
            <iframe
              ref={setIframeEl}
              className={cn('block h-auto max-w-full rounded border-0', overlayActive && 'pointer-events-none')}
              src={attrs.src}
              style={{ width: `${width}px`, height: `${height}px` }}
              title={attrs.title || ''}
              sandbox={IFRAME_SANDBOX}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              onClick={(event) => {
                event.stopPropagation()
                selectIframe()
              }}
            />
          )}

          {overlayActive && (
            <div
              className="absolute inset-0 z-10 cursor-pointer"
              onClick={(event) => {
                event.stopPropagation()
                selectIframe()
              }}
            />
          )}

          {attrs.src && (
            <MediaToolbar
              node={node}
              mediaType="embed"
              isEditable={isEditable}
              selected={selected}
              showCaption={showCaption}
              onToggleCaption={toggleCaption}
              onSetAlign={(align) => updateAttributes({ align: align as IframeAlign })}
              onReplace={changeEmbedLink}
            />
          )}

          {selected && isEditable && (
            <MediaResizeHandles label="Resize embed" onResizeStart={onResizeStart} onResizeKeyDown={() => undefined} />
          )}

          {!attrs.src && (
            <div className="flex h-[360px] w-[640px] items-center justify-center rounded bg-surface-gray-1">
              <div className="text-center text-ink-gray-5">
                <div className="mb-1 text-lg">🔗</div>
                <div className="text-sm">Loading embed…</div>
              </div>
            </div>
          )}
        </div>

        {(attrs.title || showCaption) && attrs.src && (
          <input
            key={attrs.title ?? ''}
            defaultValue={attrs.title ?? ''}
            className="mt-2 h-7 w-full border-0 bg-transparent text-center text-sm text-ink-gray-6 placeholder:text-ink-gray-4 focus:outline-none focus:ring-0 disabled:opacity-60"
            placeholder="Add caption"
            disabled={!isEditable}
            onBlur={(event) => updateAttributes({ title: event.target.value })}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                updateAttributes({ title: event.currentTarget.value })
              }
            }}
          />
        )}
      </div>
    </NodeViewWrapper>
  )
}
