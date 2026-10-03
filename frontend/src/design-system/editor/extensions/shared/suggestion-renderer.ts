import { ReactRenderer } from '@tiptap/react'
import type { SuggestionProps, SuggestionKeyDownProps } from '@tiptap/suggestion'
import type { ComponentType } from 'react'
import { computePosition, flip, offset, shift, type Placement } from '@floating-ui/dom'
import type { SuggestionListExpose } from './suggestion-types'

export interface SuggestionFloatingOptions {
  placement?: Placement
  offset?: number | [number, number]
}

export function createSuggestionRenderer(
  component: ComponentType<any>,
  floatingOptions?: SuggestionFloatingOptions,
): {
  onStart(props: SuggestionProps): void
  onUpdate(props: SuggestionProps): void
  onKeyDown(props: SuggestionKeyDownProps): boolean
  onExit(): void
} {
  let renderer: ReactRenderer<SuggestionListExpose, any> | null = null
  let floatingEl: HTMLElement | null = null
  let getReferenceClientRect: (() => DOMRect | null) | null = null
  let isActive = false
  let renderToken = 0

  function getListExpose(): SuggestionListExpose | null {
    const ref = renderer?.ref
    if (ref && typeof ref.onKeyDown === 'function') return ref
    return null
  }

  function updatePosition(): void {
    if (!floatingEl || !getReferenceClientRect) return
    const rect = getReferenceClientRect()
    if (!rect) return
    const reference = { getBoundingClientRect: () => rect }
    void computePosition(reference, floatingEl, {
      placement: floatingOptions?.placement ?? 'bottom-start',
      middleware: [offset(normalizeOffset(floatingOptions?.offset)), flip(), shift({ padding: 8 })],
    }).then(({ x, y }) => {
      if (!floatingEl) return
      Object.assign(floatingEl.style, {
        position: 'absolute',
        left: `${x}px`,
        top: `${y}px`,
        zIndex: '100',
      })
    })
  }

  function getWrapper(): HTMLElement | null {
    const el = renderer?.element
    return el instanceof HTMLElement ? el : null
  }

  function attach(props: SuggestionProps, token: number): void {
    if (!isActive || token !== renderToken || !renderer) return
    if (floatingEl) return
    const wrapper = getWrapper()
    if (!props.clientRect || !wrapper) return

    floatingEl = wrapper
    floatingEl.style.position = 'absolute'
    document.body.appendChild(floatingEl)
    getReferenceClientRect = props.clientRect as () => DOMRect | null
    updatePosition()
  }

  return {
    onStart(props: SuggestionProps) {
      isActive = true
      const token = ++renderToken

      renderer = new ReactRenderer(component, {
        editor: props.editor,
        props,
      })

      attach(props, token)
    },

    onUpdate(props: SuggestionProps) {
      if (!isActive || !renderer) return
      const token = ++renderToken

      const loading = (props as SuggestionProps & { loading?: boolean }).loading
      if (!loading) renderer.updateProps(props)

      if (!props.clientRect) return
      if (token !== renderToken) return

      getReferenceClientRect = props.clientRect as () => DOMRect | null
      if (!floatingEl) attach(props, token)
      else updatePosition()
    },

    onKeyDown(props: SuggestionKeyDownProps): boolean {
      if (props.event.key === 'Escape') return false

      const list = getListExpose()
      if (list) return list.onKeyDown(props)
      return false
    },

    onExit() {
      isActive = false
      renderToken++
      floatingEl?.remove()
      renderer?.destroy()
      floatingEl = null
      renderer = null
      getReferenceClientRect = null
    },
  }
}

function normalizeOffset(value: number | [number, number] | undefined) {
  if (Array.isArray(value)) return { mainAxis: value[1], crossAxis: value[0] }
  return value ?? 4
}
