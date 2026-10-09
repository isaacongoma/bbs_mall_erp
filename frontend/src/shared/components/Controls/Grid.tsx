import { useRef, useState } from 'react'
import { __ } from '@/core/i18n'
import { Button, Checkbox, SortableList, toast } from '@/design-system'
import { FieldLayoutContext, useFieldLayout } from '../../hooks/useFieldLayout'
import { useMeta } from '../../hooks/useMeta'
import { useUsers } from '../../hooks/useUsers'
import type { DocField, DocRecord } from '../../types/meta'
import { isFetchedFromLink } from '../../utils/fetchFrom'
import { parseLinkFilters } from '../../utils/fieldTransforms'
import { GRID_RESTRICTED_FIELD_TYPES, getDefaultValue, normalizeFieldValue } from '../../utils/fieldOptions'
import { isTouchScreenDevice } from '../../utils/platform'
import { getRandom } from '../../utils/text'
import { createDocument } from '../../utils/documents'
import { downloadCsv, parseCsv } from '../../utils/csv'
import { renderFieldLayoutDialog } from '../../utils/renderFieldLayoutDialog'
import { EditIcon } from '../Icons'
import '../../styles/grid.css'
import { GridCell } from './GridCell'
import { GridFieldsEditorModal } from './GridFieldsEditorModal'
import { GridRowFieldsModal } from './GridRowFieldsModal'
import { GridRowModal } from './GridRowModal'

type FieldObj = DocField & Record<string, any>

export interface GridProps {
  label?: string
  doctype: string
  parentDoctype: string
  parentFieldname: string
  rows?: DocRecord[]
  onRowsChange?: (rows: DocRecord[]) => void
  parent?: DocRecord
  overrides?: { fields?: Array<Partial<DocField> & { fieldname: string }> }
}

const NUMERIC_TYPES = ['Int', 'Float', 'Currency', 'Percent']

function renumber(rows: DocRecord[]): DocRecord[] {
  rows.forEach((row, index) => {
    row.idx = index + 1
  })
  return [...rows]
}

