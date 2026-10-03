import { useEffect, useState } from 'react'
import { useLatest } from '../../hooks/useLatest'
import { useWindowFileDragging } from './useWindowFileDragging'

interface ZoneState {
  depth: number
  isOver: boolean
  types: string[]
}

const IDLE: ZoneState = { depth: 0, isOver: false, types: [] }

export function useEditorFileDrop(root: HTMLElement | null, onFiles: (files: File[]) => void) {
  const isWindowDragging = useWindowFileDragging()
  const [zone, setZone] = useState<ZoneState>(IDLE)
  const [previousDragging, setPreviousDragging] = useState(isWindowDragging)
  const latest = useLatest(onFiles)

  if (previousDragging !== isWindowDragging) {
    setPreviousDragging(isWindowDragging)
    if (!isWindowDragging) setZone(IDLE)
  }

  useEffect(() => {
    if (!root) return

    const hasFiles = (event: DragEvent): boolean =>
      !!event.dataTransfer && Array.from(event.dataTransfer.types).includes('Files')

    const onDragEnter = (event: DragEvent) => {
      if (!hasFiles(event)) return
      const types = Array.from(event.dataTransfer?.items ?? [])
        .filter((item) => item.kind === 'file')
        .map((item) => item.type)
        .filter(Boolean)
      setZone((previous) => ({ depth: previous.depth + 1, isOver: true, types }))
    }
    const onDragOver = (event: DragEvent) => {
      if (hasFiles(event)) event.preventDefault()
    }
    const onDragLeave = () => {
      setZone((previous) => {
        const depth = Math.max(0, previous.depth - 1)
        return { depth, isOver: depth > 0, types: depth > 0 ? previous.types : [] }
      })
    }
    const onDrop = (event: DragEvent) => {
      setZone(IDLE)
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

  return { isWindowDragging, isOverZone: zone.isOver, draggedTypes: zone.types }
}
