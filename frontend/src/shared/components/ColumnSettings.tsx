import { useState } from 'react'
import { __ } from '@/core/i18n'
import { useObservable } from '@/core/resources'
import { Button, Combobox, FormControl, Popover, SortableList } from '@/design-system'
import { useMeta } from '../hooks/useMeta'
import type { ListViewColumn, ViewListResource } from '../types/view'
import { isTouchScreenDevice } from '../utils/platform'
import { ColumnsIcon, DragIcon, EditIcon, ReloadIcon } from './Icons'

export interface ColumnSettingsUpdate {
  columns: ListViewColumn[]
  rows: string[]
  isDefault: boolean
  reload: boolean
  reset: boolean
}

export interface ColumnSettingsProps {
  list: ViewListResource
  doctype: string
  hideLabel?: boolean
  onUpdate: (update: ColumnSettingsUpdate) => void
}

interface ColumnDraft {
  key: string
  label: string
  width: string
}

interface OldValues {
  columns: ListViewColumn[]
  rows: string[]
  isDefault: boolean
}

const RIGHT_ALIGNED_TYPES = ['Float', 'Int', 'Percent', 'Currency', 'Duration']

export function ColumnSettings({ list, doctype, hideLabel = false, onUpdate }: ColumnSettingsProps) {
  useObservable(list)
  const { getFields } = useMeta(doctype)
  const [columnsUpdated, setColumnsUpdated] = useState(false)
  const [edit, setEdit] = useState(false)
  const [draft, setDraft] = useState<ColumnDraft>({ key: '', label: '', width: '10rem' })
  const [oldValues, setOldValues] = useState<OldValues | null>(null)

  const data = list.data
  if (data && !oldValues) {
    setOldValues({
      columns: JSON.parse(JSON.stringify(data.columns ?? [])),
      rows: JSON.parse(JSON.stringify(data.rows ?? [])),
      isDefault: data.is_default,
    })
  }

  const columns: ListViewColumn[] = data?.columns ?? []
  const rows: string[] = data?.rows ?? []
  const isDefault: boolean = data?.is_default

  function patchData(patch: Record<string, unknown>) {
    list.setData((current: any) => ({ ...(current ?? {}), ...patch }))
  }

  const existingKeys = new Set(columns.map((column) => column.key))
  const fields = (getFields({ withStandardFields: true }) || [])
    .filter((field) => !existingKeys.has(field.fieldname))
    .map((field) => ({ ...field, value: field.fieldname, label: field.label ?? field.fieldname }))

  function apply(
    nextColumns: ListViewColumn[],
    nextRows: string[],
    reload = false,
    nextIsDefault = false,
    reset = false,
  ) {
    const old = oldValues
    patchData({ columns: nextColumns, rows: nextRows, is_default: nextIsDefault })
    setColumnsUpdated(true)
    onUpdate({
      columns: reset && old ? old.columns : nextColumns,
      rows: reset && old ? old.rows : nextRows,
      isDefault: reset && old ? old.isDefault : nextIsDefault,
      reload,
      reset,
    })
    if (reload) {
      setTimeout(() => {
        patchData({ is_default: reset && old ? old.isDefault : nextIsDefault })
        setColumnsUpdated(!reset)
      }, 100)
    }
  }

  function addColumn(
    field: { label: string; fieldtype: string; fieldname: string; options?: unknown; value: string } | null,
  ) {
    if (!field) return
    const column: ListViewColumn = {
      label: field.label,
      type: field.fieldtype,
      key: field.fieldname,
      options: field.options as Record<string, unknown> | undefined,
      width: '10rem',
      align: RIGHT_ALIGNED_TYPES.includes(field.fieldtype) ? 'right' : 'left',
    }
    apply([...columns, column], [...rows, field.value], true, isDefault)
  }

  function removeColumn(column: ListViewColumn) {
    const nextColumns = columns.filter((entry) => entry.key !== column.key)
    const nextRows = column.key !== 'name' ? rows.filter((row) => row !== column.key) : rows
    apply(nextColumns, nextRows, false, isDefault)
  }

  function editColumn(column: ListViewColumn) {
    setDraft({ key: column.key, label: column.label, width: String(column.width ?? '10rem') })
    setEdit(true)
  }

  function updateColumn() {
    setEdit(false)
    apply(
      columns.map((column) =>
        column.key === draft.key ? { ...column, label: draft.label, width: draft.width } : column,
      ),
      rows,
      false,
      isDefault,
    )
  }

  return (
    <Popover
      placement="bottom-end"
      target={({ togglePopover }) => (
        <Button
          label={hideLabel ? undefined : __('Columns')}
          icon={hideLabel ? ColumnsIcon : undefined}
          iconLeft={hideLabel ? undefined : ColumnsIcon}
          onClick={() => togglePopover()}
        />
      )}
      body={({ close }) => (
        <div className="my-2 min-w-40 rounded-lg bg-surface-elevation-2 p-1.5 shadow-2xl ring-1 ring-black/5 focus:outline-none">
          {!edit ? (
            <div>
              <SortableList
                items={columns}
                itemKey="key"
                touchDelay={isTouchScreenDevice() ? 200 : 0}
                className="list-group"
                onChange={(next) => apply(next, rows, false, isDefault)}
                renderItem={(column) => (
                  <div className="flex cursor-grab items-center justify-between gap-6 rounded px-2 py-1.5 text-base text-ink-gray-8 hover:bg-surface-gray-2">
                    <div className="flex items-center gap-2">
                      <DragIcon className="h-3.5" />
                      <div>{__(column.label)}</div>
                    </div>
                    <div className="flex cursor-pointer items-center gap-0.5">
                      <Button variant="ghost" className="!h-5 w-5 !p-1" onClick={() => editColumn(column)}>
                        <EditIcon className="h-3.5" />
                      </Button>
                      <Button variant="ghost" className="!h-5 w-5 !p-1" onClick={() => removeColumn(column)}>
                        <span className="lucide-x h-3.5" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                )}
              />
              <div className="mt-1.5 flex flex-col gap-1 border-t border-outline-elevation-2 pt-1.5">
                <Combobox
                  value={null}
                  options={fields}
                  onSelectedOptionChange={(option) => {
                    if (option && option.type !== 'custom') addColumn(option as never)
                  }}
                  trigger={({ open, setOpen }) => (
                    <Button
                      className="w-full !justify-start !text-ink-gray-5"
                      variant="ghost"
                      label={__('Add Column')}
                      iconLeft="lucide-plus"
                      onClick={() => setOpen(!open)}
                    />
                  )}
                />
                {columnsUpdated && (
                  <Button
                    className="w-full !justify-start !text-ink-gray-5"
                    variant="ghost"
                    label={__('Reset Changes')}
                    iconLeft={ReloadIcon}
                    onClick={() => {
                      apply(columns, rows, true, false, true)
                      close()
                    }}
                  />
                )}
                {!isDefault && (
                  <Button
                    className="w-full !justify-start !text-ink-gray-5"
                    variant="ghost"
                    label={__('Reset to Default')}
                    iconLeft={ReloadIcon}
                    onClick={() => {
                      apply(columns, rows, true, true)
                      close()
                    }}
                  />
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-between gap-2 rounded px-2 py-1.5 text-base text-ink-gray-8">
              <div className="flex flex-col items-center gap-3">
                <FormControl
                  type="text"
                  size="md"
                  label={__('Label')}
                  className="w-52 sm:w-full"
                  placeholder={__('First Name')}
                  value={draft.label}
                  onChange={(label: string) => setDraft((current) => ({ ...current, label }))}
                />
                <FormControl
                  type="text"
                  size="md"
                  label={__('Width')}
                  className="w-52 sm:w-full"
                  placeholder="10rem"
                  description={__('Width can be in number, pixel or rem (eg. 3, 30px, 10rem)')}
                  debounce={500}
                  value={draft.width}
                  onChange={(width: string) => setDraft((current) => ({ ...current, width }))}
                />
              </div>
              <div className="flex w-full gap-2 border-t pt-2">
                <Button
                  variant="subtle"
                  label={__('Cancel')}
                  className="w-full flex-1"
                  onClick={() => setEdit(false)}
                />
                <Button variant="solid" label={__('Update')} className="w-full flex-1" onClick={updateColumn} />
              </div>
            </div>
          )}
        </div>
      )}
    />
  )
}
