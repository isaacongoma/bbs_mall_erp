import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { rpc } from '@/core/api/rpc'
import { __ } from '@/core/i18n'
import { Button, DatePicker, Textarea, TextInput } from '@/design-system'
import { useHrmsEmployee } from '../stores/employeeStore'

type RequestKind = 'attendance' | 'shift' | 'leave'

const doctypes: Record<RequestKind, string> = {
  attendance: 'Attendance Request',
  shift: 'Shift Request',
  leave: 'Leave Application',
}

interface RequestFormProps {
  kind: RequestKind
}

export default function RequestForm({ kind }: RequestFormProps) {
  const navigate = useNavigate()
  const employee = useHrmsEmployee()
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [reason, setReason] = useState('')
  const [leaveType, setLeaveType] = useState('')
  const [shiftType, setShiftType] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const title =
    kind === 'attendance' ? __('Request Attendance') : kind === 'shift' ? __('Request a Shift') : __('Request a Leave')

  async function submit() {
    if (!employee?.name || !fromDate || !toDate || (kind === 'leave' && !leaveType)) {
      setError(__('Complete the required fields before submitting.'))
      return
    }
    if (toDate < fromDate) {
      setError(__('To Date cannot be before From Date'))
      return
    }
    setSaving(true)
    setError('')
    try {
      const fields: Record<string, unknown> = {
        employee: employee.name,
        from_date: fromDate,
        to_date: toDate,
      }
      if (kind === 'attendance') fields.reason = reason
      if (kind === 'shift') fields.shift_type = shiftType
      if (kind === 'leave') {
        fields.leave_type = leaveType
        fields.description = reason
      }
      await rpc({ url: 'frappe.client.insert', params: { doc: { doctype: doctypes[kind], ...fields } } })
      navigate(kind === 'leave' ? '/hrms/leaves' : '/hrms/attendance')
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : __('Unable to submit request'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4 sm:p-8">
      <div>
        <h1 className="text-2xl font-semibold text-ink-gray-9">{title}</h1>
        <p className="mt-2 text-sm text-ink-gray-6">{__('Submit a request for your employee profile.')}</p>
      </div>
      <section className="flex flex-col gap-5 rounded-xl border border-outline-gray-2 bg-surface-base p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <DatePicker label={__('From Date')} value={fromDate} onChange={setFromDate} required />
          <DatePicker label={__('To Date')} value={toDate} onChange={setToDate} required min={fromDate || undefined} />
        </div>
        {kind === 'leave' && <TextInput label={__('Leave Type')} value={leaveType} onChange={setLeaveType} required />}
        {kind === 'shift' && <TextInput label={__('Shift Type')} value={shiftType} onChange={setShiftType} required />}
        <Textarea
          label={kind === 'leave' ? __('Description') : __('Reason')}
          value={reason}
          onChange={setReason}
          rows={4}
        />
        {error && (
          <p className="rounded-lg bg-surface-red-2 p-3 text-sm text-ink-red-8" role="alert">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            {__('Cancel')}
          </Button>
          <Button variant="solid" loading={saving} loadingText={__('Submitting')} onClick={() => void submit()}>
            {__('Submit')}
          </Button>
        </div>
      </section>
    </main>
  )
}
