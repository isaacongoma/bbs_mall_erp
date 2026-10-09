import { useState } from 'react'
import { __ } from '@/core/i18n'
import { Button, Combobox, Dialog, ErrorMessage, SortableList } from '@/design-system'
import { useMeta } from '../../hooks/useMeta'
import type { DocField } from '../../types/meta'
import { GRID_RESTRICTED_FIELD_TYPES } from '../../utils/fieldOptions'
import { DragVerticalIcon } from '../Icons'
import { Icon } from '../Icon'

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
  sticky?: number | boolean
}

function toEntry(field: DocField & { columns?: number | string }): GridFieldEntry {
  return {
    label: field.label,
    fieldname: field.fieldname,
    fieldtype: field.fieldtype,
    options: field.options,
    in_list_view: field.in_list_view,
    columns: field.columns || 2,
    sticky: (field as { sticky?: number | boolean }).sticky,
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
  const gridViewSettings = getGridViewSettings(parentDoctype) as Array<{
    fieldname: string
    columns: number
    sticky?: number | boolean
  }>

  const oldFields: GridFieldEntry[] = (() => {
    if (!allFields.length) return []
    if (gridViewSettings.length) {
      return gridViewSettings
        .map((setting) => {
          const field = allFields.find((candidate) => candidate.fieldname === setting.fieldname)
          return field
            ? toEntry({ ...field, columns: setting.columns, sticky: setting.sticky } as DocField & { columns?: number })
            : null
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
      fields.map((field) => ({
        fieldname: field.fieldname,
        columns: Math.max(1, Math.round(Number(field.columns) || 1)),
        sticky: field.sticky ? 1 : 0,
      })),
      () => {
        setLoading(false)
        onOpenChange(false)
      },
    )
  }

  const WIDTH_UNIT = 50

  return (
    <Dialog open={open} onOpenChange={onOpenChange} size="xl" bare paddingTop="0px">
      <div className="flex items-center justify-between border-b border-outline-gray-2 px-4 py-3">
        <h3 className="text-xl font-medium text-ink-gray-9">{__('Configure Columns')}</h3>
        <button
          type="button"
          aria-label={__('Close')}
          className="p-1 text-ink-gray-7"
          onClick={() => onOpenChange(false)}
        >
          <Icon icon="lucide-x" className="size-4" />
        </button>
      </div>
      <div className="px-4 pb-3 pt-5">
        <div className="mb-2 grid grid-cols-[28px_1fr_120px_110px_28px] items-center text-base font-semibold text-ink-gray-8">
          <span />
          <span className="pl-2">{__('Fieldname')}</span>
          <span>{__('Column Width')}</span>
          <span>{__('Sticky')}</span>
          <span />
        </div>
        {fields.length > 0 && (
          <SortableList
            items={fields}
            itemKey="fieldname"
            className="flex flex-col gap-1"
            onChange={setFields}
            renderItem={(field) => (
              <div className="grid grid-cols-[28px_1fr_120px_110px_28px] items-center rounded-md bg-surface-gray-2 py-1 text-base text-ink-gray-8">
                <DragVerticalIcon className="mx-auto h-3.5 cursor-grab" />
                <div className="pl-2">{field.label}</div>
                <input
                  type="number"
                  value={Number(field.columns) * WIDTH_UNIT}
                  onPointerDown={(event) => event.stopPropagation()}
                  onChange={(event) =>
                    setFields((current) =>
                      current.map((entry) =>
                        entry.fieldname === field.fieldname
                          ? { ...entry, columns: Math.max(1, Math.round(Number(event.target.value) / WIDTH_UNIT)) }
                          : entry,
                      ),
                    )
                  }
                  className="h-7 w-[100px] rounded border-0 bg-white px-2 text-right text-base text-ink-gray-8 focus:outline-none"
                />
                <div className="flex justify-center">
                  <input
                    type="checkbox"
                    checked={Boolean(field.sticky)}
                    onPointerDown={(event) => event.stopPropagation()}
                    onChange={(event) =>
                      setFields((current) =>
                        current.map((entry) =>
                          entry.fieldname === field.fieldname
                            ? { ...entry, sticky: event.target.checked ? 1 : 0 }
                            : entry,
                        ),
                      )
                    }
                  />
                </div>
                <button
                  type="button"
                  aria-label={__('Remove')}
                  className="mx-auto text-ink-gray-5"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={() => setFields((current) => current.filter((entry) => entry.fieldname !== field.fieldname))}
                >
                  <Icon icon="lucide-trash-2" className="size-3.5" />
                </button>
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
              <button type="button" className="mt-3 text-sm text-ink-gray-6" onClick={() => setOpen(!isOpen)}>
                + {__('Add / Remove Columns')}
              </button>
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
      <div className="mt-4 flex items-center justify-end gap-2 border-t border-outline-gray-2 px-4 py-3">
        <Button label={__('Reset to default')} onClick={reset} />
        <Button label={__('Update')} variant="solid" loading={loading} onClick={update} />
      </div>
    </Dialog>
  )
}
