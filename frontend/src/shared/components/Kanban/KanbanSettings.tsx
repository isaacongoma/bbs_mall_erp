import { useState } from 'react'
import { __ } from '@/core/i18n'
import { useObservable } from '@/core/resources'
import {
  Button,
  Combobox,
  Dialog,
  SortableList,
  type ButtonProps,
  type ComboboxSelectableOption,
} from '@/design-system'
import { useMeta } from '../../hooks/useMeta'
import type { ViewListResource } from '../../types/view'
import { DragVerticalIcon, KanbanIcon } from '../Icons'

export interface KanbanSettingsUpdate {
  column_field: string
  title_field: string
  kanban_fields: string[]
}

export interface KanbanSettingsProps extends Omit<ButtonProps, 'onClick' | 'label'> {
  list: ViewListResource
  doctype: string
  onUpdate: (update: KanbanSettingsUpdate) => void
}

interface FieldOption extends ComboboxSelectableOption {
  label: string
  value: string
  fieldname: string
  fieldtype: string
}

function parseKanbanFields(value: unknown): string[] {
  if (!value) return []
  if (typeof value === 'string') return JSON.parse(value)
  return value as string[]
}

export function KanbanSettings({ list, doctype, onUpdate, ...buttonProps }: KanbanSettingsProps) {
  useObservable(list)
  const { getFields } = useMeta(doctype)
  const [showDialog, setShowDialog] = useState(false)
  const [columnFieldName, setColumnFieldName] = useState('')
  const [titleFieldName, setTitleFieldName] = useState('')
  const [fieldNames, setFieldNames] = useState<string[]>([])

  const allMetaFields = getFields({ withStandardFields: true }) || []

  const allFields: FieldOption[] = allMetaFields.map((field) => ({
    label: field.label ?? field.fieldname,
    value: field.fieldname,
    fieldname: field.fieldname,
    fieldtype: field.fieldtype,
  }))

  const selectedFields = fieldNames
    .map((name) => allFields.find((field) => field.fieldname === name))
    .filter((field): field is FieldOption => Boolean(field?.label))

  const availableFields = allFields.filter((field) => !fieldNames.includes(field.fieldname))
  const columnFields = allFields.filter((field) => ['Link', 'Select'].includes(field.fieldtype))
  const columnField = columnFields.find((field) => field.fieldname === columnFieldName)
  const titleField = allFields.find((field) => field.fieldname === titleFieldName)

  function open() {
    setColumnFieldName(list.data?.column_field ?? '')
    setTitleFieldName(list.data?.title_field ?? '')
    setFieldNames(parseKanbanFields(list.data?.kanban_fields))
    setShowDialog(true)
  }

  function apply() {
    setShowDialog(false)
    onUpdate({
      column_field: columnField?.fieldname ?? '',
      title_field: titleField?.fieldname ?? '',
      kanban_fields: selectedFields.map((field) => field.fieldname),
    })
  }

  return (
    <>
      <Button {...buttonProps} label={__('Kanban settings')} iconLeft={KanbanIcon} onClick={open} />
      <Dialog
        open={showDialog}
        onOpenChange={setShowDialog}
        title={__('Kanban Settings')}
        actionsContent={() => <Button className="w-full" variant="solid" label={__('Apply')} onClick={apply} />}
      >
        <div>
          <div className="mb-2 text-base text-ink-gray-8">{__('Column Field')}</div>
          <Combobox
            value={null}
            options={columnFields}
            onSelectedOptionChange={(option) => {
              if (option && option.type !== 'custom') setColumnFieldName(String(option.value))
            }}
            trigger={({ open: isOpen, setOpen }) => (
              <Button
                className="w-full !justify-start"
                label={columnField?.label ?? ''}
                onClick={() => setOpen(!isOpen)}
              />
            )}
          />
          <div className="mb-2 mt-4 text-base text-ink-gray-8">{__('Title Field')}</div>
          <Combobox
            value={null}
            options={availableFields}
            onSelectedOptionChange={(option) => {
              if (option && option.type !== 'custom') setTitleFieldName(String(option.value))
            }}
            trigger={({ open: isOpen, setOpen }) => (
              <Button
                className="w-full !justify-start"
                label={titleField?.label ?? ''}
                onClick={() => setOpen(!isOpen)}
              />
            )}
          />
        </div>
        <div className="mt-4">
          <div className="mb-2 text-base text-ink-gray-8">{__('Fields Order')}</div>
          <SortableList
            items={selectedFields}
            itemKey="fieldname"
            className="flex flex-col gap-1"
            onChange={(next) => setFieldNames(next.map((field) => field.fieldname))}
            renderItem={(field) => (
              <div className="flex items-center justify-between gap-2 rounded border border-outline-elevation-2 px-1 py-0.5 text-base text-ink-gray-8">
                <div className="flex items-center gap-2">
                  <DragVerticalIcon className="h-3.5 cursor-grab" />
                  <div>{field.label}</div>
                </div>
                <div>
                  <Button
                    variant="ghost"
                    icon="lucide-x"
                    onClick={() => setFieldNames((current) => current.filter((name) => name !== field.fieldname))}
                  />
                </div>
              </div>
            )}
          />
          <Combobox
            value={null}
            options={availableFields}
            onSelectedOptionChange={(option) => {
              if (option && option.type !== 'custom') setFieldNames((current) => [...current, String(option.value)])
            }}
            trigger={({ open: isOpen, setOpen }) => (
              <Button
                className="mt-2 w-full"
                label={__('Add Field')}
                iconLeft="lucide-plus"
                onClick={() => setOpen(!isOpen)}
              />
            )}
            itemLabel={({ item }) => (
              <div className="flex flex-col gap-1 text-ink-gray-9">
                <div>{item.label}</div>
                <div className="text-sm text-ink-gray-4">{`${item.fieldname} - ${item.fieldtype}`}</div>
              </div>
            )}
          />
        </div>
      </Dialog>
    </>
  )
}
