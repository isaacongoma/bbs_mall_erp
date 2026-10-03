import { useState } from 'react'
import { __ } from '@/core/i18n'
import { Avatar, Badge, Button, Dropdown, Popover, Tooltip, cn } from '@/design-system'
import type { HierarchyDragHandlers } from '../../hooks/useHierarchyDragDrop'
import { HierarchyUserMultiSelect } from './HierarchyUserMultiSelect'

type AnyRecord = Record<string, any>

export interface HierarchyRowProps {
  node: AnyRecord
  hasChildren: boolean
  isCollapsed: boolean
  isLast: boolean
  rowClass: string
  handlers: HierarchyDragHandlers
  getCandidates: (parent: AnyRecord | null) => AnyRecord[]
  candidatesLoading: boolean
  canEdit: boolean
  onToggle: () => void
  onBulkAdd: (payload: { parent: AnyRecord; userIds: string[] }) => void
  onRemove: (node: AnyRecord) => void
  onMoveToRoot: (node: AnyRecord) => void
}

export function HierarchyRow({
  node,
  hasChildren,
  isCollapsed,
  isLast,
  rowClass,
  handlers,
  getCandidates,
  candidatesLoading,
  canEdit,
  onToggle,
  onBulkAdd,
  onRemove,
  onMoveToRoot,
}: HierarchyRowProps) {
  const [selected, setSelected] = useState<string[]>([])
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const highlighted = popoverOpen || dropdownOpen

  const moreOptions = [
    ...(node.reports_to
      ? [{ label: __('Move to top level'), icon: 'corner-up-left', onClick: () => onMoveToRoot(node) }]
      : []),
    { label: __('Delete'), icon: 'trash-2', onClick: () => onRemove(node) },
  ]

  return (
    <div className="hierarchy-tree-row mb-1 flex items-center gap-1" data-has-children={hasChildren}>
      {hasChildren ? (
        <div
          className="z-10 flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-full border border-outline-elevation-2 bg-white text-ink-gray-1 hover:bg-surface-gray-2"
          onClick={(event) => {
            event.stopPropagation()
            onToggle()
          }}
        >
          <span
            className={cn(
              isCollapsed ? 'lucide-chevron-right' : 'lucide-chevron-down',
              'size-3 stroke-2 text-ink-gray-5',
            )}
            aria-hidden="true"
          />
        </div>
      ) : (
        <span className="size-5 shrink-0" />
      )}

      <div
        className={cn(
          "group relative flex flex-1 select-none items-center gap-2 rounded-md px-2 py-1.5 text-base after:absolute after:bottom-0 after:left-1 after:right-3 after:border-outline-elevation-2 after:content-['']",
          rowClass,
          canEdit ? 'cursor-grab' : 'cursor-pointer',
          highlighted ? 'bg-surface-gray-1' : 'hover:bg-surface-gray-1',
          isLast && 'after:hidden',
        )}
        draggable={canEdit}
        onDragStart={(event) => canEdit && handlers.onDragStart(event, node)}
        onDragEnd={() => canEdit && handlers.onDragEnd()}
        onDragOver={(event) => {
          event.preventDefault()
          if (canEdit) handlers.onDragOver(event, node)
        }}
        onDragLeave={() => canEdit && handlers.onDragLeave(node)}
        onDrop={(event) => {
          event.preventDefault()
          if (canEdit) void handlers.onDrop(node)
        }}
        onClick={() => hasChildren && onToggle()}
      >
        <Avatar image={node.user_image} label={node.full_name} size="lg" className="shrink-0" />
        <span className="truncate text-ink-gray-8">{node.full_name}</span>
        <span className="text-ink-gray-4">{node.role_label}</span>
        {!node.enabled && <Badge label={__('disabled')} theme="gray" variant="subtle" size="sm" />}

        {canEdit && (
          <div
            className={cn(
              'ml-auto flex gap-1 transition-opacity',
              highlighted ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
            )}
            onClick={(event) => event.stopPropagation()}
          >
            <Popover
              placement="bottom-end"
              onOpenChange={(open: boolean) => {
                setPopoverOpen(open)
                if (!open) setSelected([])
              }}
              target={({ togglePopover }) => (
                <Tooltip text={__('Add direct reports')}>
                  <Button variant="ghost" size="sm" icon="lucide-plus" onClick={() => togglePopover()} />
                </Tooltip>
              )}
              body={({ togglePopover }) => (
                <div className="mt-1 w-72 rounded-lg border border-outline-gray-2 bg-surface-base shadow-2xl">
                  <HierarchyUserMultiSelect
                    value={selected}
                    onChange={setSelected}
                    candidates={getCandidates(node)}
                    loading={candidatesLoading}
                  />
                  <div className="flex justify-end border-t p-1.5">
                    <Button
                      variant="solid"
                      disabled={!selected.length}
                      label={__('Add ({0})', [selected.length])}
                      onClick={() => {
                        if (!selected.length) return
                        onBulkAdd({ parent: node, userIds: selected })
                        setSelected([])
                        togglePopover()
                      }}
                    />
                  </div>
                </div>
              )}
            />
            <Dropdown placement="right" options={moreOptions as never} onOpenChange={setDropdownOpen}>
              <Button variant="ghost" size="sm" icon="lucide-more-horizontal" />
            </Dropdown>
          </div>
        )}
      </div>
    </div>
  )
}
