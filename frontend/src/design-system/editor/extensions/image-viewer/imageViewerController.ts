import { ImageViewerModal } from '../../components/ImageViewerModal'
import { openImperativeModal, type ImperativeModalHandle } from '../../utils/imperativeModal'
import type { ViewableImage } from './collectImages'

let active: ImperativeModalHandle | null = null

export function openImageViewerModal(images: ViewableImage[], initialIndex: number): void {
  active?.destroy()
  active = openImperativeModal(ImageViewerModal, { images, initialIndex }, () => {
    active = null
  })
}
