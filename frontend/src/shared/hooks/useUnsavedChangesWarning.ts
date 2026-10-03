import { useEffect } from 'react'
import { useLatest } from '@/design-system/hooks/useLatest'

export function useUnsavedChangesWarning(hasUnsavedChanges: () => boolean) {
  const latest = useLatest(hasUnsavedChanges)

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!latest()()) return
      event.preventDefault()
      event.returnValue = true
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [latest])
}
