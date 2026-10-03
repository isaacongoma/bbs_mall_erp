import { autoUpdate, computePosition, flip, offset, shift, type Placement, type Strategy } from '@floating-ui/dom'
import { createElement, type ComponentType } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { flushSync } from 'react-dom'

export interface VirtualReference {
  getBoundingClientRect: () => DOMRect
}

export interface FloatingPopupOptions<P extends object> {
  anchor: HTMLElement
  component: ComponentType<P>
  props: P
  virtualReference?: VirtualReference
  closeOnAnchorPointerDown?: boolean
  closeOnEscape?: boolean
  animate?: boolean
  floatingOptions?: {
    placement?: Placement
    strategy?: Strategy
    offset?: number | [number, number]
  }
}

export interface FloatingPopupHandle {
  floating: HTMLElement | null
  update: () => void
  destroy: () => void
}

export function normalizeOffset(value: number | [number, number] | undefined) {
  if (Array.isArray(value)) return { mainAxis: value[1], crossAxis: value[0] }
  return value ?? 4
}

function transformOriginFor(placement: Placement): string {
  const [side, align] = placement.split('-')
  const opposite: Record<string, string> = {
    top: 'bottom',
    bottom: 'top',
    left: 'right',
    right: 'left',
  }
  if (side === 'top' || side === 'bottom') {
    const x = align === 'start' ? 'left' : align === 'end' ? 'right' : 'center'
    return `${x} ${opposite[side]}`
  }
  const y = align === 'start' ? 'top' : align === 'end' ? 'bottom' : 'center'
  return `${opposite[side ?? 'top']} ${y}`
}

export function openFloatingPopup<P extends object>(options: FloatingPopupOptions<P>): FloatingPopupHandle {
  const { anchor, component, props, virtualReference } = options
  const floatingOptions = options.floatingOptions ?? {}
  const reference = virtualReference ?? anchor
  const appendTo = anchor.closest('[role="dialog"]') || document.body

  const floating = document.createElement('div')
  floating.style.position = floatingOptions.strategy ?? 'absolute'
  floating.style.left = '0'
  floating.style.top = '0'
  floating.style.zIndex = '100'
  appendTo.appendChild(floating)

  let root: Root | null = createRoot(floating)
  flushSync(() => root?.render(createElement(component, props)))

  let cleanupAutoUpdate: (() => void) | null = null
  let destroyed = false
  let animated = false

  const update = () => {
    if (destroyed) return
    void computePosition(reference, floating, {
      placement: floatingOptions.placement ?? 'top',
      strategy: floatingOptions.strategy ?? 'absolute',
      middleware: [offset(normalizeOffset(floatingOptions.offset)), flip(), shift({ padding: 8 })],
    }).then(({ x, y, strategy, placement }) => {
      if (destroyed) return
      Object.assign(floating.style, { position: strategy, left: `${x}px`, top: `${y}px` })
      if (options.animate && !animated) {
        animated = true
        floating.style.transformOrigin = transformOriginFor(placement)
        floating.classList.add('editor-floating-pop')
      }
    })
  }

  const handle: FloatingPopupHandle = {
    floating,
    update,
    destroy() {
      if (destroyed) return
      destroyed = true
      cleanupAutoUpdate?.()
      cleanupAutoUpdate = null
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('keydown', onKeydown, true)
      const current = root
      root = null
      queueMicrotask(() => current?.unmount())
      floating.remove()
      handle.floating = null
    },
  }

  function onPointerDown(event: PointerEvent) {
    const target = event.target as Node | null
    if (!target) return
    if (floating.contains(target)) return
    if (!options.closeOnAnchorPointerDown && anchor.contains(target)) return
    handle.destroy()
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && options.closeOnEscape !== false) handle.destroy()
  }

  cleanupAutoUpdate = autoUpdate(reference, floating, update)
  requestAnimationFrame(() => {
    if (destroyed) return
    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('keydown', onKeydown, true)
  })
  update()

  return handle
}
