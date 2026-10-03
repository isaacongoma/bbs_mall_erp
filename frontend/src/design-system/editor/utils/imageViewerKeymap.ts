export interface ImageViewerKeymapActions {
  isOpen: () => boolean
  isPanning: () => boolean
  onActivity: () => void
  next: () => void
  previous: () => void
  zoomIn: () => void
  zoomOut: () => void
  toggleFullscreen: () => void
  close: () => void
}

export function createImageViewerKeydown(actions: ImageViewerKeymapActions): (event: KeyboardEvent) => void {
  return (event: KeyboardEvent) => {
    if (!actions.isOpen()) return

    actions.onActivity()

    switch (event.key) {
      case 'ArrowLeft':
        if (!actions.isPanning()) actions.previous()
        event.preventDefault()
        break
      case 'ArrowRight':
        if (!actions.isPanning()) actions.next()
        event.preventDefault()
        break
      case '+':
      case '=':
        actions.zoomIn()
        event.preventDefault()
        break
      case '-':
        actions.zoomOut()
        event.preventDefault()
        break
      case 'Escape':
        actions.close()
        event.preventDefault()
        break
      case 'f':
      case 'F':
        actions.toggleFullscreen()
        event.preventDefault()
        break
    }
  }
}
