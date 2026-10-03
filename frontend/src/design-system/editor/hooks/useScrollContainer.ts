import { useSyncExternalStore } from 'react'

const DEFAULT_SELECTOR = '#editor-scroll-container'

const noopSubscribe = () => () => undefined

export function useScrollContainer(selector: string = DEFAULT_SELECTOR): HTMLElement | null {
  return useSyncExternalStore(
    noopSubscribe,
    () => document.querySelector<HTMLElement>(selector),
    () => null,
  )
}
