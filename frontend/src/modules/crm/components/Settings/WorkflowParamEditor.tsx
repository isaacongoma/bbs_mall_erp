import { useState } from 'react'
import { __ } from '@/core/i18n'
import { Button, Combobox, FormControl, Tooltip } from '@/design-system'
import { Link } from '@/shared/components/Controls/Link'
import {
  formatJsonFieldValue,
  paramsToRows,
  parseJsonFieldInput,
  rowsToParams,
  type ParamRow,
} from '../../utils/workflowParams'
import { WorkflowFieldToken } from './WorkflowFieldToken'
import { WorkflowUserPicker } from './WorkflowUserPicker'

type AnyRecord = Record<string, any>

export interface WorkflowParamEditorProps {
  action: AnyRecord
  schema: AnyRecord | null
  doctype?: string
  fields: AnyRecord[]
  advanced?: boolean
  onParams: (params: AnyRecord) => void
}

const NUMERIC_FIELDTYPES = ['Int', 'Float', 'Currency', 'Percent']
const CHOICE_FIELDTYPES = ['Select', 'Check']
const TEMPLATE_FIELDTYPES = ['Data', 'Small Text', 'Text', 'Text Editor', 'JSON']
const VALUES_FIELD = { fieldname: 'values', fieldtype: 'JSON' }
const FIELD_VALUES_PLACEHOLDER = '{\n  "status": "Junk"\n}'

function parseParams(action: AnyRecord): AnyRecord {
  try {
    return JSON.parse(action.params || '{}')
  } catch {
    return {}
  }
}

