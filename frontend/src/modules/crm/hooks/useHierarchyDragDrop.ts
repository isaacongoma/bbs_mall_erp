import { useState, type DragEvent } from 'react'
import { __ } from '@/core/i18n'
import { toast } from '@/design-system'

type AnyRecord = Record<string, any>

export function isDescendant(source: AnyRecord, name: string): boolean {
  const stack = [...(source.children || [])]
  while (stack.length) {
    const node = stack.pop()
    if (node.name === name) return true
    stack.push(...(node.children || []))
  }
  return false
}

export function canDrop(source: AnyRecord | null, target: AnyRecord | null): boolean {
  if (!source || !target || source.name === target.name) return false
  if (source.role_rank < target.role_rank) return false
  if (isDescendant(source, target.name)) return false
  return true
}

export function useHierarchyDragDrop(onReparent: (name: string, parent: string | null) => Promise<void> | void) {
  const [source, setSource] = useState<AnyRecord | null>(null)
  const [hoverNode, setHoverNode] = useState<AnyRecord | null>(null)
  const [point, setPoint] = useState({ x: 0, y: 0 })

  function end() {
    setSource(null)
    setHoverNode(null)
  }

  const handlers = {
    onDragStart(event: DragEvent, node: AnyRecord) {
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData('text/plain', node.name)
      setSource(node)
    },
    onDragEnd: end,
    onDragOver(event: DragEvent, node: AnyRecord) {
      if (!source) return
      setHoverNode(node)
      setPoint({ x: event.clientX, y: event.clientY })
      event.dataTransfer.dropEffect = 'move'
    },
    onDragLeave(node: AnyRecord) {
      if (hoverNode?.name === node.name) setHoverNode(null)
    },
    async onDrop(target: AnyRecord) {
      const dragged = source
      end()
      if (!dragged || !target || dragged.name === target.name) return
      if (dragged.reports_to === target.name) {
        toast.info(__('No changes made'))
        return
      }
      if (!canDrop(dragged, target)) {
        toast.error(
          dragged.role_rank < target.role_rank
            ? __('A {0} cannot report to a {1}', [dragged.role_label, target.role_label])
            : __('Cannot move a manager under one of their own reports'),
        )
        return
      }
      await onReparent(dragged.name, target.name)
    },
  }

  function rowClasses(node: AnyRecord): string {
    if (!source) return ''
    if (source.name === node.name) return 'opacity-40'
    if (!canDrop(source, node)) return 'opacity-50 [&_span]:line-through'
    if (hoverNode?.name === node.name) return 'border-b !border-blue-500 rounded-none'
    return ''
  }

  const dragLabel =
    source &&
    hoverNode &&
    source.name !== hoverNode.name &&
    source.reports_to !== hoverNode.name &&
    canDrop(source, hoverNode)
      ? __('Move under {0}', [hoverNode.full_name])
      : null

  return { handlers, rowClasses, dragLabel, point }
}

export type HierarchyDragHandlers = ReturnType<typeof useHierarchyDragDrop>['handlers']
