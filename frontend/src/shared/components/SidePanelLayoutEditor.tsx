import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { useState } from 'react'
import { __ } from '@/core/i18n'
import { Button, Combobox, TextInput, type ComboboxSelectableOption } from '@/design-system'
import { useMeta } from '../hooks/useMeta'
import type { DocField } from '../types/meta'
import {
  columnContainerId,
  moveLayoutItem,
  newSection,
  tabContainerId,
  type DragContainerData,
  type DragItemData,
  type EditorTab,
} from '../utils/fieldLayoutEditor'
import { DragNode, DropContainer } from './FieldLayoutEditor/DropContainer'
import { DragVerticalIcon, EditIcon } from './Icons'
import type { SidePanelSection } from './SidePanelLayout'

const PSEUDO_TAB = '__side_panel'
const RESTRICTED_FIELD_TYPES = [
  'Section Break',
  'Column Break',
  'Tab Break',
  'Table',
  'Table MultiSelect',
  'Signature',
  'Image',
]

export interface SidePanelLayoutEditorProps {
  sections: SidePanelSection[]
  onChange: (sections: SidePanelSection[]) => void
  doctype?: string
  className?: string
}

interface AddableField extends ComboboxSelectableOption {
  label: string
  value: string
  fieldname: string
  fieldtype: string
}

const collisionDetection: CollisionDetection = (args) => {
  const kind = (args.active.data.current as DragItemData | undefined)?.kind
  return closestCenter({
    ...args,
    droppableContainers: args.droppableContainers.filter((container) => {
      const data = container.data.current as DragItemData | DragContainerData | undefined
      if (!data || !kind) return false
      return data.role === 'item' ? data.kind === kind : data.accepts.includes(kind)
    }),
  })
}

