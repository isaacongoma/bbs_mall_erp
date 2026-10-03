import { NodeViewWrapper, type ReactNodeViewProps } from '@tiptap/react'
import { LucideIcon } from '../../icons'
import { cn } from '../../utils/cn'
import { formatBytes } from '../../utils/fileSize'
import { abortUpload } from '../extensions/shared/media-upload-state'
import { useNodeViewEditable } from '../hooks/useNodeViewEditable'
import { useUploadProgress } from '../hooks/useUploadProgress'

export function AttachmentNodeView({ node, editor }: ReactNodeViewProps) {
  const isEditable = useNodeViewEditable(editor)
  const attrs = node.attrs

  const fileName: string = attrs.fileName || 'Attachment'
  const rawSize = Number(attrs.fileSize)
  const fileSize = Number.isFinite(rawSize) && rawSize > 0 ? formatBytes(rawSize) : ''
  const href: string | undefined = attrs.src || undefined
  const isLoading = Boolean(attrs.loading)
  const error = attrs.error as string | null
  const isUploaded = Boolean(attrs.src)
  const uploadId = attrs.uploadId as string | undefined
  const percent = useUploadProgress(uploadId)?.percent ?? 0
  const isLink = isUploaded && !isLoading

  const chipClass = cn(
    'inline-flex h-6 max-w-full items-center gap-1.5 rounded-lg border bg-surface-gray-2 px-2 text-sm no-underline',
    error ? 'border-dashed border-outline-gray-2 text-ink-gray-6' : 'border-outline-gray-2 text-ink-gray-8',
    isLink ? 'cursor-pointer hover:bg-surface-gray-3' : 'cursor-default',
  )

  const chipBody = (
    <>
      {isLoading ? (
        <LucideIcon name="lucide-loader-circle" className="size-3.5 shrink-0 animate-spin text-ink-gray-6" />
      ) : error ? (
        <LucideIcon name="lucide-triangle-alert" className="size-3.5 shrink-0 text-ink-gray-6" />
      ) : (
        <LucideIcon name="lucide-paperclip" className="size-3.5 shrink-0 text-ink-gray-6" />
      )}
      <span className="max-w-64 truncate">{fileName}</span>
      {fileSize && !error && <span className="shrink-0 text-ink-gray-5">{fileSize}</span>}
      {isLoading && percent > 0 && <span className="shrink-0 text-ink-gray-5">{percent}%</span>}
    </>
  )

  return (
    <NodeViewWrapper
      as="span"
      className="inline-flex max-w-full items-center gap-1 align-baseline"
      data-drag-handle=""
      draggable="true"
    >
      {isLink ? (
        <a
          className={chipClass}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          download={fileName}
          contentEditable={false}
        >
          {chipBody}
        </a>
      ) : (
        <span className={chipClass} contentEditable={false}>
          {chipBody}
        </span>
      )}

      {isLoading && isEditable ? (
        <button
          type="button"
          className="inline-flex items-center justify-center rounded p-0.5 text-ink-gray-6 hover:bg-surface-gray-3"
          title="Cancel upload"
          contentEditable={false}
          onClick={() => uploadId && abortUpload(uploadId)}
        >
          <LucideIcon name="lucide-x" className="size-3.5 shrink-0" />
        </button>
      ) : error && isEditable ? (
        <button
          type="button"
          className="inline-flex items-center justify-center rounded p-0.5 text-ink-gray-6 hover:bg-surface-gray-3"
          title="Try again"
          contentEditable={false}
          onClick={() => uploadId && editor.commands.reuploadAttachment(uploadId)}
        >
          <LucideIcon name="lucide-rotate-cw" className="size-3.5 shrink-0" />
        </button>
      ) : null}
    </NodeViewWrapper>
  )
}
