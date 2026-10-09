import { useState } from 'react'
import { useDocumentResource } from '@/core/resources'
import { __ } from '@/core/i18n'
import { Badge, Button, Dialog, Spinner } from '@/design-system'
import type { HrmsRequest } from '../types'

interface RequestDetailDialogProps {
  request: HrmsRequest | null
  onClose: () => void
  onChanged?: () => void
}

const fieldsByDoctype: Record<string, string[]> = {
  'Leave Application': [
    'name',
    'leave_type',
    'from_date',
    'to_date',
    'total_leave_days',
    'employee',
    'leave_balance',
    'status',
    'description',
  ],
  'Expense Claim': [
    'name',
    'posting_date',
    'employee',
    'total_claimed_amount',
    'total_sanctioned_amount',
    'status',
    'approval_status',
  ],
  'Attendance Request': [
    'name',
    'from_date',
    'to_date',
    'total_attendance_days',
    'include_holidays',
    'shift',
    'reason',
    'employee',
  ],
  'Shift Request': ['name', 'shift_type', 'from_date', 'to_date', 'employee', 'status'],
  'Shift Assignment': ['name', 'shift_type', 'start_date', 'end_date', 'shift_timing', 'employee'],
}

function label(field: string): string {
  return field
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function valueOf(document: Record<string, unknown>, request: Partial<HrmsRequest>, field: string): string {
  const value = document[field] ?? request[field]
  if (value === null || value === undefined || value === '') return ''
  if (typeof value === 'boolean') return value ? __('Yes') : __('No')
  return String(value)
}

export function RequestDetailDialog({ request, onClose, onChanged }: RequestDetailDialogProps) {
  const document = useDocumentResource({
    doctype: request?.doctype ?? '',
    name: request?.name ?? '',
    auto: Boolean(request),
  })
  const [loading, setLoading] = useState(false)
  const doc = (document?.doc ?? {}) as Record<string, unknown>
  const doctype = request?.doctype ?? ''
  const approvalField = doctype === 'Expense Claim' ? 'approval_status' : 'status'
  const status = valueOf(doc, request ?? {}, approvalField)
  const canApprove = ['Open', 'Draft'].includes(status)
  const canSubmit =
    doc.docstatus === 0 && (doctype === 'Attendance Request' || ['Approved', 'Rejected'].includes(status))
  const canCancel = doc.docstatus === 1

  async function update(values: Record<string, unknown>) {
    if (!document) return
    setLoading(true)
    try {
      await document.setValue.submit(values)
      onChanged?.()
      if (values.docstatus) onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog
      open={Boolean(request)}
      onOpenChange={(open) => !open && onClose()}
      title={doctype ? __(doctype) : ''}
      size="lg"
      actionsContent={() => (
        <div className="flex w-full gap-2">
          {canApprove && (
            <>
              <Button
                className="flex-1"
                variant="subtle"
                theme="red"
                loading={loading}
                onClick={() => void update({ [approvalField]: 'Rejected' })}
              >
                {__('Reject')}
              </Button>
              <Button
                className="flex-1"
                variant="solid"
                theme="green"
                loading={loading}
                onClick={() => void update({ [approvalField]: 'Approved' })}
              >
                {__('Approve')}
              </Button>
            </>
          )}
          {canSubmit && (
            <Button className="flex-1" variant="solid" loading={loading} onClick={() => void update({ docstatus: 1 })}>
              {__('Submit')}
            </Button>
          )}
          {canCancel && (
            <Button
              className="flex-1"
              variant="subtle"
              theme="red"
              loading={loading}
              onClick={() => void update({ docstatus: 2 })}
            >
              {__('Cancel')}
            </Button>
          )}
        </div>
      )}
    >
      {!request || !document || (document.get.loading && !document.doc) ? (
        <div className="flex justify-center py-10">
          <Spinner size="md" />
        </div>
      ) : (
        <div className="flex max-h-[65vh] flex-col gap-4 overflow-auto">
          {fieldsByDoctype[doctype]?.map((field) => {
            const value = valueOf(doc, request, field)
            return value ? (
              <div key={field} className="flex flex-col gap-1 border-b border-outline-gray-1 pb-3 last:border-b-0">
                <span className="text-sm text-ink-gray-6">{__(label(field))}</span>
                <span className="whitespace-pre-wrap text-base text-ink-gray-8">{value}</span>
              </div>
            ) : null
          })}
          {status && <Badge label={__(status)} variant="outline" />}
        </div>
      )}
    </Dialog>
  )
}