export function Grid({
  label = '',
  doctype,
  parentDoctype,
  parentFieldname,
  rows = [],
  onRowsChange,
  parent = {},
  overrides = {},
}: GridProps) {
  const layout = useFieldLayout()
  const { crmUsers } = useUsers()
  const childMeta = useMeta(doctype)
  useMeta(parentDoctype)

  const [editingRow, setEditingRow] = useState<number | null>(null)
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
  const [showGridFieldsEditorModal, setShowGridFieldsEditorModal] = useState(false)
  const [showGridRowFieldsModal, setShowGridRowFieldsModal] = useState(false)
  const csvInputRef = useRef<HTMLInputElement>(null)

  const columnOverrides = layout.fieldPropertyOverrides

  function fieldChange(rawValue: unknown, field: FieldObj, row: DocRecord) {
    void layout.triggerOnChange(field.fieldname, normalizeFieldValue(rawValue), row)
  }

  function getFieldObj(source: DocField): FieldObj {
    let field: FieldObj = { ...source }
    const scriptOverrides = columnOverrides[`${parentFieldname}.${field.fieldname}`]
    if (scriptOverrides) Object.assign(field, scriptOverrides)

    if (field.fieldtype === 'Link' && field.options !== 'User' && !field.create) {
      field.create = (value: string, linkField: FieldObj, row: DocRecord, close: () => void) => {
        const callback = (created: { name?: string } | null) => {
          if (created?.name) fieldChange(created.name, linkField, row)
        }
        void createDocument(linkField.options, { name: value }, close, callback)
      }
    }

    if (field.fieldtype === 'Link' && field.options === 'User') {
      field = {
        ...field,
        fieldtype: 'User',
        link_filters: JSON.stringify({
          name: ['in', crmUsers.map((user) => user.name)],
          ignore_user_type: 1,
          ...(parseLinkFilters(field.link_filters) || {}),
        }),
      }
    }

    const withFilters: FieldObj = {
      ...field,
      filters: parseLinkFilters(field.link_filters),
      placeholder: layout.standalone ? field.placeholder : field.placeholder || field.label,
    }
    return { ...withFilters, ...overrides.fields?.find((entry) => entry.fieldname === field.fieldname) }
  }

  function getRowFieldObj(field: FieldObj, row: DocRecord): FieldObj {
    const colKey = `${parentFieldname}.${field.fieldname}`
    const rowKey = row?.name ? `${colKey}:${row.name}` : null
    const merged: FieldObj = { ...field }
    const colOverrides = columnOverrides[colKey]
    const rowOverrides = rowKey ? columnOverrides[rowKey] : null
    if (colOverrides) Object.assign(merged, colOverrides)
    if (rowOverrides) Object.assign(merged, rowOverrides)
    merged.disabled = Boolean(merged.read_only || isFetchedFromLink(merged, row))
    return merged
  }

  const gridUi = layout.gridUi?.(parentFieldname)
  const gridOps = layout.gridOps?.(parentFieldname)
  const gridSettings = childMeta.getGridSettings() as Record<string, any>
  const gridViewSettings = childMeta.getGridViewSettings(parentDoctype) as Array<Record<string, any>>
  const gridFields = childMeta.getFields({
    restrictNoValueFields: false,
    restrictedFieldTypes: GRID_RESTRICTED_FIELD_TYPES,
  })

  const fields: FieldObj[] = (() => {
    if (!gridFields?.length) return []
    const processed = gridViewSettings.length
      ? gridViewSettings.map((setting) =>
          getFieldObj(gridFields.find((field) => field.fieldname === setting.fieldname)!),
        )
      : gridFields.filter((field) => field.in_list_view).map((field) => getFieldObj(field))
    return processed.filter((field) => !field.hidden && !gridUi?.hiddenColumns?.has(field.fieldname))
  })()

  const allFields = childMeta.getFields().map((field) => getFieldObj(field))
  const csvFields = allFields.filter((field) => !field.hidden && !GRID_RESTRICTED_FIELD_TYPES.includes(field.fieldtype))

  const gridTemplateColumns = fields.length
    ? fields
        .map((field) => {
          const setting = gridViewSettings.length
            ? gridViewSettings.find((entry) => entry.fieldname === field.fieldname)
            : field
          return `minmax(0, ${setting?.columns || 2}fr)`
        })
        .join(' ')
    : '1fr'

  const allRowsSelected = rows.length > 0 && rows.length === selectedRows.size

  function toggleSelectAllRows(checked: boolean) {
    setSelectedRows(checked ? new Set(rows.map((row) => row.name)) : new Set())
  }

  function toggleSelectRow(row: DocRecord) {
    setSelectedRows((current) => {
      const next = new Set(current)
      if (next.has(row.name)) next.delete(row.name)
      else next.add(row.name)
      return next
    })
  }

  function addRow() {
    if (gridOps) {
      gridOps.addRow()
      return
    }
    const newRow: DocRecord = {}
    allFields.forEach((field) => {
      newRow[field.fieldname] = field.fieldtype === 'Check' ? false : ''
      if (field.default) newRow[field.fieldname] = getDefaultValue(field.default, field.fieldtype)
    })
    newRow.name = getRandom(10)
    newRow.__islocal = true
    newRow.idx = rows.length + 1
    newRow.doctype = doctype
    newRow.parentfield = parentFieldname
    newRow.parenttype = parentDoctype
    onRowsChange?.([...rows, newRow])
    void layout.triggerOnRowAdd(newRow)
  }

  function createRow(values: DocRecord = {}): DocRecord {
    const row: DocRecord = {}
    allFields.forEach((field) => {
      row[field.fieldname] = field.fieldtype === 'Check' ? false : ''
      if (field.default) row[field.fieldname] = getDefaultValue(field.default, field.fieldtype)
    })
    Object.assign(row, values)
    row.name = getRandom(10)
    row.__islocal = true
    row.doctype = doctype
    row.parentfield = parentFieldname
    row.parenttype = parentDoctype
    return row
  }

  function deleteRows() {
    if (gridOps) {
      gridOps.deleteRows(selectedRows)
      setSelectedRows(new Set())
      return
    }
    const remaining = rows.filter((row) => !selectedRows.has(row.name))
    onRowsChange?.(remaining)
    void layout.triggerOnRowRemove(selectedRows, remaining)
    setSelectedRows(new Set())
  }

  function duplicateRows() {
    if (!selectedRows.size) return
    if (gridOps) {
      gridOps.duplicateRows(selectedRows)
      setSelectedRows(new Set())
      return
    }
    const copies = rows
      .filter((row) => selectedRows.has(row.name))
      .map((row) => createRow({ ...row, idx: rows.length + 1 }))
    onRowsChange?.([...rows, ...copies].map((row, index) => ({ ...row, idx: index + 1 })))
    setSelectedRows(new Set(copies.map((row) => row.name)))
  }

  async function bulkEditRows() {
    if (!selectedRows.size) return
    const editableFields = csvFields.filter((field) => !field.read_only && field.fieldtype !== 'Button')
    const values = await renderFieldLayoutDialog({
      title: __('Edit Selected Rows'),
      fields: [
        {
          fieldname: 'fieldname',
          fieldtype: 'Select',
          label: __('Field'),
          options: editableFields.map((field) => `${field.fieldname}\n${field.label ?? field.fieldname}`).join('\n'),
          reqd: 1,
        },
        { fieldname: 'value', fieldtype: 'Data', label: __('Value') },
      ],
      submitLabel: __('Apply'),
    })
    if (!values) return
    const field = editableFields.find((entry) => entry.fieldname === values.fieldname)
    if (!field) return
    const nextValue = getDefaultValue(values.value, field.fieldtype)
    const updated = rows.map((row) => (selectedRows.has(row.name) ? { ...row, [field.fieldname]: nextValue } : row))
    onRowsChange?.(updated)
  }

  function exportRows() {
    downloadCsv(
      `${parentFieldname.replaceAll(' ', '_')}.csv`,
      rows,
      csvFields.map((field) => ({ key: field.fieldname, label: field.label ?? field.fieldname })),
    )
  }

  async function importRows(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      const records = parseCsv(await file.text())
      const headers = records.shift() ?? []
      const mappedFields = headers.map((header) =>
        csvFields.find((field) => field.fieldname === header.trim() || field.label === header.trim()),
      )
      if (!mappedFields.some(Boolean)) {
        toast.error(__('The CSV does not contain fields for this table'))
        return
      }
      const imported = records.map((record, rowIndex) => {
        const values: DocRecord = {}
        mappedFields.forEach((field, fieldIndex) => {
          if (field) values[field.fieldname] = getDefaultValue(record[fieldIndex] ?? '', field.fieldtype)
        })
        return createRow({ ...values, idx: rows.length + rowIndex + 1 })
      })
      onRowsChange?.([...rows, ...imported].map((row, index) => ({ ...row, idx: index + 1 })))
      toast.success(__('Imported {0} row(s)', [imported.length]))
    } catch {
      toast.error(__('Could not read the CSV file'))
    }
  }

  async function handleButtonClick(field: FieldObj, row: DocRecord) {
    if (typeof field.click === 'function') await field.click(row)
    else await layout.triggerButton(field.fieldname, row)
  }

  const rowContext = { ...layout, parentDoc: parent, parentFieldname }

  return (
    <FieldLayoutContext.Provider value={rowContext}>
      <div className="flex flex-1 flex-col text-base">
        {label && <div className="mb-1.5 text-sm text-ink-gray-5">{__(label)}</div>}

        {fields.length > 0 && (
          <div className="rounded border border-outline-elevation-2">
            <div className="grid-header flex items-center truncate rounded-t-[7px] bg-surface-gray-2 text-ink-gray-5">
              <div className="inline-flex h-8 w-12 items-center justify-center border-r border-outline-gray-2 p-2">
                <Checkbox
                  className="cursor-pointer duration-300"
                  value={allRowsSelected}
                  onChange={toggleSelectAllRows}
                />
              </div>
              <div className="inline-flex w-12 items-center justify-center border-r border-outline-gray-2 px-1 py-2">
                {__('No.')}
              </div>
              <div className="grid w-full truncate" style={{ gridTemplateColumns }}>
                {fields.map((field) => (
                  <div
                    key={field.fieldname}
                    className={`truncate border-r border-outline-gray-2 p-2 ${NUMERIC_TYPES.includes(field.fieldtype) ? 'text-right' : ''}`}
                    title={field.label}
                  >
                    {__(String(columnOverrides[`${parentFieldname}.${field.fieldname}`]?.label ?? field.label))}
                    {(field.reqd || (field.mandatory_depends_on && field.mandatory_via_depends_on)) && (
                      <span className="text-ink-red-5">*</span>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex w-12 items-center justify-center">
                <Button
                  tooltip={__('Edit Grid Fields')}
                  className="rounded border-0 !bg-surface-gray-2 !text-ink-gray-5"
                  variant="outline"
                  icon="lucide-settings"
                  onClick={() => setShowGridFieldsEditorModal(true)}
                />
              </div>
            </div>

            {rows.length > 0 ? (
              <SortableList
                items={rows}
                itemKey="name"
                className="w-full"
                touchDelay={isTouchScreenDevice() ? 200 : 0}
                onChange={(next) => {
                  if (gridOps) gridOps.reorder(renumber(next))
                  else onRowsChange?.(renumber(next))
                }}
                renderItem={(row, { index }) => (
                  <div
                    className="grid-row flex cursor-pointer items-center border-b border-outline-elevation-2 bg-surface-modals last:rounded-b last:border-b-0"
                    onClick={(event) => {
                      event.stopPropagation()
                      if (!gridSettings.editable_grid) setEditingRow(index)
                    }}
                  >
                    <div className="grid-row-checkbox inline-flex h-9.5 w-12 items-center justify-center border-r border-outline-elevation-2 bg-surface-base p-2">
                      <Checkbox
                        className="cursor-pointer duration-300"
                        value={selectedRows.has(row.name)}
                        onClick={(event) => event.stopPropagation()}
                        onChange={() => toggleSelectRow(row)}
                      />
                    </div>
                    <div className="flex h-9.5 w-12 items-center justify-center border-r border-outline-elevation-2 bg-surface-base px-1 py-2 text-sm text-ink-gray-8">
                      {index + 1}
                    </div>
                    <div className="grid h-9.5 w-full" style={{ gridTemplateColumns }}>
                      {fields.map((baseField) => {
                        const field = getRowFieldObj(baseField, row)
                        if (field.hidden) return null
                        return (
                          <div key={baseField.fieldname} className="h-9.5 border-r border-outline-elevation-2">
                            <GridCell
                              field={field}
                              row={row}
                              doctype={doctype}
                              parentDoc={parent}
                              editable={Boolean(gridSettings.editable_grid)}
                              onChange={fieldChange}
                              onButtonClick={(cellField, cellRow) => void handleButtonClick(cellField, cellRow)}
                            />
                          </div>
                        )
                      })}
                    </div>
                    <div className="edit-row flex w-12 items-center justify-center">
                      <Button
                        tooltip={__('Edit Row')}
                        className="rounded border-0 !text-ink-gray-7"
                        variant="outline"
                        icon={EditIcon}
                        onClick={(event) => {
                          event.stopPropagation()
                          setEditingRow(index)
                        }}
                      />
                    </div>
                    {editingRow === index && (
                      <GridRowModal
                        open
                        onOpenChange={(open) => setEditingRow(open ? index : null)}
                        onEditFieldsLayout={() => {
                          setShowGridRowFieldsModal(true)
                          setEditingRow(null)
                        }}
                        index={index}
                        data={row}
                        doctype={doctype}
                        parentDoctype={parentDoctype}
                        parentFieldname={parentFieldname}
                      />
                    )}
                  </div>
                )}
              />
            ) : (
              <div className="flex flex-col items-center rounded p-5 text-base text-ink-gray-6">{__('No rows')}</div>
            )}
          </div>
        )}

        {fields.length > 0 && (
          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="flex flex-row flex-wrap gap-2">
              {selectedRows.size > 0 && !gridUi?.cannotDeleteRows && (
                <Button
                  label={
                    selectedRows.size === rows.length && rows.length > 1
                      ? __('Delete all {0} rows', [String(rows.length)])
                      : selectedRows.size === 1
                        ? __('Delete row')
                        : __('Delete {0} rows', [String(selectedRows.size)])
                  }
                  variant="subtle"
                  theme="red"
                  onClick={deleteRows}
                />
              )}
              {selectedRows.size > 0 && (
                <Button label={__('Edit')} variant="subtle" onClick={() => void bulkEditRows()} />
              )}
              {selectedRows.size > 0 && (
                <Button label={__('Duplicate rows')} variant="subtle" onClick={duplicateRows} />
              )}
              {!gridUi?.cannotAddRows && <Button label={__('Add row')} variant="subtle" onClick={addRow} />}
              {!gridUi?.cannotAddRows && gridUi?.multipleAdd && (
                <Button label={__('Add multiple')} variant="subtle" onClick={() => gridUi.multipleAdd?.()} />
              )}
              {(gridUi?.customButtons ?? []).map((entry) => (
                <Button
                  key={entry.label}
                  label={__(entry.label)}
                  variant="subtle"
                  onClick={() => void entry.action()}
                />
              ))}
            </div>
            <div className="flex flex-row gap-2">
              {!gridUi && rows.length > 0 && <Button label={__('Download')} variant="subtle" onClick={exportRows} />}
              {!gridUi && rows.length > 0 && (
                <Button label={__('Upload')} variant="subtle" onClick={() => csvInputRef.current?.click()} />
              )}
              {gridUi?.download && (
                <Button label={__('Download')} variant="subtle" onClick={() => gridUi.download?.()} />
              )}
              {gridUi?.upload && <Button label={__('Upload')} variant="subtle" onClick={() => gridUi.upload?.()} />}
            </div>
            <input
              ref={csvInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(event) => void importRows(event)}
            />
          </div>
        )}

        {showGridRowFieldsModal && (
          <GridRowFieldsModal
            open={showGridRowFieldsModal}
            onOpenChange={setShowGridRowFieldsModal}
            doctype={doctype}
            parentDoctype={parentDoctype}
          />
        )}
        {showGridFieldsEditorModal && (
          <GridFieldsEditorModal
            open={showGridFieldsEditorModal}
            onOpenChange={setShowGridFieldsEditorModal}
            doctype={doctype}
            parentDoctype={parentDoctype}
          />
        )}
      </div>
    </FieldLayoutContext.Provider>
  )
}
