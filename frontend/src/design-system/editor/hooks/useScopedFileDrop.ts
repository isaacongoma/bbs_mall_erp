import { useEffect, useRef, useState } from 'react'
import { useLatest } from '../../hooks/useLatest'

export function useScopedFileDrop(root: HTMLElement | null, onFiles: (files: File[]) => void) {
  const [isFileDragging, setFileDragging] = useState(false)
  const depthRef = useRef(0)
  const latest = useLatest(onFiles)

  useEffect(() => {
    if (!root) return

    const hasFiles = (event: DragEvent): boolean =>
      !!event.dataTransfer && Array.from(event.dataTransfer.types).includes('Files')

    const onDragEnter = (event: DragEvent) => {
      if (!hasFiles(event)) return
      depthRef.current += 1
      setFileDragging(true)
    }
    const onDragOver = (event: DragEvent) => {
      if (hasFiles(event)) event.preventDefault()
    }
    const onDragLeave = () => {
      depthRef.current = Math.max(0, depthRef.current - 1)
      if (depthRef.current === 0) setFileDragging(false)
    }
    const onDrop = (event: DragEvent) => {
      depthRef.current = 0
      setFileDragging(false)
      const files = Array.from(event.dataTransfer?.files ?? [])
      if (files.length === 0) return
      event.preventDefault()
      event.stopPropagation()
      latest()(files)
    }

    root.addEventListener('dragenter', onDragEnter)
    root.addEventListener('dragover', onDragOver)
    root.addEventListener('dragleave', onDragLeave)
    root.addEventListener('drop', onDrop)
    return () => {
      root.removeEventListener('dragenter', onDragEnter)
      root.removeEventListener('dragover', onDragOver)
      root.removeEventListener('dragleave', onDragLeave)
      root.removeEventListener('drop', onDrop)
    }
  }, [root, latest])

  return { isFileDragging }
}
