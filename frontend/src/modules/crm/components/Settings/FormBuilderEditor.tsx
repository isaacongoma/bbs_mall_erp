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
} from '@dnd-kit/core'
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { useState } from 'react'
import { __ } from '@/core/i18n'
import { Button, Combobox, Dropdown, ErrorMessage, FormControl, cn } from '@/design-system'
import { DragVerticalIcon } from '@/shared/components/Icons'
import { DragNode, DropContainer } from '@/shared/components/FieldLayoutEditor/DropContainer'
import type { DragContainerData, DragItemData } from '@/shared/utils/fieldLayoutEditor'
import type { useFormBuilder } from '../../hooks/useFormBuilder'
import {
  MAX_COLUMNS,
  fieldCount,
  fieldTypeIcon,
  locateField,
  moveFieldBetweenColumns,
  optionList,
  type FormSection,
  type HiddenField,
} from '../../utils/formBuilder'
import { FieldCard } from './FieldCard'

type Builder = ReturnType<typeof useFormBuilder>

export interface FormBuilderEditorProps {
  builder: Builder
  descriptionRef: (element: HTMLTextAreaElement | null) => void
  autoGrow: (element: HTMLTextAreaElement) => void
}

const collisionDetection: CollisionDetection = (args) => {
  const kind = (args.active.data.current as DragItemData | undefined)?.kind
  const droppableContainers = args.droppableContainers.filter((container) => {
    const data = container.data.current as DragItemData | DragContainerData | undefined
    if (!data) return false
    if (kind === 'section') return data.role === 'item' && data.kind === 'section'
    return data.role === 'container' || (data.role === 'item' && data.kind === 'field')
  })
  const scoped = { ...args, droppableContainers }
  const within = pointerWithin(scoped)
  return within.length ? within : closestCenter(scoped)
}

function hiddenSelectOptions(hidden: HiddenField, linkOptions: Record<string, string[]>) {
  let options: string[] = []
  if (hidden.fieldtype === 'Select') options = optionList(hidden)
  else if (hidden.fieldtype === 'Link') options = linkOptions[hidden.options] ?? []
  options = options.slice()
  if (hidden.default && !options.includes(hidden.default)) options.unshift(hidden.default)
  return options.map((option) => ({ label: option, value: option }))
}