export function WorkflowParamEditor({
  action,
  schema,
  doctype = '',
  fields,
  advanced = false,
  onParams,
}: WorkflowParamEditorProps) {
  const params = parseParams(action)
  const isSetFieldValue = action.action_type === 'SetFieldValue'
  const isIncrement = action.action_type === 'IncrementFieldValue'
  const paramsSchema: AnyRecord[] = schema?.params_schema || []
  const [rows, setRows] = useState<ParamRow[]>(() => paramsToRows(params))

  const standIns: Record<string, string[]> = {}
  paramsSchema.forEach((field) => {
    if (!field.exclusive_with) return
    ;(standIns[field.fieldname] ||= []).push(field.exclusive_with)
    ;(standIns[field.exclusive_with] ||= []).push(field.fieldname)
  })

  const isInSchema = (fieldname: string) => paramsSchema.some((field) => field.fieldname === fieldname)
  const isFilled = (fieldname: string) => {
    const value = params[fieldname]
    return value !== undefined && value !== null && value !== ''
  }
  const appliesHere = (field: AnyRecord) =>
    Object.entries(field.visible_when || {}).every(([other, wanted]) => {
      const value = params[other]
      return Array.isArray(wanted) ? wanted.includes(value) : value === wanted
    })
  const isShown = (field: AnyRecord) => {
    const givenWay = (standIns[field.fieldname] || []).some((other) => isInSchema(other) && isFilled(other))
    return !givenWay && appliesHere(field)
  }
  const schemaFields = paramsSchema.filter(isShown)

  const docFieldOptions = fields.map((field) => ({
    label: field.label || field.fieldname,
    value: field.fieldname,
    fieldtype: field.fieldtype,
  }))

  function optionsFor(field: AnyRecord): { label: string; value: string }[] {
    if (field.options_source === 'doc_fields') {
      return isIncrement
        ? docFieldOptions.filter((option) => NUMERIC_FIELDTYPES.includes(option.fieldtype))
        : docFieldOptions
    }
    return String(field.options || '')
      .split('\n')
      .filter(Boolean)
      .map((option) => ({ label: option, value: option }))
  }

  function setParam(fieldname: string, value: unknown) {
    const next = { ...params, [fieldname]: value }
    if (value) (standIns[fieldname] || []).forEach((other) => delete next[other])
    onParams(next)
  }

  function commitRows(next: ParamRow[]) {
    setRows(next)
    onParams({ ...params, ...rowsToParams(next) })
  }

  function setRow(index: number, key: 'field' | 'value', value: unknown) {
    commitRows(
      rows.map((row, position) => {
        if (position !== index) return { ...row }
        return key === 'field' ? { field: String(value), value: '' } : { ...row, [key]: value }
      }),
    )
  }

  const fieldFor = (row: ParamRow) => fields.find((field) => field.fieldname === row.field)

  function choicesFor(row: ParamRow): { label: string; value: string }[] {
    const field = fieldFor(row)
    if (!field || !CHOICE_FIELDTYPES.includes(field.fieldtype)) return []
    if (field.fieldtype === 'Check') {
      return [
        { label: __('Yes'), value: '1' },
        { label: __('No'), value: '0' },
      ]
    }
    return String(field.options || '')
      .split('\n')
      .filter(Boolean)
      .map((option) => ({ label: option, value: option }))
  }

  const isPicked = (row: ParamRow) => fieldFor(row)?.fieldtype === 'Link' || choicesFor(row).length > 0

  function availableFieldOptions(current: string) {
    const taken = rows.map((row) => row.field).filter((field) => field !== current)
    return docFieldOptions.filter((option) => !taken.includes(option.value))
  }

  function appendRowToken(index: number, token: string) {
    const current = rows[index]?.value
    setRow(index, 'value', `${typeof current === 'string' ? current : ''}${token}`)
  }

  function valueFor(field: AnyRecord): any {
    const value = params[field.fieldname]
    if (field.fieldtype === 'JSON') return formatJsonFieldValue(value)
    return Array.isArray(value) ? value.join(', ') : value
  }

  function controlType(field: AnyRecord): 'textarea' | 'number' | 'text' {
    if (['JSON', 'Text Editor'].includes(field.fieldtype)) return 'textarea'
    if (NUMERIC_FIELDTYPES.includes(field.fieldtype)) return 'number'
    return 'text'
  }

  function castValue(field: AnyRecord, value: string): unknown {
    if (field.fieldtype === 'JSON') return parseJsonFieldInput(value)
    if (controlType(field) === 'number') return value === '' ? null : Number(value)
    return value
  }

  function appendToken(field: AnyRecord, token: string) {
    const current = params[field.fieldname]
    setParam(field.fieldname, `${typeof current === 'string' ? current : ''}${token}`)
  }

  function appendValuesToken(token: string) {
    const current = params.values
    const text = current && typeof current === 'object' ? JSON.stringify(current, null, 2) : String(current || '')
    setParam('values', `${text}${token}`)
  }

  const isTemplate = (field: AnyRecord) => String(params[field.fieldname] || '').includes('{{')
  const acceptsTemplate = (field: AnyRecord) => TEMPLATE_FIELDTYPES.includes(field.fieldtype)

  const fieldValuesHelp = __(
    'Set more fields at once as JSON. These are applied together with the Field and Value above, in the same save.',
  )

  return (
    <div className="space-y-4">
      {isSetFieldValue && !advanced ? (
        <div className="space-y-3">
          {rows.map((row, index) => {
            const field = fieldFor(row)
            return (
              <div key={index} className="space-y-1.5 rounded border border-outline-gray-2 p-2">
                <div className="flex items-center gap-2">
                  <Combobox
                    className="flex-1"
                    variant="outline"
                    value={row.field}
                    options={availableFieldOptions(row.field)}
                    placeholder={__('Choose field')}
                    onChange={(value) => setRow(index, 'field', value ?? '')}
                  />
                  {rows.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      icon="lucide-trash-2"
                      aria-label={__('Remove field')}
                      onClick={() => commitRows(rows.filter((_, position) => position !== index))}
                    />
                  )}
                </div>
                {field?.fieldtype === 'Link' ? (
                  <Link
                    variant="outline"
                    value={String(row.value ?? '')}
                    doctype={field.options}
                    placeholder={__('Choose {0}', [field.options])}
                    onChange={(value) => setRow(index, 'value', value)}
                  />
                ) : choicesFor(row).length ? (
                  <Combobox
                    variant="outline"
                    value={String(row.value ?? '')}
                    options={choicesFor(row)}
                    placeholder={__('Choose value')}
                    onChange={(value) => setRow(index, 'value', value ?? '')}
                  />
                ) : (
                  <FormControl
                    variant="outline"
                    value={String(row.value ?? '')}
                    placeholder={__('Value')}
                    onChange={(value: string) => setRow(index, 'value', value)}
                  />
                )}
                {!isPicked(row) && (
                  <div className="flex justify-end">
                    <WorkflowFieldToken fields={fields} onInsert={(token) => appendRowToken(index, token)} />
                  </div>
                )}
              </div>
            )
          })}
          <Button
            variant="ghost"
            size="sm"
            iconLeft="lucide-plus"
            label={__('Add field')}
            disabled={!rows[rows.length - 1]?.field}
            onClick={() => commitRows([...rows, { field: '', value: '' }])}
          />
        </div>
      ) : isSetFieldValue && advanced ? (
        <div>
          <div className="mb-1.5 flex items-center gap-1.5">
            <label className="block text-sm text-ink-gray-5">{__('Field Values')}</label>
            <Tooltip text={fieldValuesHelp}>
              <span className="lucide-circle-help size-3.5 text-ink-gray-5" aria-hidden="true" />
            </Tooltip>
          </div>
          <FormControl
            type="textarea"
            variant="outline"
            placeholder={FIELD_VALUES_PLACEHOLDER}
            value={valueFor(VALUES_FIELD) ?? ''}
            onChange={(value: string) => setParam('values', parseJsonFieldInput(value))}
          />
          <div className="mt-1 flex justify-end">
            <WorkflowFieldToken fields={fields} onInsert={appendValuesToken} />
          </div>
        </div>
      ) : (
        schemaFields.map((field) => {
          if (field.control === 'users') {
            const current = params[field.fieldname]
            return (
              <WorkflowUserPicker
                key={field.fieldname}
                value={Array.isArray(current) ? current : current ? [current] : []}
                actionType={action.action_type}
                fieldname={field.fieldname}
                doctype={doctype}
                params={action.params}
                label={field.label}
                required={Boolean(field.reqd)}
                onChange={(value) => setParam(field.fieldname, value)}
              />
            )
          }
          if (field.fieldtype === 'Link') {
            return (
              <div key={field.fieldname}>
                {isTemplate(field) ? (
                  <FormControl
                    type="text"
                    variant="outline"
                    label={field.label}
                    required={Boolean(field.reqd)}
                    placeholder={__('Clear to pick a record instead')}
                    value={params[field.fieldname] ?? ''}
                    onChange={(value: string) => setParam(field.fieldname, value)}
                  />
                ) : (
                  <Link
                    value={params[field.fieldname]}
                    doctype={field.options}
                    filters={field.link_filters || {}}
                    label={field.label}
                    required={Boolean(field.reqd)}
                    variant="outline"
                    onChange={(value) => setParam(field.fieldname, value)}
                  />
                )}
                {field.templatable && (
                  <div className="mt-1 flex justify-end">
                    <WorkflowFieldToken fields={fields} onInsert={(token) => appendToken(field, token)} />
                  </div>
                )}
              </div>
            )
          }
          if (field.fieldtype === 'Select') {
            return (
              <FormControl
                key={field.fieldname}
                type="select"
                variant="outline"
                label={field.label}
                required={Boolean(field.reqd)}
                options={optionsFor(field)}
                value={params[field.fieldname] ?? ''}
                onChange={(value: string) => setParam(field.fieldname, value)}
              />
            )
          }
          return (
            <div key={field.fieldname}>
              <FormControl
                type={controlType(field) as 'text'}
                label={field.label}
                required={Boolean(field.reqd)}
                variant="outline"
                value={valueFor(field) ?? ''}
                onChange={(value: string) => setParam(field.fieldname, castValue(field, value))}
              />
              {acceptsTemplate(field) && (
                <div className="mt-1 flex justify-end">
                  <WorkflowFieldToken fields={fields} onInsert={(token) => appendToken(field, token)} />
                </div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}
