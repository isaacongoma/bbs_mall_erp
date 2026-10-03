import { useCallback, useState } from 'react'
import { useLatest } from '../../hooks/useLatest'

export interface UseImageNavigationOptions {
  initialIndex: number
  imageCount: number
  onNavigate?: () => void
}

export function useImageNavigation({ initialIndex, imageCount, onNavigate }: UseImageNavigationOptions) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const latest = useLatest({ imageCount, onNavigate })

  const nextImage = useCallback(() => {
    const { imageCount: count, onNavigate: navigate } = latest()
    if (count <= 0) return
    setCurrentIndex((index) => (index + 1) % count)
    navigate?.()
  }, [latest])

  const previousImage = useCallback(() => {
    const { imageCount: count, onNavigate: navigate } = latest()
    if (count <= 0) return
    setCurrentIndex((index) => (index - 1 + count) % count)
    navigate?.()
  }, [latest])

  return { currentIndex, nextImage, previousImage }
}
