import { useSyncExternalStore } from 'react'

let dragging = false
let depth = 0
const listeners = new Set<() => void>()

const hasFiles = (event: DragEvent): boolean =>
  !!event.dataTransfer && Array.from(event.dataTransfer.types).includes('Files')

function setDragging(next: boolean) {
  if (dragging === next) return
  dragging = next
  for (const listener of [...listeners]) listener()
}

function reset() {
  depth = 0
  setDragging(false)
}

function onDragEnter(event: DragEvent) {
  if (!hasFiles(event)) return
  depth += 1
  setDragging(true)
}

function onDragLeave() {
  depth = Math.max(0, depth - 1)
  if (depth === 0) setDragging(false)
}

function attach() {
  window.addEventListener('dragenter', onDragEnter, true)
  window.addEventListener('dragleave', onDragLeave, true)
  window.addEventListener('drop', reset, true)
  window.addEventListener('dragend', reset, true)
}

function detach() {
  window.removeEventListener('dragenter', onDragEnter, true)
  window.removeEventListener('dragleave', onDragLeave, true)
  window.removeEventListener('drop', reset, true)
  window.removeEventListener('dragend', reset, true)
  reset()
}

function subscribe(listener: () => void) {
  if (listeners.size === 0) attach()
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) detach()
  }
}

export function useWindowFileDragging(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => dragging,
    () => false,
  )
}
