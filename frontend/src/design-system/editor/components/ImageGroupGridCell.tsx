import { useRef, useState } from 'react'
import { Button } from '../../components/Button'
import { LucideIcon } from '../../icons'
import { cn } from '../../utils/cn'
import { isImageSupported } from '../extensions/image-group/image-group-utils'
import { abortUpload } from '../extensions/shared/media-upload-state'
import { useObjectUrl } from '../hooks/useObjectUrl'
import { useUploadProgress } from '../hooks/useUploadProgress'
import type { ImageItem } from '../types/imageGroup'
import { UploadProgressIndicator } from './UploadProgressIndicator'

export interface ImageGroupGridCellProps {
  item: ImageItem
  onRemove: () => void
  onRetry: () => void
  onUpdateCaption: (caption: string) => void
}

export function ImageGroupGridCell({ item, onRemove, onRetry, onUpdateCaption }: ImageGroupGridCellProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const isFile = item.type === 'file' && !!item.file
  const progress = useUploadProgress(item.id)
  const objectUrl = useObjectUrl(isFile ? (item.file as File) : null)
  const previewable = isFile ? isImageSupported(item.file as File) : true
  const fileName = item.file?.name ?? ''
  const caption = item.type === 'existing' ? (item.existing?.alt ?? '') : (item.alt ?? '')
  const previewSrc = item.type === 'existing' ? (item.existing?.src ?? '') : objectUrl

  const startEditing = () => {
    setDraft(caption)
    setEditing(true)
    requestAnimationFrame(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    })
  }

  const commit = () => {
    if (!editing) return
    setEditing(false)
    onUpdateCaption(draft.trim())
  }

  return (
    <div className="group relative aspect-square h-full w-full overflow-hidden rounded bg-surface-gray-1">
      {item.status !== 'uploading' && (
        <button
          type="button"
          className="absolute right-1 top-1 z-10 rounded bg-black/65 p-1 opacity-100 transition-opacity focus:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
          aria-label="Remove image"
          onClick={(event) => {
            event.stopPropagation()
            onRemove()
          }}
        >
          <LucideIcon name="lucide-x" className="size-4 text-ink-gray-4 hover:text-ink-base" />
        </button>
      )}

      {!previewable ? (
        <div className="flex h-full w-full flex-col items-center justify-center rounded bg-surface-gray-1 text-ink-gray-4">
          <span className="mt-1 w-full px-2 text-center text-p-xs text-ink-gray-4" title={fileName}>
            {fileName}
          </span>
          <span className="mt-1 px-2 text-center text-p-xs text-ink-gray-5">Preview not available (HEIC)</span>
        </div>
      ) : (
        <img
          src={previewSrc}
          alt={caption || ''}
          className={cn('h-full w-full object-cover', item.status === 'uploading' && 'opacity-40')}
        />
      )}

      {previewable && (
        <div
          className={cn(
            'absolute bottom-0 left-0 right-0 rounded-b bg-gradient-to-t from-black/60 to-transparent transition-opacity',
            editing || caption ? 'opacity-100' : 'opacity-100 sm:opacity-0 sm:group-hover:opacity-100',
          )}
        >
          {!editing ? (
            <div
              className="cursor-pointer p-2"
              onClick={(event) => {
                event.stopPropagation()
                startEditing()
              }}
            >
              <div className="truncate text-xs text-white" title={caption || 'Click to add caption'}>
                {caption || 'Add caption...'}
              </div>
            </div>
          ) : (
            <div className="p-2" onClick={(event) => event.stopPropagation()}>
              <input
                ref={inputRef}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onBlur={commit}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    commit()
                  } else if (event.key === 'Escape') {
                    setEditing(false)
                  }
                }}
                className="w-full rounded-sm border-none bg-white/90 px-1 py-0.5 text-xs text-gray-900 outline-none"
                placeholder="Add caption..."
                maxLength={200}
                aria-label="Image caption"
              />
            </div>
          )}
        </div>
      )}

      {item.status === 'uploading' && (
        <div className="absolute inset-0 z-10">
          <UploadProgressIndicator percent={progress?.percent ?? 0} onCancel={() => abortUpload(item.id)} />
        </div>
      )}

      {item.status === 'failed' && (
        <div
          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-black/65 p-2 text-center"
          aria-live="assertive"
        >
          <div className="text-p-xs text-ink-base">{item.error || 'Upload failed'}</div>
          <div className="flex gap-2">
            <Button
              size="xs"
              variant="subtle"
              onClick={(event) => {
                event.stopPropagation()
                onRetry()
              }}
            >
              Retry
            </Button>
            <Button
              size="xs"
              variant="subtle"
              onClick={(event) => {
                event.stopPropagation()
                onRemove()
              }}
            >
              Remove
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
