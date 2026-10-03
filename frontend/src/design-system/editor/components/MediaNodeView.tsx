import { NodeViewWrapper, type ReactNodeViewProps } from '@tiptap/react'
import { useRef, useState, type KeyboardEvent } from 'react'
import { Button } from '../../components/Button'
import { ErrorMessage } from '../../components/ErrorMessage'
import { cn } from '../../utils/cn'
import { pickFiles } from '../extensions/shared/file-picker'
import { abortUpload, getLocalFile } from '../extensions/shared/media-upload-state'
import { safeGetPos } from '../extensions/shared/node-view'
import { useNodeViewEditable } from '../hooks/useNodeViewEditable'
import { useNodeViewResize, type ResizeEdge } from '../hooks/useNodeViewResize'
import { useUploadProgress } from '../hooks/useUploadProgress'
import {
  createParagraphAfterMedia,
  handleCaptionKeydown,
  selectMedia as selectMediaCommand,
  setCursorAfterMedia,
  setCursorBeforeMedia,
  setMediaAlign,
} from '../utils/media-node-view-controller'
import {
  aspectRatioFrom,
  containerClasses,
  heightOverWidth,
  wrapperClasses,
  type MediaAlign,
} from '../utils/media-node-view-utils'
import { MediaResizeHandles } from './MediaResizeHandles'
import { MediaToolbar } from './MediaToolbar'
import { UploadProgressIndicator } from './UploadProgressIndicator'
import { VideoControls } from './VideoControls'

