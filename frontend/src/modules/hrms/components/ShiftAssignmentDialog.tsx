import { useMemo, useState } from 'react'
import { rpc } from '@/core/api/rpc'
import { toErrorMessage } from '@/core/api/errors'
import { __ } from '@/core/i18n'
import { Button, Combobox, DatePicker, Dialog, Dropdown, ErrorMessage, Select, TextInput, toast } from '@/design-system'
import type { HrmsEmployee } from '../types'
import type { RosterShift } from '../stores/rosterStore'

interface ShiftAssignmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  assignment?: RosterShift | null
  selectedCell?: { employee: string; date: string }
  employees: HrmsEmployee[]
  shiftTypes: string[]
  shiftLocations: string[]
  onRefresh: () => void
}

interface FormState {
  employee: string
  employee_name: string
  company: string
  department: string
  shift_type: string
  shift_location: string
  start_date: string
  end_date: string
  status: string
  shift_schedule_assignment: string
}

const emptyForm: FormState = {
  employee: '',
  employee_name: '',
  company: '',
  department: '',
  shift_type: '',
  shift_location: '',
  start_date: '',
  end_date: '',
  status: 'Active',
  shift_schedule_assignment: '',
}

const repeatDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const frequencies = ['Every Week', 'Every 2 Weeks', 'Every 3 Weeks', 'Every 4 Weeks']

function initialForm(
  assignment: RosterShift | null | undefined,
  selectedCell?: { employee: string; date: string },
): FormState {
  if (assignment) {
    return {
      ...emptyForm,
      employee: assignment.employee,
      shift_type: assignment.shift_type ?? '',
      shift_location: assignment.shift_location ?? '',
      start_date: assignment.start_date ?? '',
      end_date: assignment.end_date ?? '',
      status: assignment.status ?? 'Active',
      shift_schedule_assignment: assignment.shift_schedule_assignment ?? '',
    }
  }
  return {
    ...emptyForm,
    employee: selectedCell?.employee ?? '',
    start_date: selectedCell?.date ?? '',
    end_date: selectedCell?.date ?? '',
  }
}

