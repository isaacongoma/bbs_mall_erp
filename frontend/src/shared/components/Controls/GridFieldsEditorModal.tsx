import { useState } from 'react'
import { __ } from '@/core/i18n'
import { Badge, Button, Combobox, Dialog, ErrorMessage, SortableList, TextInput } from '@/design-system'
import { useMeta } from '../../hooks/useMeta'
import type { DocField } from '../../types/meta'
import { GRID_RESTRICTED_FIELD_TYPES } from '../../utils/fieldOptions'
import { DragVerticalIcon } from '../Icons'

export interface GridFieldsEditorModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  doctype?: string
  parentDoctype?: string
}

interface GridFieldEntry {
  label?: string
  fieldname: string
  fieldtype: string
  options?: unknown
  in_list_view?: number | boolean
  columns: number | string
}

function toEntry(field: DocField & { columns?: number | string }): GridFieldEntry {
  return {
    label: field.label,
    fieldname: field.fieldname,
    fieldtype: field.fieldtype,
    options: field.options,
    in_list_view: field.in_list_view,
    columns: field.columns || 2,
  }
}

export function GridFieldsEditorModal({
  open,
  onOpenChange,
  doctype = '',
  parentDoctype = '',
}: GridFieldsEditorModalProps) {
  const { getFields, getGridViewSettings, saveUserSettings } = useMeta(doctype)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const allFields = getFields({ restrictNoValueFields: false, restrictedFieldTypes: GRID_RESTRICTED_FIELD_TYPES })
  const gridViewSettings = getGridViewSettings(parentDoctype) as Array<{ fieldname: string; columns: number }>

  const oldFields: GridFieldEntry[] = (() => {
    if (!allFields.length) return []
    if (gridViewSettings.length) {
      return gridViewSettings
        .map((setting) => {
          const field = allFields.find((candidate) => candidate.fieldname === setting.fieldname)
          return field ? toEntry({ ...field, columns: setting.columns }) : null
        })
        .filter((entry): entry is GridFieldEntry => entry !== null)
    }
    return allFields.filter((field) => field.in_list_view).map((field) => toEntry(field))
  })()

  const oldJson = JSON.stringify(oldFields)
  const [fields, setFields] = useState<GridFieldEntry[]>(() => JSON.parse(oldJson))
  const [baseline, setBaseline] = useState(oldJson)
  if (baseline !== oldJson) {
    const untouched = JSON.stringify(fields) === baseline
    setBaseline(oldJson)
    if (untouched) setFields(JSON.parse(oldJson))
  }

  const dirty = JSON.stringify(fields) !== oldJson

  const dropdownFields = allFields
    .filter((field) => !fields.some((entry) => entry.fieldname === field.fieldname))
    .map((field) => ({ ...field, value: field.fieldname, label: field.label ?? field.fieldname }))

  function reset() {
    setFields(JSON.parse(oldJson))
  }

  function update() {
    if (fields.length === 0) {
      setError(__('At least one field is required'))
      return
    }
    setError(null)
    setLoading(true)
    saveUserSettings(
      parentDoctype,
      'GridView',
      fields.map((field) => ({ fieldname: field.fieldname, columns: field.columns })),
      () => {
        setLoading(false)
        onOpenChange(false)
      },
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      titleContent={
        <h3 className="flex items-center gap-2 text-3xl-semibold leading-6 text-ink-gray-9">
          <div>{__('Edit Grid Fields Layout')}</div>
          {dirty && <Badge label={__('Not Saved')} variant="subtle" theme="orange" />}
        </h3>
      }
      actionsContent={() => (
        <div className="flex items-center justify-end gap-2">
          {dirty && <Button className="w-full" label={__('Reset')} onClick={reset} />}
          <Button
            className="w-full"
            label={__('Save')}
            variant="solid"
            loading={loading}
            disabled={!dirty}
            onClick={update}
          />
        </div>
      )}
    >
      <div className="mt-4">
        <div className="mb-2 text-base text-ink-gray-8">{__('Fields Order')}</div>
        {oldFields.length > 0 && (
          <SortableList
            items={fields}
            itemKey="fieldname"
            className="flex flex-col gap-1"
            onChange={setFields}
            renderItem={(field) => (
              <div className="flex items-center justify-between gap-2 rounded border border-outline-elevation-2 bg-surface-gray-2 px-1 py-0.5 text-base text-ink-gray-8">
                <div className="flex items-center gap-2">
                  <DragVerticalIcon className="h-3.5 cursor-grab" />
                  <div>{field.label}</div>
                </div>
                <div className="flex items-center gap-2">
                  <TextInput
                    value={field.columns}
                    variant="outline"
                    type="number"
                    className="w-20"
                    onPointerDown={(event) => event.stopPropagation()}
                    onChange={(value) =>
                      setFields((current) =>
                        current.map((entry) =>
                          entry.fieldname === field.fieldname ? { ...entry, columns: value } : entry,
                        ),
                      )
                    }
                  />
                  <Button
                    variant="ghost"
                    icon="lucide-x"
                    onClick={() =>
                      setFields((current) => current.filter((entry) => entry.fieldname !== field.fieldname))
                    }
                  />
                </div>
              </div>
            )}
          />
        )}
        {dropdownFields.length > 0 && (
          <Combobox
            value={null}
            options={dropdownFields}
            onSelectedOptionChange={(option) => {
              if (option && option.type !== 'custom')
                setFields((current) => [...current, toEntry(option as unknown as DocField)])
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
        )}
        {error && <ErrorMessage className="mt-3" message={error} />}
      </div>
    </Dialog>
  )
}
