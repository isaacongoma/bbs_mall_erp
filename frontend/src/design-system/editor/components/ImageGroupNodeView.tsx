import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { NodeViewContent, NodeViewWrapper, type ReactNodeViewProps } from '@tiptap/react'
import { useMemo, useState } from 'react'
import { Tooltip } from '../../components/Tooltip'
import { LucideIcon } from '../../icons'
import { cn } from '../../utils/cn'
import { removeImageAt, replaceImageGroup, setImageGroupColumns } from '../extensions/image-group/image-group-commands'
import { ALLOWED_COLUMNS, clampColumns } from '../extensions/image-group/image-group-utils'
import type { ExistingImage } from '../extensions/shared/upload-types'
import { useNodeViewEditable } from '../hooks/useNodeViewEditable'
import { ImageGroupUploadDialog } from './ImageGroupUploadDialog'
import { ImageViewerModal } from './ImageViewerModal'

export function ImageGroupNodeView({ node, editor, getPos, selected }: ReactNodeViewProps) {
  const isEditable = useNodeViewEditable(editor)
  const [showViewer, setShowViewer] = useState(false)
  const [viewerIndex, setViewerIndex] = useState(0)
  const [showEditModal, setShowEditModal] = useState(false)

  const columns = clampColumns(node.attrs.columns)
  const images = useMemo(() => {
    const out: ProseMirrorNode[] = []
    node.content.forEach((child) => out.push(child))
    return out
  }, [node])

  const viewerImages = useMemo(
    () => images.map((image) => ({ src: image.attrs.src as string, alt: (image.attrs.alt as string) || '' })),
    [images],
  )
  const existingImages = useMemo<ExistingImage[]>(
    () => images.map((image) => ({ src: image.attrs.src as string, alt: (image.attrs.alt as string) || '' })),
    [images],
  )

  const onContainerClick = () => {
    if (!isEditable) return
    const pos = getPos()
    if (typeof pos === 'number') editor.commands.setNodeSelection(pos)
  }

  const setColumns = (n: number) => {
    setImageGroupColumns(editor, getPos, n)
    onContainerClick()
  }

  const handleEditSave = (data: { images: ExistingImage[]; columns: number }) => {
    replaceImageGroup(editor, getPos, data)
    setShowEditModal(false)
  }

  return (
    <NodeViewWrapper>
      <div
        className={cn(
          'group/gallery relative isolate my-2 w-full not-prose rounded',
          selected && isEditable && 'ring-2 ring-outline-gray-3 ring-offset-2',
          isEditable && !selected && 'cursor-pointer',
        )}
        onClick={onContainerClick}
      >
        {selected && isEditable && (
          <div
            className="absolute right-2 top-2 z-20 flex items-center gap-2 rounded bg-black/65 px-1.5 py-1"
            onPointerDown={(event) => {
              event.preventDefault()
              event.stopPropagation()
            }}
          >
            <Tooltip text="Edit gallery">
              <button
                type="button"
                className="h-5"
                aria-label="Edit gallery"
                onClick={(event) => {
                  event.stopPropagation()
                  setShowEditModal(true)
                }}
              >
                <LucideIcon name="lucide-pencil" className="size-4 text-ink-gray-4 hover:text-ink-base" />
              </button>
            </Tooltip>
            <span className="h-4 w-px bg-white/25" aria-hidden="true" />
            {ALLOWED_COLUMNS.map((n) => (
              <Tooltip key={n} text={`${n} columns`}>
                <button
                  type="button"
                  className={cn(
                    'h-5 px-0.5 text-xs-medium tabular-nums hover:text-ink-base',
                    columns === n ? 'text-ink-base' : 'text-ink-gray-4',
                  )}
                  aria-label={`${n} columns`}
                  aria-pressed={columns === n}
                  onClick={(event) => {
                    event.stopPropagation()
                    setColumns(n)
                  }}
                >
                  {n}
                </button>
              </Tooltip>
            ))}
          </div>
        )}

        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
          {images.map((image, index) => (
            <div
              key={`${image.attrs.uploadId ?? image.attrs.src}-${index}`}
              className="group relative aspect-square h-full w-full overflow-hidden rounded bg-surface-gray-1"
            >
              {isEditable && selected && (
                <button
                  type="button"
                  className="absolute right-1 top-1 z-10 rounded bg-black/65 p-1 opacity-100 transition-opacity focus:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                  aria-label="Remove image"
                  onClick={(event) => {
                    event.stopPropagation()
                    removeImageAt(editor, getPos, index)
                  }}
                >
                  <LucideIcon name="lucide-x" className="size-4 text-ink-gray-4 hover:text-ink-base" />
                </button>
              )}
              {!isEditable ? (
                <img
                  src={image.attrs.src}
                  alt={image.attrs.alt || ''}
                  className="h-full w-full cursor-pointer object-cover not-prose"
                  onClick={() => {
                    if (editor.isEditable) return
                    setViewerIndex(index)
                    setShowViewer(true)
                  }}
                />
              ) : (
                <img
                  src={image.attrs.src}
                  alt={image.attrs.alt || ''}
                  className="h-full w-full object-cover not-prose"
                />
              )}

              {image.attrs.alt && (
                <div className="absolute bottom-0 left-0 right-0 rounded-b bg-gradient-to-t from-black/60 to-transparent opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                  <div className="p-2">
                    <div className="truncate text-xs text-white" title={image.attrs.alt}>
                      {image.attrs.alt}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <NodeViewContent style={{ display: 'none' }} />

        {showViewer && (
          <ImageViewerModal
            open={showViewer}
            onOpenChange={setShowViewer}
            images={viewerImages}
            initialIndex={viewerIndex}
          />
        )}
        {showEditModal && (
          <ImageGroupUploadDialog
            open={showEditModal}
            onOpenChange={setShowEditModal}
            files={[]}
            editor={editor}
            mode="edit"
            existingImages={existingImages}
            initialColumns={columns}
            onClose={() => setShowEditModal(false)}
            onSave={handleEditSave}
          />
        )}
      </div>
    </NodeViewWrapper>
  )
}
