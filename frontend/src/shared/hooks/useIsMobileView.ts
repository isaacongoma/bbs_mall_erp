import { useMediaQuery } from '@/design-system'

export function useIsMobileView(): boolean {
  return useMediaQuery('(max-width: 767px)')
}