export function FormBuilderEditor({ builder, descriptionRef, autoGrow }: FormBuilderEditorProps) {
  const [dragging, setDragging] = useState(false)
  const { form, sections, catalog, hiddenFields, expanded } = builder

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const used = new Set(builder.fields.map((field) => field.fieldname))
  const availableOptions = catalog
    .filter((field) => !used.has(field.fieldname))
    .map((field) => ({ label: field.label, value: field.fieldname, af: field }))

  function handleDragEnd(event: DragEndEvent) {
    setDragging(false)
    const { active, over } = event
    if (!over) return
    const activeData = active.data.current as DragItemData | undefined
    const overData = over.data.current as DragItemData | DragContainerData | undefined
    if (!activeData || !overData) return

    if (activeData.kind === 'section') {
      if (overData.role !== 'item' || overData.kind !== 'section') return
      const from = sections.findIndex((section) => section.id === activeData.itemId)
      const to = sections.findIndex((section) => section.id === overData.itemId)
      if (from < 0 || to < 0 || from === to) return
      builder.commitSections(arrayMove(sections, from, to))
      return
    }

    if (overData.role === 'container') {
      builder.commitSections(moveFieldBetweenColumns(sections, activeData.itemId, overData.containerId, null))
      return
    }
    if (overData.kind !== 'field' || overData.itemId === activeData.itemId) return
    const target = locateField(sections, overData.itemId)
    if (!target) return
    builder.commitSections(moveFieldBetweenColumns(sections, activeData.itemId, target.columnId, target.index))
  }

  function sectionMenu(section: FormSection) {
    const columnOptions = [
      {
        label: __('Add Column'),
        icon: 'columns',
        onClick: () => builder.addColumn(section.id),
        condition: () => section.columns.length < MAX_COLUMNS,
      },
      {
        label: __('Remove Last Column'),
        icon: 'trash-2',
        onClick: () => builder.removeLastColumn(section.id),
        condition: () => section.columns.length > 1,
      },
    ]
    return [
      {
        group: __('Section'),
        items: [
          {
            label: __('Rename'),
            icon: 'edit',
            onClick: () => builder.updateSection(section.id, { editingLabel: true }),
          },
          { label: __('Remove Section'), icon: 'trash-2', onClick: () => builder.removeSection(section.id) },
        ],
      },
      { group: __('Column'), items: columnOptions },
    ]
  }

  return (
    <div className="pt-5">
      <div className="mb-5 px-1">
        <input
          value={form.title}
          placeholder={__('Form title')}
          className="w-full border-0 bg-transparent p-0 text-2xl font-semibold leading-tight text-ink-gray-9 placeholder:text-ink-gray-4 focus:outline-none focus:ring-0"
          onChange={(event) => builder.onTitleChange(event.target.value)}
        />
        <textarea
          ref={descriptionRef}
          value={form.description}
          placeholder={__('Add a description to help people fill out this form')}
          rows={1}
          className="mt-2 w-full resize-none border-0 bg-transparent p-0 text-base leading-relaxed text-ink-gray-6 placeholder:text-ink-gray-4 focus:outline-none focus:ring-0"
          onChange={(event) => {
            autoGrow(event.target)
            builder.patchForm({ description: event.target.value })
          }}
        />
        <hr className="mt-5 border-outline-gray-2" />
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={() => setDragging(true)}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setDragging(false)}
      >
        <div className={cn('flex flex-col gap-3', dragging && 'select-none')}>
          <DropContainer
            containerId="sections"
            accepts={['section']}
            itemIds={sections.map((section) => `section:${section.id}`)}
            className="flex flex-col gap-3"
          >
            {sections.map((section) => (
              <DragNode key={section.id} kind="section" containerId="sections" itemId={section.id} useHandle>
                {({ handleProps }) => (
                  <div className="flex flex-col gap-1.5 rounded bg-surface-gray-2 p-2.5">
                    <div className="flex h-7 items-center justify-between">
                      <div className="flex items-center gap-2 text-base-medium text-ink-gray-9">
                        <span {...handleProps} className="section-handle shrink-0 cursor-grab">
                          <DragVerticalIcon className="h-3.5 text-ink-gray-3" />
                        </span>
                        {section.editingLabel ? (
                          <input
                            autoFocus
                            value={section.secField.label}
                            placeholder={__('Section title')}
                            className="min-w-0 flex-1 border-0 bg-transparent p-0 text-base-medium text-ink-gray-9 placeholder:font-normal placeholder:italic placeholder:text-ink-gray-4 focus:outline-none focus:ring-0"
                            onChange={(event) => builder.updateSection(section.id, {}, { label: event.target.value })}
                            onBlur={() => builder.updateSection(section.id, { editingLabel: false })}
                            onKeyDown={(event) =>
                              event.key === 'Enter' && builder.updateSection(section.id, { editingLabel: false })
                            }
                          />
                        ) : (
                          <span
                            className={cn('cursor-text truncate', !section.secField.label && 'italic text-ink-gray-4')}
                            onClick={() => builder.updateSection(section.id, { editingLabel: true })}
                          >
                            {section.secField.label || __('Section title')}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {fieldCount(section) > 0 && (
                          <span className="rounded bg-surface-gray-3 px-1.5 py-0.5 text-xs leading-none text-ink-gray-4">
                            {fieldCount(section)} {fieldCount(section) === 1 ? __('field') : __('fields')}
                          </span>
                        )}
                        <Dropdown options={sectionMenu(section) as never}>
                          <Button variant="ghost">
                            <span className="lucide-more-horizontal h-4" aria-hidden="true" />
                          </Button>
                        </Dropdown>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {section.columns.map((column) => (
                        <div
                          key={column.id}
                          className="flex min-w-0 flex-1 flex-col gap-1.5 rounded border border-dashed border-outline-gray-2 bg-surface-elevation-2 p-2"
                        >
                          <DropContainer
                            containerId={column.id}
                            accepts={['field']}
                            itemIds={column.items.map((item) => `field:${item.fieldname}`)}
                            className="flex min-h-[34px] min-w-0 flex-1 flex-col gap-1.5"
                          >
                            {column.items.map((field) => (
                              <DragNode
                                key={field.fieldname}
                                kind="field"
                                containerId={column.id}
                                itemId={field.fieldname}
                                useHandle
                              >
                                {({ handleProps: fieldHandle }) => (
                                  <FieldCard
                                    field={field}
                                    expanded={expanded === field.fieldname}
                                    locked={builder.mandatory.has(field.fieldname)}
                                    guestSelectMissing={
                                      field.fieldtype === 'Link' && builder.guestSelect[field.options ?? ''] === false
                                    }
                                    granting={Boolean(builder.grantingSelect[field.options ?? ''])}
                                    handleProps={fieldHandle}
                                    onOpen={() => builder.setExpanded(field.fieldname)}
                                    onToggle={() => builder.toggleExpanded(field)}
                                    onRemove={() => builder.removeField(field)}
                                    onUpdate={(patch) => builder.updateField(field.fieldname, patch)}
                                    onGrantGuest={() => void builder.grantGuestSelect(field.options)}
                                  />
                                )}
                              </DragNode>
                            ))}
                          </DropContainer>
                          <Combobox
                            options={availableOptions}
                            value={null}
                            placeholder={__('Search fields…')}
                            onSelectedOptionChange={(option) => builder.addFieldToColumn(column.id, option as never)}
                            trigger={({ open, setOpen }) => (
                              <Button
                                className="!h-8 w-full !bg-surface-elevation-2"
                                variant="outline"
                                label={__('Add Field')}
                                iconLeft="lucide-plus"
                                onClick={() => {
                                  if (!open) builder.setExpanded(null)
                                  setOpen(!open)
                                }}
                              />
                            )}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </DragNode>
            ))}
          </DropContainer>

          <Button
            className="!h-8 w-full"
            variant="subtle"
            label={__('Add Section')}
            iconLeft="lucide-plus"
            onClick={builder.addSection}
          />
        </div>
      </DndContext>

      {hiddenFields.length > 0 && (
        <div className="mt-6">
          <div className="mb-2 flex items-center gap-1.5 text-base-medium text-ink-gray-7">
            <span className="lucide-eye-off h-3.5 w-3.5 text-ink-gray-5" aria-hidden="true" />
            {__('Hidden required fields')}
          </div>
          <div className="rounded bg-surface-gray-2 p-2.5">
            <p className="mb-2.5 text-p-sm text-ink-gray-5">
              {__("These fields aren't shown to users. Default values are used when the form is submitted.")}
            </p>
            <div className="flex flex-col gap-2">
              {hiddenFields.map((hidden) => (
                <div
                  key={hidden.fieldname}
                  className="flex items-center gap-2.5 rounded border border-outline-gray-2 bg-surface-elevation-2 px-2.5 py-2"
                >
                  <span className={cn(fieldTypeIcon(hidden), 'h-4 w-4 shrink-0 text-ink-gray-5')} aria-hidden="true" />
                  <span className="flex-1 truncate text-base text-ink-gray-8" title={hidden.label}>
                    {hidden.label}
                  </span>
                  <div className="w-52 shrink-0">
                    {hidden.fieldtype === 'Select' || hidden.fieldtype === 'Link' ? (
                      <FormControl
                        type="select"
                        size="sm"
                        value={hidden.default}
                        options={hiddenSelectOptions(hidden, builder.linkOptions)}
                        onChange={(value: string) => builder.updateHiddenDefault(hidden.fieldname, value)}
                      />
                    ) : (
                      <FormControl
                        type="text"
                        size="sm"
                        value={hidden.default}
                        placeholder={__('Default value')}
                        onChange={(value: string) => builder.updateHiddenDefault(hidden.fieldname, value)}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
            {builder.hiddenMissingDefault && (
              <ErrorMessage className="mt-2" message={__('Set a default value for each field to publish this form.')} />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
