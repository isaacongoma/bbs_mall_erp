import { useState } from 'react'
import { __ } from '@/core/i18n'
import { Button, Checkbox, SortableList } from '@/design-system'
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
      placeholder: field.placeholder || field.label,
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
    return processed.filter((field) => !field.hidden)
  })()

  const allFields = childMeta.getFields().map((field) => getFieldObj(field))

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

  function deleteRows() {
    const remaining = rows.filter((row) => !selectedRows.has(row.name))
    onRowsChange?.(remaining)
    void layout.triggerOnRowRemove(selectedRows, remaining)
    setSelectedRows(new Set())
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
                {__('Number')}
              </div>
              <div className="grid w-full truncate" style={{ gridTemplateColumns }}>
                {fields.map((field) => (
                  <div
                    key={field.fieldname}
                    className={`truncate border-r border-outline-gray-2 p-2 ${NUMERIC_TYPES.includes(field.fieldtype) ? 'text-right' : ''}`}
                    title={field.label}
                  >
                    {__(field.label)}
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
                onChange={(next) => onRowsChange?.(renumber(next))}
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
              <div className="flex flex-col items-center rounded p-5 text-sm text-ink-gray-5">{__('No Data')}</div>
            )}
          </div>
        )}

        {fields.length > 0 && (
          <div className="mt-2 flex flex-row gap-2">
            {selectedRows.size > 0 && <Button label={__('Delete')} variant="solid" theme="red" onClick={deleteRows} />}
            <Button label={__('Add Row')} onClick={addRow} />
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
