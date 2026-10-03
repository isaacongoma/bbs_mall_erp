import { __ } from '@/core/i18n'
import { Button, Combobox, Dropdown, TextInput, cn, type ComboboxSelectableOption } from '@/design-system'
import type { DocField } from '../../types/meta'
import {
  columnContainerId,
  getSectionOptions,
  itemKey,
  sectionContainerId,
  type EditorColumn,
  type EditorSection,
  type EditorTab,
  type LayoutDraftUpdate,
} from '../../utils/fieldLayoutEditor'
import { DragVerticalIcon } from '../Icons'
import { DragNode, DropContainer } from './DropContainer'

export interface AddableField extends ComboboxSelectableOption {
  label: string
  value: string
  fieldname: string
  fieldtype: string
}

export interface SectionCardProps {
  sectionIndex: number
  section: EditorSection
  tab: EditorTab
  tabs: EditorTab[]
  tabIndex: number
  update: LayoutDraftUpdate
  setTabIndex: (index: number) => void
  editing: string | null
  setEditing: (name: string | null) => void
  availableFields: AddableField[]
}

function LabelEditor({
  value,
  onChange,
  onDone,
}: {
  value: string
  onChange: (value: string) => void
  onDone: () => void
}) {
  return (
    <div className="flex items-center gap-2">
      <TextInput
        value={value}
        onChange={onChange}
        onKeyDown={(event) => {
          if (event.key === 'Enter') onDone()
        }}
        onBlur={onDone}
        onClick={(event) => event.stopPropagation()}
      />
      <Button icon="lucide-check" variant="ghost" onClick={onDone} />
    </div>
  )
}

export function SectionCard({
  sectionIndex,
  section,
  tab,
  tabs,
  tabIndex,
  update,
  setTabIndex,
  editing,
  setEditing,
  availableFields,
}: SectionCardProps) {
  const fieldCount = section.columns.reduce((count, column) => count + column.fields.length, 0)
  const isEditing = editing === section.name

  function updateSection(mutate: (draft: EditorSection) => void) {
    update((draft) => {
      const target = draft[tabIndex]?.sections.find((candidate) => candidate.name === section.name)
      if (target) mutate(target as EditorSection)
    })
  }

  function updateColumn(column: EditorColumn, mutate: (draft: EditorColumn) => void) {
    updateSection((draftSection) => {
      const target = draftSection.columns.find((candidate) => candidate.name === column.name)
      if (target) mutate(target)
    })
  }

  return (
    <DragNode kind="section" containerId={`tab:${tab.name}`} itemId={section.name} useHandle>
      {({ handleProps }) => (
        <div className="section flex flex-col gap-1.5 rounded bg-surface-gray-2 p-2.5">
          <div className="flex items-center justify-between">
            <div className="flex h-7 max-w-fit items-center gap-2 text-base-medium leading-4 text-ink-gray-9">
              <span {...handleProps}>
                <DragVerticalIcon className="section-drag-handle h-3.5 shrink-0 cursor-grab text-ink-gray-3" />
              </span>
              <div className="flex cursor-pointer items-center gap-2" onDoubleClick={() => setEditing(section.name)}>
                {!isEditing ? (
                  <div
                    className={cn(
                      'flex items-center gap-2',
                      (section.hideLabel || !section.label) && 'text-ink-gray-3',
                      !section.label && 'italic',
                    )}
                  >
                    {__(section.label) || __('No Label')}
                    {section.collapsible && (
                      <span
                        className="lucide-chevron-down h-4 transition-all duration-300 ease-in-out"
                        aria-hidden="true"
                      />
                    )}
                  </div>
                ) : (
                  <LabelEditor
                    value={section.label ?? ''}
                    onChange={(value) =>
                      updateSection((draft) => {
                        draft.label = value
                      })
                    }
                    onDone={() => setEditing(null)}
                  />
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {fieldCount > 0 && (
                <span className="rounded bg-surface-gray-3 px-1.5 py-0.5 text-xs leading-none text-ink-gray-4">
                  {fieldCount} {fieldCount === 1 ? __('field') : __('fields')}
                </span>
              )}
              <Dropdown
                options={getSectionOptions({
                  sectionIndex,
                  section,
                  tab,
                  tabs,
                  tabIndex,
                  update,
                  setTabIndex,
                  startEditing: setEditing,
                })}
              >
                <Button variant="ghost">
                  <span className="lucide-more-horizontal h-4" aria-hidden="true" />
                </Button>
              </Dropdown>
            </div>
          </div>

          <DropContainer
            containerId={sectionContainerId(section.name)}
            accepts={['column']}
            itemIds={section.columns.map((column) => `column:${column.name}`)}
            horizontal
            className="flex gap-2"
          >
            {section.columns.map((column) => (
              <DragNode
                key={column.name}
                kind="column"
                containerId={sectionContainerId(section.name)}
                itemId={column.name}
                className="flex flex-1 cursor-grab flex-col gap-1.5 rounded border border-dashed border-outline-gray-2 bg-surface-elevation-2 p-2"
              >
                {() => (
                  <>
                    <DropContainer
                      containerId={columnContainerId(column.name)}
                      accepts={['field']}
                      itemIds={column.fields.map((field) => `field:${itemKey('field', field)}`)}
                      className="flex min-h-8.5 flex-1 flex-col gap-1.5"
                    >
                      {column.fields.map((field: DocField) => (
                        <DragNode
                          key={field.fieldname}
                          kind="field"
                          containerId={columnContainerId(column.name)}
                          itemId={field.fieldname}
                          useHandle
                        >
                          {({ handleProps: fieldHandle }) => (
                            <div className="field flex cursor-auto items-center justify-between gap-2 rounded border border-outline-gray-2 bg-surface-elevation-2 px-2.5 py-2 text-base leading-4 text-ink-gray-8">
                              <div className="flex items-center gap-2 truncate">
                                <span {...fieldHandle}>
                                  <DragVerticalIcon className="field-drag-handle h-3.5 cursor-grab" />
                                </span>
                                <div className="truncate">{field.label}</div>
                              </div>
                              <Button
                                variant="ghost"
                                className="!size-4 rounded-sm"
                                icon="lucide-x"
                                onClick={() =>
                                  updateColumn(column, (draft) => {
                                    draft.fields = draft.fields.filter((entry) => entry.fieldname !== field.fieldname)
                                  })
                                }
                              />
                            </div>
                          )}
                        </DragNode>
                      ))}
                    </DropContainer>
                    <Combobox
                      value={null}
                      options={availableFields}
                      onSelectedOptionChange={(option) => {
                        if (!option || option.type === 'custom') return
                        updateColumn(column, (draft) => {
                          draft.fields.push(option as unknown as DocField)
                        })
                      }}
                      trigger={({ open, setOpen }) => (
                        <Button
                          className="w-full !h-8 !bg-surface-elevation-2"
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
                  </>
                )}
              </DragNode>
            ))}
          </DropContainer>
        </div>
      )}
    </DragNode>
  )
}
