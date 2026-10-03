import { useEffect } from 'react'

export function useStrayDropGuard(active: boolean): void {
  useEffect(() => {
    if (!active) return
    const prevent = (event: DragEvent) => event.preventDefault()
    window.addEventListener('dragover', prevent)
    window.addEventListener('drop', prevent)
    return () => {
      window.removeEventListener('dragover', prevent)
      window.removeEventListener('drop', prevent)
    }
  }, [active])
}
