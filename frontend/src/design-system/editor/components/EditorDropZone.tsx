import { useState, type ReactNode } from 'react'
import { cn } from '../../utils/cn'
import { useEditorFileDrop } from '../hooks/useEditorFileDrop'
import type { Editor } from '../types/editor'

export interface EditorDropZoneProps {
  editor: Editor | null
  disabled?: boolean
  label?: string
  className?: string
  children?: ReactNode
  overlay?: (props: { isOverZone: boolean; isWindowDragging: boolean }) => ReactNode
}

export function EditorDropZone({
  editor,
  disabled = false,
  label = 'Drop files to upload',
  className,
  children,
  overlay,
}: EditorDropZoneProps) {
  const [root, setRoot] = useState<HTMLDivElement | null>(null)

  const { isWindowDragging, isOverZone, draggedTypes } = useEditorFileDrop(root, (files) => {
    if (disabled || !editor || editor.isDestroyed || !editor.isEditable) return
    editor.commands.dropFiles(files)
  })

  const showOverlay = isWindowDragging && !disabled
  const imageCount = draggedTypes.filter((type) => /^image\//i.test(type)).length
  const videoCount = draggedTypes.filter((type) => /^video\//i.test(type)).length
  const overlayLabel =
    videoCount > 0
      ? videoCount === 1
        ? 'Drop video to upload'
        : 'Drop videos to upload'
      : imageCount > 1
        ? 'Drop images to create gallery'
        : imageCount === 1
          ? 'Drop image to upload'
          : label

  return (
    <div ref={setRoot} className={cn('relative', className)}>
      {children}
      {showOverlay && (
        <div className="pointer-events-none absolute inset-0 z-10 rounded-[inherit] transition-opacity duration-150">
          {overlay ? (
            overlay({ isOverZone, isWindowDragging })
          ) : (
            <div
              className={cn(
                'flex h-full w-full items-center justify-center rounded-[inherit] border-2 border-dashed transition-colors duration-150',
                isOverZone ? 'border-outline-gray-4 bg-surface-gray-2/80' : 'border-outline-gray-3 bg-surface-base/70',
              )}
            >
              <span
                className={cn(
                  'text-base-medium transition-colors duration-150',
                  isOverZone ? 'text-ink-gray-8' : 'text-ink-gray-5',
                )}
              >
                {overlayLabel}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
