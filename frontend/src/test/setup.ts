import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

class IntersectionObserverStub {
  readonly root = null
  readonly rootMargin = ''
  readonly thresholds = []
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return []
  }
}

globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver
globalThis.IntersectionObserver ??= IntersectionObserverStub as unknown as typeof IntersectionObserver

if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }) as MediaQueryList
}

Element.prototype.hasPointerCapture ??= () => false
Element.prototype.setPointerCapture ??= () => undefined
Element.prototype.releasePointerCapture ??= () => undefined
Element.prototype.scrollIntoView ??= () => undefined

const emptyRects = { length: 0, item: () => null, [Symbol.iterator]: function* () {} } as unknown as DOMRectList
Range.prototype.getClientRects ??= () => emptyRects
Range.prototype.getBoundingClientRect ??= () => new DOMRect()
Element.prototype.getClientRects ??= () => emptyRects
document.elementFromPoint ??= () => null

afterEach(() => {
  cleanup()
})
