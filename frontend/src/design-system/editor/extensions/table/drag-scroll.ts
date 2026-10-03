const EDGE = 28
const MAX_STEP = 16

function axisStep(pos: number, start: number, end: number): number {
  if (end - start < EDGE * 3) return 0
  if (pos < start + EDGE) {
    return -Math.ceil(((start + EDGE - pos) / EDGE) * MAX_STEP)
  }
  if (pos > end - EDGE) {
    return Math.ceil(((pos - (end - EDGE)) / EDGE) * MAX_STEP)
  }
  return 0
}

export function verticalScrollParent(el: Element): HTMLElement {
  for (let cur = el.parentElement; cur; cur = cur.parentElement) {
    const style = getComputedStyle(cur)
    if (/(auto|scroll)/.test(style.overflowY) && cur.scrollHeight > cur.clientHeight) {
      return cur
    }
  }
  return (document.scrollingElement as HTMLElement | null) ?? document.documentElement
}

interface DragScroller {
  update(x: number, y: number): void
  stop(): void
}

function createDragScroller(area: HTMLElement, onScrolled: () => void): DragScroller {
  const page = (document.scrollingElement as HTMLElement | null) ?? document.documentElement
  const vertical = verticalScrollParent(area)
  let raf = 0
  let px = 0
  let py = 0

  const tick = () => {
    raf = 0
    let moved = false

    if (area.scrollWidth > area.clientWidth) {
      const rect = area.getBoundingClientRect()
      const dx = axisStep(px, Math.max(rect.left, 0), Math.min(rect.right, window.innerWidth))
      if (dx) {
        const before = area.scrollLeft
        area.scrollLeft += dx
        moved = moved || area.scrollLeft !== before
      }
    }

    const bounds =
      vertical === page
        ? { top: 0, bottom: window.innerHeight }
        : (() => {
            const rect = vertical.getBoundingClientRect()
            return {
              top: Math.max(rect.top, 0),
              bottom: Math.min(rect.bottom, window.innerHeight),
            }
          })()
    const dy = axisStep(py, bounds.top, bounds.bottom)
    if (dy) {
      const before = vertical.scrollTop
      vertical.scrollTop += dy
      moved = moved || vertical.scrollTop !== before
    }

    if (moved) {
      onScrolled()
      raf = requestAnimationFrame(tick)
    }
  }

  return {
    update(x, y) {
      px = x
      py = y
      if (!raf) raf = requestAnimationFrame(tick)
    },
    stop() {
      if (raf) cancelAnimationFrame(raf)
      raf = 0
    },
  }
}

function capturePointer(target: Element | null, pointerId: number): boolean {
  try {
    target?.setPointerCapture(pointerId)
    return true
  } catch {
    return false
  }
}

export function trackPointerDrag(options: {
  event: PointerEvent
  area: HTMLElement | null
  onPoint: (x: number, y: number) => void
}): void {
  const { event, area, onPoint } = options
  const pointerId = event.pointerId
  const target = event.target instanceof Element ? event.target : null
  capturePointer(target, pointerId)

  let x = event.clientX
  let y = event.clientY
  const scroller = area ? createDragScroller(area, () => onPoint(x, y)) : null

  const onMove = (e: PointerEvent) => {
    if (e.pointerId !== pointerId) return
    x = e.clientX
    y = e.clientY
    onPoint(x, y)
    scroller?.update(x, y)
  }
  const stop = (e: PointerEvent) => {
    if (e.pointerId !== pointerId) return
    scroller?.stop()
    document.removeEventListener('pointermove', onMove)
    document.removeEventListener('pointerup', stop, true)
    document.removeEventListener('pointercancel', stop, true)
  }
  document.addEventListener('pointermove', onMove)
  document.addEventListener('pointerup', stop, true)
  document.addEventListener('pointercancel', stop, true)
}
