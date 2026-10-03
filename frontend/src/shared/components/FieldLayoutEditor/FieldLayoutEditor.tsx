import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  pointerWithin,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { useEffect, useRef, useState } from 'react'
import { __ } from '@/core/i18n'
import { Button, Dropdown, TextInput, cn } from '@/design-system'
import { useMeta } from '../../hooks/useMeta'
import {
  getTabOptions,
  moveLayoutItem,
  newSection,
  newTab,
  tabContainerId,
  type DragContainerData,
  type DragItemData,
  type DragKind,
  type EditorTab,
  type LayoutDraftUpdate,
} from '../../utils/fieldLayoutEditor'
import { DragNode, DropContainer } from './DropContainer'
import { SectionCard, type AddableField } from './SectionCard'

export interface FieldLayoutEditorProps {
  tabs: EditorTab[]
  onChange: (tabs: EditorTab[]) => void
  doctype?: string
  onlyRequired?: boolean
}

const RESTRICTED_FIELD_TYPES = ['Tab Break', 'Section Break', 'Column Break', 'Signature']

function scrollTabIntoView(container: HTMLElement | null, index: number) {
  container?.querySelector(`[data-tab-index="${index}"]`)?.scrollIntoView({
    behavior: 'smooth',
    inline: 'nearest',
    block: 'nearest',
  })
}