function ShiftAssignmentDialogContent({
  open,
  onOpenChange,
  assignment,
  selectedCell,
  employees,
  shiftTypes,
  shiftLocations,
  onRefresh,
}: ShiftAssignmentDialogProps) {
  const [form, setForm] = useState<FormState>(() => initialForm(assignment, selectedCell))
  const [days, setDays] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(repeatDays.map((day) => [day, false])),
  )
  const [frequency, setFrequency] = useState('Every Week')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [deleteAction, setDeleteAction] = useState<'shift' | 'assignment' | 'schedule' | null>(null)

  const selectedEmployee = useMemo(
    () => employees.find((employee) => employee.name === form.employee),
    [employees, form.employee],
  )
  const displayForm = useMemo(
    () => ({
      ...form,
      employee_name: selectedEmployee?.employee_name ?? form.employee_name,
      company: selectedEmployee?.company ?? form.company,
      department: selectedEmployee?.department ?? form.department,
    }),
    [form, selectedEmployee],
  )
  const scheduleVisible = Boolean(form.start_date && form.end_date && form.end_date > form.start_date)

  async function save() {
    if (!displayForm.employee || !displayForm.shift_type || !displayForm.start_date) {
      setError(__('Employee, Shift Type, and Start Date are required.'))
      return
    }
    if (displayForm.end_date && displayForm.end_date < displayForm.start_date) {
      setError(__('End Date cannot be before Start Date'))
      return
    }
    setSaving(true)
    setError('')
    try {
      if (assignment) {
        await rpc({
          url: 'frappe.client.set_value',
          params: {
            doctype: 'Shift Assignment',
            name: assignment.name,
            fieldname: 'status',
            value: displayForm.status,
          },
        })
        await rpc({
          url: 'frappe.client.set_value',
          params: {
            doctype: 'Shift Assignment',
            name: assignment.name,
            fieldname: 'end_date',
            value: displayForm.end_date || null,
          },
        })
        toast.success(__('Shift Assignment updated successfully!'))
      } else if (scheduleVisible && (Object.values(days).some((selected) => !selected) || frequency !== 'Every Week')) {
        await rpc({
          url: 'hrms.api.roster.create_shift_schedule_assignment',
          method: 'POST',
          params: {
            employee: displayForm.employee,
            company: displayForm.company,
            shift_type: displayForm.shift_type,
            shift_location: displayForm.shift_location || null,
            status: displayForm.status,
            start_date: displayForm.start_date,
            end_date: displayForm.end_date || null,
            repeat_on_days: repeatDays.filter((day) => days[day]),
            frequency,
          },
        })
        toast.success(__('Shift Schedule Assignment created successfully!'))
      } else {
        await rpc({
          url: 'hrms.api.roster.insert_shift',
          method: 'POST',
          params: {
            employee: displayForm.employee,
            company: displayForm.company,
            shift_type: displayForm.shift_type,
            shift_location: displayForm.shift_location || null,
            status: displayForm.status,
            start_date: displayForm.start_date,
            end_date: displayForm.end_date || null,
          },
        })
        toast.success(__('Shift Assignment created successfully!'))
      }
      onOpenChange(false)
      onRefresh()
    } catch (failure) {
      setError(toErrorMessage(failure))
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!assignment || !deleteAction) return
    setSaving(true)
    try {
      if (deleteAction === 'shift') {
        await rpc({
          url: 'hrms.api.roster.break_shift',
          method: 'POST',
          params: { assignment: assignment.name, date: selectedCell?.date },
        })
        toast.success(__('Shift deleted successfully!'))
      } else if (deleteAction === 'schedule') {
        await rpc({
          url: 'hrms.api.roster.delete_shift_schedule_assignment',
          method: 'POST',
          params: { shift_schedule_assignment: assignment.shift_schedule_assignment },
        })
        toast.success(__('Shift Schedule Assignment deleted successfully!'))
      } else {
        await rpc({
          url: 'frappe.client.set_value',
          params: { doctype: 'Shift Assignment', name: assignment.name, fieldname: 'docstatus', value: 2 },
        })
        await rpc({
          url: 'frappe.client.delete',
          method: 'POST',
          params: { doctype: 'Shift Assignment', name: assignment.name },
        })
        toast.success(__('Shift Assignment deleted successfully!'))
      }
      setDeleteAction(null)
      onOpenChange(false)
      onRefresh()
    } catch (failure) {
      setError(toErrorMessage(failure))
    } finally {
      setSaving(false)
    }
  }

  const title = assignment ? __('Shift Assignment {0}', [assignment.name]) : __('New Shift Assignment')
  const confirmTitle =
    deleteAction === 'shift'
      ? __('Delete Shift?')
      : deleteAction === 'schedule'
        ? __('Delete Shift Schedule Assignment?')
        : __('Delete Shift Assignment?')

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange} title={title} size="xl">
        <div className="grid gap-4 sm:grid-cols-2">
          <Combobox
            label={__('Employee')}
            value={form.employee}
            options={employees.map((employee) => ({
              label: `${employee.employee_name ?? employee.name} : ${employee.name}`,
              value: employee.name,
            }))}
            onChange={(value) => setForm((current) => ({ ...current, employee: String(value ?? '') }))}
            disabled={Boolean(assignment)}
            required
          />
          <TextInput label={__('Company')} value={displayForm.company} disabled />
          <TextInput label={__('Employee Name')} value={displayForm.employee_name} disabled />
          <TextInput label={__('Department')} value={displayForm.department} disabled />
          <Combobox
            label={__('Shift Type')}
            value={form.shift_type}
            options={shiftTypes}
            onChange={(value) => setForm((current) => ({ ...current, shift_type: String(value ?? '') }))}
            disabled={Boolean(assignment)}
            required
          />
          <Combobox
            label={__('Shift Location')}
            value={form.shift_location}
            options={shiftLocations}
            onChange={(value) => setForm((current) => ({ ...current, shift_location: String(value ?? '') }))}
            disabled={Boolean(assignment)}
          />
          <DatePicker
            label={__('Start Date')}
            value={form.start_date}
            onChange={(value) => setForm((current) => ({ ...current, start_date: value }))}
            disabled={Boolean(assignment)}
            required
          />
          <DatePicker
            label={__('End Date')}
            value={form.end_date}
            onChange={(value) => setForm((current) => ({ ...current, end_date: value }))}
            disabled={Boolean(assignment)}
          />
          <Select
            label={__('Status')}
            value={form.status}
            options={['Active', 'Inactive']}
            onChange={(value) => setForm((current) => ({ ...current, status: String(value ?? '') }))}
          />
        </div>
        {scheduleVisible && !assignment && (
          <div className="mt-6 flex flex-col gap-4 border-t border-outline-gray-2 pt-5">
            <h3 className="font-semibold text-ink-gray-8">{__('Schedule Settings')}</h3>
            <div className="flex flex-wrap gap-1">
              {repeatDays.map((day) => (
                <button
                  key={day}
                  type="button"
                  className={`rounded border px-2 py-1 text-xs ${days[day] ? 'bg-surface-gray-3 text-ink-gray-8' : 'text-ink-gray-5'}`}
                  onClick={() => setDays((current) => ({ ...current, [day]: !current[day] }))}
                >
                  {__(day.slice(0, 3))}
                </button>
              ))}
            </div>
            <Select
              label={__('Frequency')}
              value={frequency}
              options={frequencies}
              onChange={(value) => setFrequency(String(value ?? ''))}
            />
          </div>
        )}
        <ErrorMessage className="mt-4" message={error} />
        <div className="mt-6 flex flex-wrap justify-between gap-2 border-t border-outline-gray-2 pt-5">
          <div>
            {assignment && (
              <Dropdown
                button={{ label: __('Delete'), variant: 'outline', theme: 'red' }}
                options={[
                  { label: __('Shift for {0}', [selectedCell?.date ?? '']), onClick: () => setDeleteAction('shift') },
                  { label: __('All Consecutive Shifts'), onClick: () => setDeleteAction('assignment') },
                  ...(assignment.shift_schedule_assignment
                    ? [{ label: __('Shift Schedule Assignment'), onClick: () => setDeleteAction('schedule') }]
                    : []),
                ]}
              />
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              {__('Cancel')}
            </Button>
            <Button variant="solid" loading={saving} loadingText={__('Saving')} onClick={() => void save()}>
              {assignment ? __('Update') : __('Submit')}
            </Button>
          </div>
        </div>
      </Dialog>
      <Dialog
        open={Boolean(deleteAction)}
        onOpenChange={(value) => !value && setDeleteAction(null)}
        title={confirmTitle}
        actions={[
          { label: __('Confirm'), variant: 'solid', theme: 'red', loading: saving, onClick: () => void remove() },
        ]}
      >
        <p className="text-sm text-ink-gray-7">{__('This action cannot be undone.')}</p>
      </Dialog>
    </>
  )
}

export function ShiftAssignmentDialog(props: ShiftAssignmentDialogProps) {
  if (!props.open) return null
  return <ShiftAssignmentDialogContent {...props} />
}