export function MediaNodeView({ node, editor, getPos, updateAttributes, selected }: ReactNodeViewProps) {
  const [mediaEl, setMediaEl] = useState<HTMLImageElement | HTMLVideoElement | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isEditable = useNodeViewEditable(editor)

  const isVideo = node.type.name === 'video'
  const attrs = node.attrs
  const isUploaded = Boolean(attrs.src)
  const localEntry = getLocalFile(attrs.uploadId)
  const fileContent = localEntry?.b64
  const videoPoster = localEntry?.poster
  const progress = useUploadProgress(attrs.uploadId)
  const uploadPercent = progress?.percent ?? 0
  const hasError = Boolean(attrs.error)

  const [showCaption, setShowCaption] = useState(Boolean(attrs.alt))
  const [caption, setCaption] = useState<string>(attrs.alt || '')
  const [previousAlt, setPreviousAlt] = useState<string | null>(attrs.alt ?? null)
  if ((attrs.alt ?? null) !== previousAlt) {
    setPreviousAlt(attrs.alt ?? null)
    const next: string = attrs.alt || ''
    if (next !== caption) setCaption(next)
    if (next) setShowCaption(true)
  }

  const intrinsicAspect = (): number => {
    let width = attrs.width as number | null
    let height = attrs.height as number | null
    if (mediaEl instanceof HTMLVideoElement) {
      width = width || mediaEl.videoWidth
      height = height || mediaEl.videoHeight
    } else if (mediaEl instanceof HTMLImageElement) {
      width = width || mediaEl.naturalWidth
      height = height || mediaEl.naturalHeight
    }
    return heightOverWidth(width, height)
  }

  const { isResizing, startResize } = useNodeViewResize(editor, {
    mediaEl: () => mediaEl,
    containerEl: () => containerRef.current,
    getAspectRatio: intrinsicAspect,
    getPos: () => getPos(),
    onCommit: ({ width, height }) => updateAttributes({ width, height }),
  })

  const selectMedia = () => selectMediaCommand(editor, () => getPos())

  const onMediaClick = () => {
    if (!isEditable && attrs.src) {
      if (mediaEl instanceof HTMLVideoElement) {
        if (mediaEl.paused) void mediaEl.play()
        else mediaEl.pause()
      } else {
        editor.commands.openImageViewer?.(attrs.src)
      }
      return
    }
    if (isEditable) selectMedia()
  }

  const startResizeFromHandle = (event: { clientX: number }, edge: ResizeEdge) => {
    selectMedia()
    startResize(event, edge)
  }

  const resizeBy = (delta: number) => {
    selectMedia()
    const currentWidth = Number(attrs.width) || mediaEl?.offsetWidth || 320
    const width = Math.max(50, currentWidth + delta)
    updateAttributes({ width, height: Math.round(width * intrinsicAspect()) })
  }

  const onResizeKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      resizeBy(-20)
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      resizeBy(20)
    }
  }

  const toggleCaptions = () => {
    const next = !showCaption
    setShowCaption(next)
    if (!next) {
      setCaption('')
      updateAttributes({ alt: '' })
    }
  }

  const onCaptionKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    handleCaptionKeydown(event.nativeEvent, {
      onParagraphAfter: () => createParagraphAfterMedia(editor, () => getPos()),
      onCursorAfter: () => setCursorAfterMedia(editor, () => getPos()),
      onCursorBefore: () => setCursorBeforeMedia(editor, () => getPos()),
      onToggleCaption: toggleCaptions,
      getCaption: () => caption,
    })
  }

  const retryUpload = () => {
    if (isVideo) editor.commands.reuploadVideo(attrs.uploadId)
    else editor.commands.reuploadImage(attrs.uploadId)
  }

  const removeMedia = () => {
    const pos = safeGetPos(() => getPos())
    if (pos === null) return
    const target = editor.view.state.doc.nodeAt(pos)
    if (!target) return
    editor.view.dispatch(editor.view.state.tr.delete(pos, pos + target.nodeSize))
  }

  const replaceMedia = async () => {
    const files = await pickFiles({ accept: isVideo ? 'video/*' : 'image/*' })
    const file = files[0]
    if (!file) return
    const pos = safeGetPos(() => getPos())
    if (pos === null) return
    if (isVideo) editor.commands.replaceVideo(pos, file)
    else editor.commands.replaceImage(pos, file)
  }

  const errorActions = isEditable && (
    <div className="flex flex-wrap justify-center gap-2">
      <Button
        size="xs"
        variant="subtle"
        onClick={(event) => {
          event.stopPropagation()
          retryUpload()
        }}
      >
        Try again
      </Button>
      <Button
        size="xs"
        variant="subtle"
        onClick={(event) => {
          event.stopPropagation()
          void replaceMedia()
        }}
      >
        Choose another
      </Button>
      <Button
        size="xs"
        variant="subtle"
        onClick={(event) => {
          event.stopPropagation()
          removeMedia()
        }}
      >
        Remove
      </Button>
    </div>
  )

  const mediaSrc = attrs.src || fileContent

  return (
    <NodeViewWrapper as="div" data-drag-handle="" className={cn(wrapperClasses(attrs.float))}>
      <div
        ref={containerRef}
        className={cn('group relative isolate not-prose overflow-hidden rounded', containerClasses(attrs, selected))}
        style={{ width: attrs.width ? `${attrs.width}px` : 'auto' }}
        data-video-fullscreen-root=""
      >
        {isUploaded || fileContent || attrs.loading ? (
          <div className="relative">
            {!isVideo ? (
              <img
                ref={setMediaEl}
                className={cn('rounded', !isUploaded && 'opacity-40')}
                src={mediaSrc}
                alt={attrs.alt || ''}
                width={attrs.width ?? undefined}
                height={attrs.height ?? undefined}
                onClick={(event) => {
                  event.stopPropagation()
                  onMediaClick()
                }}
              />
            ) : !isUploaded && videoPoster ? (
              <img
                ref={setMediaEl}
                className="rounded"
                src={videoPoster}
                alt={attrs.alt || 'Video preview'}
                width={attrs.width ?? undefined}
                height={attrs.height ?? undefined}
                onClick={(event) => {
                  event.stopPropagation()
                  onMediaClick()
                }}
              />
            ) : (
              <video
                ref={setMediaEl}
                className={cn('rounded', !isUploaded && 'opacity-40')}
                src={mediaSrc}
                width={attrs.width ?? undefined}
                height={attrs.height ?? undefined}
                autoPlay={attrs.autoplay}
                loop={attrs.loop}
                muted={attrs.muted}
                playsInline
                onClick={(event) => {
                  event.stopPropagation()
                  onMediaClick()
                }}
              />
            )}

            {isVideo && isUploaded && (
              <VideoControls videoEl={mediaEl instanceof HTMLVideoElement ? mediaEl : null} hidden={isResizing} />
            )}

            {isUploaded && (
              <MediaToolbar
                node={node}
                mediaType={isVideo ? 'video' : 'image'}
                isEditable={isEditable}
                selected={selected}
                showCaption={showCaption}
                onToggleCaption={toggleCaptions}
                onSetAlign={(align: MediaAlign) => setMediaAlign(editor, isVideo, align)}
                onReplace={() => void replaceMedia()}
                onSetVideoOptions={(options) => editor.commands.setVideoOptions(options)}
              />
            )}

            {selected && isEditable && isUploaded && (
              <MediaResizeHandles
                label="Resize media"
                onResizeStart={startResizeFromHandle}
                onResizeKeyDown={onResizeKeyDown}
              />
            )}

            {hasError && (
              <div
                aria-live="assertive"
                className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-black/65 p-3 text-center"
              >
                <div className="text-p-sm text-ink-base">{attrs.error}</div>
                {errorActions}
              </div>
            )}

            {attrs.loading && (
              <UploadProgressIndicator percent={uploadPercent} onCancel={() => abortUpload(attrs.uploadId)} />
            )}
          </div>
        ) : (
          <div
            className={cn(
              'flex max-w-full flex-col items-center justify-center gap-3 rounded border px-4 py-5 text-sm text-ink-gray-6',
              selected && 'border-none',
            )}
            style={{
              width: attrs.width ? `${attrs.width}px` : undefined,
              aspectRatio: aspectRatioFrom(attrs.width, attrs.height),
            }}
            aria-live={hasError ? 'assertive' : undefined}
          >
            {hasError ? (
              <>
                <ErrorMessage message={attrs.error} />
                {errorActions}
              </>
            ) : (
              <div className="text-base text-ink-gray-8">
                This {isVideo ? 'video' : 'image'} hasn&apos;t yet been uploaded.
              </div>
            )}
          </div>
        )}

        {(attrs.alt || showCaption) && !hasError && (
          <input
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            className="h-7 w-full border-none bg-transparent text-center text-sm text-ink-gray-6 placeholder:text-ink-gray-4 focus:ring-0"
            placeholder="Add caption"
            aria-label="Media caption"
            disabled={!isEditable}
            onBlur={() => updateAttributes({ alt: caption })}
            onKeyDown={onCaptionKeyDown}
          />
        )}
      </div>
    </NodeViewWrapper>
  )
}