export function FieldLayoutEditor({
  tabs,
  onChange,
  doctype = 'CRM Lead',
  onlyRequired = false,
}: FieldLayoutEditorProps) {
  const { getFields } = useMeta(doctype)
  const [tabIndex, setTabIndex] = useState(0)
  const [editing, setEditing] = useState<string | null>(null)
  const [activeKind, setActiveKind] = useState<DragKind | null>(null)
  const tabBar = useRef<HTMLDivElement>(null)

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const safeIndex = Math.min(tabIndex, Math.max(tabs.length - 1, 0))
  const currentTab = tabs[safeIndex]

  useEffect(() => {
    scrollTabIntoView(tabBar.current, safeIndex)
  }, [safeIndex])

  const update: LayoutDraftUpdate = (mutate) => {
    const draft = structuredClone(tabs)
    mutate(draft)
    onChange(draft)
  }

  const existingFields = new Set(
    tabs
      .flatMap((tab) =>
        (tab.sections ?? []).flatMap((section) => section.columns?.flatMap((column) => column.fields) ?? []),
      )
      .map((field) => field.fieldname),
  )

  const availableFields: AddableField[] = (
    getFields({ restrictNoValueFields: false, restrictedFieldTypes: RESTRICTED_FIELD_TYPES }) || []
  )
    .filter((field) => !existingFields.has(field.fieldname) && (onlyRequired ? field.reqd : true))
    .map((field) => ({
      label: field.label ?? field.fieldname,
      value: field.fieldname,
      fieldname: field.fieldname,
      fieldtype: field.fieldtype,
    }))

  const hasSingleUnlabelledTab = tabs.length === 1 && !tabs[0]!.label

  function addTab() {
    if (hasSingleUnlabelledTab) {
      update((draft) => {
        draft[0]!.label = __('New Tab')
      })
      setTabIndex(0)
      requestAnimationFrame(() => scrollTabIntoView(tabBar.current, 0))
      return
    }
    update((draft) => {
      draft.push(newTab(__('New Tab')))
    })
    const next = tabs.length
    setTabIndex(next)
    requestAnimationFrame(() => scrollTabIntoView(tabBar.current, next))
  }

  const collisionDetection: CollisionDetection = (args) => {
    const kind = args.active.data.current?.kind as DragKind | undefined
    if (kind && kind !== 'tab') {
      const overTab = pointerWithin({
        ...args,
        droppableContainers: args.droppableContainers.filter(
          (container) => String(container.id).startsWith('tab:') && container.data.current?.role === 'item',
        ),
      })
      if (overTab.length) return overTab
    }
    return closestCenter({
      ...args,
      droppableContainers: args.droppableContainers.filter((container) => {
        const data = container.data.current as DragItemData | DragContainerData | undefined
        if (!data || !kind) return false
        if (data.role === 'item') return data.kind === kind
        return (
          data.accepts.includes(kind) &&
          !(String(container.id).startsWith('tab:') && kind !== 'section' && tabs[safeIndex]?.sections.length)
        )
      }),
    })
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveKind((event.active.data.current as DragItemData | undefined)?.kind ?? null)
  }

  function handleDragOver(event: DragOverEvent) {
    const active = event.active.data.current as DragItemData | undefined
    const over = event.over?.data.current as DragItemData | undefined
    if (active && active.kind !== 'tab' && over?.role === 'item' && over.kind === 'tab') {
      const index = tabs.findIndex((tab) => tab.name === over.itemId)
      if (index >= 0 && index !== safeIndex) setTabIndex(index)
    }
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveKind(null)
    if (!over) return
    const activeData = active.data.current as DragItemData | undefined
    const overData = over.data.current as DragItemData | DragContainerData | undefined
    if (!activeData || !overData) return

    if (activeData.kind === 'tab') {
      if (overData.role !== 'item' || overData.kind !== 'tab' || active.id === over.id) return
      const from = tabs.findIndex((tab) => tab.name === activeData.itemId)
      const to = tabs.findIndex((tab) => tab.name === overData.itemId)
      if (from < 0 || to < 0) return
      onChange(arrayMove(tabs, from, to))
      setTabIndex(to)
      return
    }

    if (overData.role === 'item' && overData.kind === 'tab') return

    const overContainer = overData.containerId
    const overItem = overData.role === 'item' ? overData.itemId : null
    update((draft) => moveLayoutItem(draft, activeData, overContainer, overItem))
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveKind(null)}
    >
      <div className="flex flex-col gap-5.5">
        <div className="flex max-w-full items-center justify-between gap-2 overflow-x-auto rounded bg-surface-gray-2 px-2.5 py-2 text-base">
          {tabs.length > 0 && currentTab?.label && (
            <div ref={tabBar} className="w-full overflow-auto py-1 [&::-webkit-scrollbar]:h-0">
              <DropContainer
                containerId="tabs"
                accepts={['tab']}
                itemIds={tabs.map((tab) => `tab:${tab.name}`)}
                horizontal
                className="flex items-center gap-2"
              >
                {tabs.map((tab, index) => {
                  const isEditing = editing === tab.name
                  return (
                    <DragNode key={tab.name} kind="tab" containerId="tabs" itemId={tab.name}>
                      {() => (
                        <div
                          data-tab-index={index}
                          className={cn(
                            'flex shrink-0 cursor-pointer items-center gap-2 rounded',
                            safeIndex === index
                              ? 'bg-surface-base text-ink-gray-9 shadow-sm'
                              : 'text-ink-gray-5 hover:bg-surface-base hover:text-ink-gray-9 hover:shadow-sm',
                            isEditing ? 'p-1' : 'px-2 py-1',
                          )}
                          onClick={() => setTabIndex(index)}
                        >
                          <div onDoubleClick={() => setEditing(tab.name)}>
                            {!isEditing ? (
                              <div className="flex items-center gap-2">{__(tab.label) || __('Untitled')}</div>
                            ) : (
                              <div className="flex items-center gap-1">
                                <TextInput
                                  value={tab.label}
                                  onChange={(value) =>
                                    update((draft) => {
                                      draft[index]!.label = value
                                    })
                                  }
                                  onKeyDown={(event) => {
                                    if (event.key === 'Enter') setEditing(null)
                                  }}
                                  onBlur={() => setEditing(null)}
                                  onClick={(event) => event.stopPropagation()}
                                />
                                <Button icon="lucide-check" variant="ghost" onClick={() => setEditing(null)} />
                              </div>
                            )}
                          </div>
                          {tab.label && safeIndex === index && (
                            <span onClick={(event) => event.stopPropagation()}>
                              <Dropdown
                                options={getTabOptions({
                                  tab,
                                  tabs,
                                  tabIndex: safeIndex,
                                  update,
                                  setTabIndex,
                                  startEditing: setEditing,
                                })}
                                className="!h-4"
                              >
                                <Button variant="ghost" className="!h-4 !p-1">
                                  <span className="lucide-more-horizontal h-4" aria-hidden="true" />
                                </Button>
                              </Dropdown>
                            </span>
                          )}
                        </div>
                      )}
                    </DragNode>
                  )
                })}
              </DropContainer>
            </div>
          )}
          <Button
            variant="ghost"
            className="!h-6.5 !text-ink-gray-5 hover:!text-ink-gray-9"
            label={__('Add Tab')}
            prefix={hasSingleUnlabelledTab ? <span className="lucide-plus h-4" aria-hidden="true" /> : undefined}
            suffix={undefined}
            onClick={addTab}
          >
            {!hasSingleUnlabelledTab && <span className="lucide-plus h-4" aria-hidden="true" />}
          </Button>
        </div>

        {currentTab && (
          <div key={currentTab.name} className="min-h-[34rem]">
            <DropContainer
              containerId={tabContainerId(currentTab.name)}
              accepts={currentTab.sections.length === 0 ? ['section', 'column', 'field'] : ['section']}
              itemIds={currentTab.sections.map((section) => `section:${section.name}`)}
              className={
                currentTab.sections.length === 0
                  ? 'mb-5.5 rounded border-2 border-dashed border-outline-gray-2 p-3'
                  : 'flex flex-col gap-5.5'
              }
            >
              {currentTab.sections.map((section, index) =>
                Array.isArray(section.columns) ? (
                  <SectionCard
                    key={section.name}
                    sectionIndex={index}
                    section={section}
                    tab={currentTab}
                    tabs={tabs}
                    tabIndex={safeIndex}
                    update={update}
                    setTabIndex={setTabIndex}
                    editing={editing}
                    setEditing={setEditing}
                    availableFields={availableFields}
                  />
                ) : null,
              )}
              {currentTab.sections.length === 0 && (
                <div className="pointer-events-none flex min-h-20 select-none items-center justify-center text-sm text-ink-gray-4">
                  {__('Drag a section or a field here to get started')}
                </div>
              )}
            </DropContainer>
            <div className="mt-5.5">
              <Button
                className="h-8 w-full"
                variant="subtle"
                label={__('Add Section')}
                iconLeft="lucide-plus"
                onClick={() =>
                  update((draft) => {
                    draft[safeIndex]!.sections.push(newSection())
                  })
                }
              />
            </div>
          </div>
        )}
        <span className="hidden" data-dragging={activeKind ?? ''} />
      </div>
    </DndContext>
  )
}
