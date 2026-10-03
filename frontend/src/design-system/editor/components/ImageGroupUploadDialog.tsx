import type { Editor } from '@tiptap/core'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '../../components/Button'
import { Dialog } from '../../components/Dialog'
import { ErrorMessage } from '../../components/ErrorMessage'
import { Select } from '../../components/Select'
import { LucideIcon } from '../../icons'
import { clampColumns, columnSelectOptions, getDefaultColumns } from '../extensions/image-group/image-group-utils'
import type { ExistingImage } from '../extensions/shared/upload-types'
import { useImageGroupDialog } from '../hooks/useImageGroupDialog'
import { useScopedFileDrop } from '../hooks/useScopedFileDrop'
import { useStrayDropGuard } from '../hooks/useStrayDropGuard'
import { ImageGroupGrid } from './ImageGroupGrid'

export interface ImageGroupUploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  files?: File[]
  editor: Editor
  mode?: 'new' | 'edit'
  existingImages?: ExistingImage[]
  initialColumns?: number
  onClose?: () => void
  onSave?: (data: { images: ExistingImage[]; columns: number }) => void
}

const COLUMN_OPTIONS = columnSelectOptions()

export function ImageGroupUploadDialog({
  open,
  onOpenChange,
  files = [],
  editor,
  mode = 'new',
  existingImages,
  initialColumns,
  onClose,
  onSave,
}: ImageGroupUploadDialogProps) {
  const [initial] = useState(() => ({
    files,
    existing: existingImages,
    columns: mode === 'edit' ? clampColumns(initialColumns ?? 4) : getDefaultColumns(files.length),
  }))
  const dialog = useImageGroupDialog({
    editor,
    mode,
    files: initial.files,
    existing: initial.existing,
    initialColumns: initial.columns,
  })
  const [dialogBody, setDialogBody] = useState<HTMLDivElement | null>(null)
  const { isFileDragging } = useScopedFileDrop(dialogBody, (dropped) => {
    dialog.addFiles(dropped)
  })
  useStrayDropGuard(open)

  const count = dialog.images.length
  const insertLabel = count > 1 ? `Insert ${count} images` : 'Insert image'

  const close = () => {
    onOpenChange(false)
    onClose?.()
  }

  const triggerFileInput = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.multiple = true
    input.onchange = (event) => {
      const picked = (event.target as HTMLInputElement).files
      if (picked) dialog.addFiles(Array.from(picked))
    }
    input.click()
  }

  const handleCancel = () => {
    dialog.abortAll()
    close()
  }

  const handleSave = async () => {
    const { images, failed } = await dialog.buildFinalImages()
    if (dialog.isUnmounted() || failed) return
    onSave?.({ images, columns: dialog.columns })
    onOpenChange(false)
  }

  const handleUpload = async () => {
    const { images, failed } = await dialog.buildFinalImages()
    if (dialog.isUnmounted() || failed) return
    if (images.length > 1 && !editor.isDestroyed) {
      editor.chain().focus().setImageGroup({ images, columns: dialog.columns }).run()
    } else if (images.length === 1 && !editor.isDestroyed) {
      const lone = images[0]
      if (lone) editor.chain().focus().setImage({ src: lone.src, alt: lone.alt }).run()
    }
    close()
  }

  const handleInsertSeparate = async () => {
    const { images, failed } = await dialog.buildFinalImages()
    if (dialog.isUnmounted() || failed) return
    if (!editor.isDestroyed) {
      for (const image of images) editor.chain().focus().setImage({ src: image.src, alt: image.alt }).run()
    }
    close()
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (next) onOpenChange(true)
          else handleCancel()
        }}
        options={{ title: mode === 'edit' ? 'Edit Images' : 'Upload Images', size: '3xl' }}
        disableOutsideClickToClose
        bodyContent={
          <div ref={setDialogBody} className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <Button size="sm" onClick={triggerFileInput} iconLeft="lucide-image-plus">
                Add images
              </Button>
              {count > 0 && (
                <div className="flex items-center gap-3">
                  <span className="text-p-sm text-ink-gray-5">
                    {count} {count === 1 ? 'image' : 'images'}
                  </span>
                  <Select
                    id="columns-select"
                    options={COLUMN_OPTIONS}
                    value={String(dialog.columns)}
                    onChange={(value) => dialog.setColumns(clampColumns(value))}
                    size="sm"
                    variant="subtle"
                    className="w-28"
                  />
                </div>
              )}
            </div>

            {count > 0 ? (
              <>
                <ImageGroupGrid
                  images={dialog.images}
                  columns={dialog.columns}
                  onRemove={(index) => dialog.removeImage(index)}
                  onRetry={(index) => void dialog.retryImage(index)}
                  onUpdateCaption={({ index, caption }) => dialog.setCaption(index, caption)}
                  onReorder={({ from, to }) => dialog.reorder(from, to)}
                />
                <div className="text-p-xs text-ink-gray-4">
                  Drag images to reorder · hover an image to caption or remove it · drop files anywhere to add more
                </div>
              </>
            ) : (
              <div className="flex min-h-[200px] flex-col items-center justify-center">
                <div
                  className="flex h-full w-full flex-1 cursor-pointer flex-col items-center justify-center rounded-lg border border-outline-gray-2 bg-surface-gray-1 text-center transition hover:border-outline-gray-3 hover:bg-surface-gray-2"
                  onClick={triggerFileInput}
                >
                  <div className="mb-2 text-ink-gray-4">
                    <LucideIcon name="lucide-image-plus" className="size-6" />
                  </div>
                  <div className="text-sm-medium text-ink-gray-5">Drag &amp; drop images here or click to select</div>
                </div>
              </div>
            )}

            {dialog.uploading && (
              <div>
                <div className="mb-2 text-sm text-ink-gray-6">
                  Uploading {dialog.uploadedCount} of {dialog.totalCount}…
                </div>
                <div className="h-2 w-full overflow-hidden rounded bg-surface-gray-2">
                  <div
                    className="h-2 bg-surface-gray-8 transition-all"
                    style={{ width: `${dialog.uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
            {dialog.hasUploadError && (
              <ErrorMessage
                className="mt-2"
                message="Some images failed to upload. Retry or remove the marked images to continue."
              />
            )}
          </div>
        }
        actionsContent={() => (
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={handleCancel}>
              {dialog.uploading ? 'Cancel uploads' : 'Cancel'}
            </Button>
            {mode === 'new' && count > 1 && (
              <Button size="sm" variant="subtle" loading={dialog.uploading} onClick={() => void handleInsertSeparate()}>
                Insert as separate images
              </Button>
            )}
            {mode === 'edit' ? (
              <Button size="sm" variant="solid" loading={dialog.uploading} onClick={() => void handleSave()}>
                Save
              </Button>
            ) : (
              <Button
                size="sm"
                variant="solid"
                disabled={!count}
                loading={dialog.uploading}
                onClick={() => void handleUpload()}
              >
                {insertLabel}
              </Button>
            )}
          </div>
        )}
      />
      {isFileDragging &&
        createPortal(
          <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60">
            <div className="text-base-medium text-ink-gray-1">Drop images here</div>
          </div>,
          document.body,
        )}
    </>
  )
}