export function SidePanelLayoutEditor({
  sections,
  onChange,
  doctype = 'CRM Lead',
  className,
}: SidePanelLayoutEditorProps) {
  const { getFields } = useMeta(doctype)
  const [editing, setEditing] = useState<string | null>(null)
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const fields: AddableField[] = (
    getFields({ restrictNoValueFields: false, restrictedFieldTypes: RESTRICTED_FIELD_TYPES }) || []
  ).map((field) => ({
    label: field.label ?? field.fieldname,
    value: field.fieldname,
    fieldname: field.fieldname,
    fieldtype: field.fieldtype,
  }))

  function update(mutate: (draft: SidePanelSection[]) => void) {
    const draft = structuredClone(sections)
    mutate(draft)
    onChange(draft)
  }

  function runPseudo(mutate: (tabs: EditorTab[]) => void) {
    update((draft) => {
      const tabs = [{ name: PSEUDO_TAB, label: '', sections: draft }] as unknown as EditorTab[]
      mutate(tabs)
    })
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over) return
    const activeData = active.data.current as DragItemData | undefined
    const overData = over.data.current as DragItemData | DragContainerData | undefined
    if (!activeData || !overData) return
    const overItem = overData.role === 'item' ? overData.itemId : null
    runPseudo((tabs) => moveLayoutItem(tabs, activeData, overData.containerId, overItem))
  }

  function updateSection(name: string, mutate: (section: SidePanelSection) => void) {
    update((draft) => {
      const target = draft.find((section) => section.name === name)
      if (target) mutate(target)
    })
  }

  return (
    <div className={className}>
      <DndContext sensors={sensors} collisionDetection={collisionDetection} onDragEnd={handleDragEnd}>
        <DropContainer
          containerId={tabContainerId(PSEUDO_TAB)}
          accepts={['section']}
          itemIds={sections.map((section) => `section:${section.name}`)}
          className="flex flex-col gap-5.5"
        >
          {sections.map((section) => {
            const column = section.columns?.[0]
            const columnId = columnContainerId(column?.name ?? `${section.name}_col`)
            const isEditing = editing === section.name
            return (
              <DragNode
                key={section.name}
                kind="section"
                containerId={tabContainerId(PSEUDO_TAB)}
                itemId={section.name}
                useHandle
              >
                {({ handleProps }) => (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between rounded bg-surface-gray-2 px-2.5 py-2">
                      <div
                        className="flex max-w-fit cursor-pointer items-center gap-2 text-base leading-4 text-ink-gray-9"
                        onClick={() =>
                          updateSection(section.name, (draft) => {
                            draft.opened = !draft.opened
                          })
                        }
                      >
                        <span
                          {...handleProps}
                          className={`lucide-chevron-right h-4 transition-all duration-300 ease-in-out ${section.opened ? 'rotate-90' : ''}`}
                          aria-hidden="true"
                        />
                        {!isEditing ? (
                          <div>{__(section.label) || __('Untitled')}</div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <TextInput
                              value={section.label ?? ''}
                              onChange={(value) =>
                                updateSection(section.name, (draft) => {
                                  draft.label = value
                                })
                              }
                              onKeyDown={(event) => {
                                if (event.key === 'Enter') setEditing(null)
                              }}
                              onBlur={() => setEditing(null)}
                              onClick={(event) => event.stopPropagation()}
                            />
                            <Button
                              icon="lucide-check"
                              className="!size-4 rounded-sm"
                              variant="ghost"
                              onClick={(event) => {
                                event.stopPropagation()
                                setEditing(null)
                              }}
                            />
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {!isEditing && (
                          <Button
                            className="!size-4 rounded-sm"
                            variant="ghost"
                            onClick={() => setEditing(section.name)}
                          >
                            <EditIcon className="h-3.5" />
                          </Button>
                        )}
                        {section.editable !== false && (
                          <Button
                            className="!size-4 rounded-sm"
                            icon="lucide-x"
                            variant="ghost"
                            onClick={() =>
                              update((draft) => {
                                draft.splice(
                                  draft.findIndex((entry) => entry.name === section.name),
                                  1,
                                )
                              })
                            }
                          />
                        )}
                      </div>
                    </div>
                    <div style={{ display: section.opened ? undefined : 'none' }}>
                      <DropContainer
                        containerId={columnId}
                        accepts={['field']}
                        itemIds={(column?.fields ?? []).map((field) => `field:${field.fieldname}`)}
                        className="flex flex-col gap-1.5"
                      >
                        {(column?.fields ?? []).map((field: DocField) => (
                          <DragNode
                            key={field.fieldname}
                            kind="field"
                            containerId={columnId}
                            itemId={field.fieldname}
                            useHandle
                          >
                            {({ handleProps: fieldHandle }) => (
                              <div className="flex items-center justify-between gap-2 rounded border border-outline-elevation-2 px-2.5 py-2 text-base leading-4 text-ink-gray-8">
                                <div className="flex items-center gap-2">
                                  <span {...fieldHandle}>
                                    <DragVerticalIcon className="h-3.5 cursor-grab" />
                                  </span>
                                  <div>{field.label}</div>
                                </div>
                                <Button
                                  variant="ghost"
                                  icon="lucide-x"
                                  className="!size-4 rounded-sm"
                                  onClick={() =>
                                    updateSection(section.name, (draft) => {
                                      const target = draft.columns?.[0]
                                      if (target)
                                        target.fields = target.fields.filter(
                                          (entry) => entry.fieldname !== field.fieldname,
                                        )
                                    })
                                  }
                                />
                              </div>
                            )}
                          </DragNode>
                        ))}
                      </DropContainer>
                      {section.editable !== false ? (
                        <Combobox
                          value={null}
                          options={fields}
                          onSelectedOptionChange={(option) => {
                            if (!option || option.type === 'custom') return
                            updateSection(section.name, (draft) => {
                              draft.columns?.[0]?.fields.push(option as unknown as DocField)
                            })
                          }}
                          trigger={({ open, setOpen }) => (
                            <Button
                              className="mt-1.5 h-8 w-full !bg-surface-gray-1"
                              variant="outline"
                              label={__('Add Field')}
                              iconLeft="lucide-plus"
                              onClick={() => setOpen(!open)}
                            />
                          )}
                          itemLabel={({ item }) => (
                            <div className="flex flex-col gap-1 text-ink-gray-9">
                              <div>{item.label}</div>
                              <div className="text-sm text-ink-gray-4">{`${item.fieldname} - ${item.fieldtype}`}</div>
                            </div>
                          )}
                        />
                      ) : (
                        <div className="flex items-center justify-center rounded border border-dashed border-outline-elevation-2 p-3">
                          <div className="text-sm text-ink-gray-4">{__('This section is not editable')}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </DragNode>
            )
          })}
        </DropContainer>
      </DndContext>
      <div className="mt-5.5">
        <Button
          className="h-8 w-full"
          variant="subtle"
          label={__('Add Section')}
          iconLeft="lucide-plus"
          onClick={() =>
            update((draft) => {
              draft.push({ ...newSection(), label: __('New Section') } as unknown as SidePanelSection)
            })
          }
        />
      </div>
    </div>
  )
}
