import { useRef, useState } from 'react'
import { rpc } from '@/core/api/rpc'
import { __ } from '@/core/i18n'
import { useResource } from '@/core/resources'
import { capture } from '@/core/telemetry'
import {
  Button,
  Combobox,
  DatePicker,
  Dialog,
  ErrorMessage,
  FormControl,
  toast,
  type ComboboxSelectableOption,
} from '@/design-system'
import { createDocument } from '../utils/documents'
import { CommitTextarea } from './Controls/CommitInput'
import { Link, type LinkHandle } from './Controls/Link'
import { TextEditorControl } from './Controls/TextEditorControl'

type AnyRecord = Record<string, any>

export interface EditValueModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  doctype: string
  selectedValues: Set<string>
  isLostStatus?: (doctype: string, status: string) => boolean
  onReload?: () => void
}

interface BulkField extends ComboboxSelectableOption {
  label: string
  fieldtype: string
  fieldname: string
  options?: string
  value: string
}

const EMPTY_FIELD: BulkField = { label: '', fieldtype: '', fieldname: '', options: '', value: '' }

function ValueControl({
  field,
  value,
  onChange,
}: {
  field: BulkField
  value: any
  onChange: (value: unknown) => void
}) {
  const { fieldtype, options } = field
  if (fieldtype === 'Select' || fieldtype === 'Check') {
    const choices = fieldtype === 'Check' ? ['Yes', 'No'] : (options ?? '').split('\n')
    return (
      <FormControl
        type="select"
        size="md"
        value={value ?? ''}
        options={choices.map((choice) => ({ label: choice, value: choice }))}
        onChange={(next: unknown) => onChange(next)}
      />
    )
  }
  if (['Link', 'Dynamic Link'].includes(fieldtype)) {
    if (fieldtype === 'Dynamic Link') {
      return <FormControl type="text" size="md" value={value ?? ''} onChange={(next: string) => onChange(next)} />
    }
    return <Link className="form-control" doctype={options ?? ''} size="md" value={value} onChange={onChange} />
  }
  if (['Float', 'Int', 'Currency', 'Percent'].includes(fieldtype)) {
    return <FormControl type="number" size="md" value={value ?? ''} onChange={(next: string) => onChange(next)} />
  }
  if (['Date', 'Datetime'].includes(fieldtype)) {
    return <DatePicker value={value ?? ''} onChange={(next) => onChange(next)} />
  }
  if (fieldtype === 'Text Editor') {
    return (
      <TextEditorControl
        variant="outline"
        editorClass="!prose-sm overflow-auto min-h-[80px] max-h-80 py-1.5 px-2 rounded border border-outline-gray-2 bg-surface-base hover:border-outline-gray-3 hover:shadow-sm focus:bg-surface-base focus:border-outline-gray-4 focus:ring-0 focus-visible:ring-2 focus-visible:ring-outline-gray-3 text-ink-gray-8 transition-colors"
        fixedMenu={false}
        bubbleMenu
        value={value ?? ''}
        onChange={(next) => onChange(next)}
      />
    )
  }
  return <FormControl type="text" size="md" value={value ?? ''} onChange={(next: string) => onChange(next)} />
}

