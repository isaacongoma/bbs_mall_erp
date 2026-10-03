import type { Editor } from '@tiptap/core'
import { useState, type ChangeEvent, type ReactNode } from 'react'
import { ImageGroupUploadDialog } from './ImageGroupUploadDialog'

export interface InsertImageProps {
  editor: Editor
  children: (props: { onClick: () => void }) => ReactNode
}

export function InsertImage({ editor, children }: InsertImageProps) {
  const [input, setInput] = useState<HTMLInputElement | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])

  const onImageSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return
    const first = files[0]
    if (files.length === 1 && first) {
      editor.chain().focus().uploadImage(first).run()
    } else {
      setSelectedFiles(Array.from(files))
      setShowModal(true)
    }
    event.target.value = ''
  }

  const handleCancel = () => {
    setShowModal(false)
    setSelectedFiles([])
  }

  return (
    <>
      {children({ onClick: () => input?.click() })}
      <input ref={setInput} type="file" className="hidden" onChange={onImageSelect} accept="image/*" multiple />
      {showModal && (
        <ImageGroupUploadDialog
          mode="new"
          open={showModal}
          onOpenChange={setShowModal}
          files={selectedFiles}
          editor={editor}
          onClose={handleCancel}
        />
      )}
    </>
  )
}