export function EditValueModal({
  open,
  onOpenChange,
  doctype,
  selectedValues,
  isLostStatus,
  onReload,
}: EditValueModalProps) {
  const fields = useResource<BulkField[], AnyRecord[]>({
    url: 'crm.api.doc.get_fields',
    cache: ['fields', doctype],
    params: { doctype },
    auto: true,
    transform: (data) =>
      data
        .filter((field) => field.hidden == 0 && field.read_only == 0)
        .map(({ description: _description, ...field }) => ({ ...field, value: field.fieldname }) as BulkField),
  })

  const [field, setField] = useState<BulkField>(EMPTY_FIELD)
  const [newValue, setNewValue] = useState<any>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [lostReason, setLostReason] = useState('')
  const [lostNotes, setLostNotes] = useState('')
  const lostReasonLink = useRef<LinkHandle>(null)

  const recordCount = selectedValues?.size || 0
  const lostStatus =
    field.fieldname === 'status' && Boolean(newValue) && Boolean(isLostStatus?.(doctype, String(newValue)))

  function changeField(next: BulkField | null) {
    setNewValue('')
    setLostReason('')
    setLostNotes('')
    setError('')
    if (next) setField(next)
  }

  function updateValue(raw: unknown) {
    const value =
      raw !== null && typeof raw === 'object' && 'target' in raw
        ? (raw as { target: { value: unknown } }).target.value
        : raw
    setNewValue(value)
  }

  function onCreateLostReason(value: string, close: () => void) {
    void createDocument('CRM Lost Reason', { lost_reason: value }, close, (created: { name: string }) => {
      setLostReason(created.name)
      lostReasonLink.current?.reload()
    })
  }

  async function updateValues() {
    setError('')
    let fieldValue = newValue
    if (field.fieldtype === 'Check') fieldValue = fieldValue === 'Yes' ? 1 : 0

    const data: AnyRecord = { [field.fieldname]: fieldValue || null }
    if (lostStatus) {
      if (!lostReason) {
        setError(__('Lost Reason is required'))
        return
      }
      if (lostReason === 'Other' && !lostNotes) {
        setError(__('Lost Notes are required when Lost Reason is "Other"'))
        return
      }
      data.lost_reason = lostReason
      data.lost_notes = lostNotes
    }

    setLoading(true)
    try {
      const failed = await rpc<string[] | null>({
        url: 'frappe.desk.doctype.bulk_update.bulk_update.submit_cancel_or_update_docs',
        params: { doctype, docnames: Array.from(selectedValues), action: 'update', data },
      })
      if (Array.isArray(failed) && failed.length) {
        setError(__('Failed to update {0} record(s): {1}', [failed.length, failed.join(', ')]))
        onReload?.()
        return
      }
      setField(EMPTY_FIELD)
      setNewValue('')
      setLostReason('')
      setLostNotes('')
      onOpenChange(false)
      capture('bulk_update', { doctype })
      onReload?.()
      if (!Array.isArray(failed)) {
        toast.info(__('Bulk operation is enqueued in background. Failures, if any, are recorded in Error Log.'))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={__('Bulk Edit')}
      actionsContent={() => (
        <Button
          className="w-full"
          variant="solid"
          loading={loading}
          label={__('Update {0} Records', [recordCount])}
          onClick={() => void updateValues()}
        />
      )}
    >
      <div className="mb-4">
        <div className="mb-1.5 text-sm text-ink-gray-5">{__('Field')}</div>
        <Combobox
          className="w-full"
          trigger="button"
          value={field.fieldname || null}
          options={fields.data ?? []}
          placeholder={__('Source')}
          onSelectedOptionChange={(option) => {
            if (option && option.type !== 'custom') changeField(option as unknown as BulkField)
          }}
        />
      </div>
      <div>
        <div className="mb-1.5 text-sm text-ink-gray-5">{__('Value')}</div>
        <ValueControl field={field} value={newValue} onChange={updateValue} />
      </div>
      {lostStatus && (
        <>
          <div className="mt-4">
            <div className="mb-1.5 text-sm text-ink-gray-5">
              {__('Lost Reason')}
              <span className="text-ink-red-5">*</span>
            </div>
            <Link
              handleRef={lostReasonLink}
              className="form-control flex-1 truncate"
              value={lostReason}
              doctype="CRM Lost Reason"
              onCreate={onCreateLostReason}
              onChange={setLostReason}
            />
          </div>
          <div className="mt-4">
            <div className="mb-1.5 text-sm text-ink-gray-5">
              {__('Lost Notes')}
              {lostReason === 'Other' && <span className="text-ink-red-5">*</span>}
            </div>
            <CommitTextarea className="form-control flex-1 truncate" value={lostNotes} onCommit={setLostNotes} />
          </div>
        </>
      )}
      {error && <ErrorMessage className="mt-4" message={error} />}
    </Dialog>
  )
}
