import { useMemo, useState } from 'react'
import { rpc } from '@/core/api/rpc'
import { useRoute } from '@/core/navigation'
import { __ } from '@/core/i18n'
import { Button, ErrorMessage, FormControl, Spinner, usePageMeta } from '@/design-system'
import { LayoutHeader } from '@/shared/components/LayoutHeader'

type AnyRecord = Record<string, any>

interface ToolConfig {
  title: string
  doctype: string
  employeeMethod: string
  actionMethod: string
  staticEmployeeMethod?: boolean
  actionLabel: string
  initial: AnyRecord
}

interface EmployeeRow {
  name?: string
  employee?: string
  employee_name?: string
  department?: string
  branch?: string
  company?: string
  shift_type?: string
  start_date?: string
  end_date?: string
  status?: string
  shift?: string
}

function message(value: unknown): unknown {
  if (value && typeof value === 'object' && 'message' in (value as object)) return (value as AnyRecord).message
  return value
}

function configFor(tool: string): ToolConfig {
  if (tool === 'leave-control-panel') {
    return { title: __('Leave Control Panel'), doctype: 'Leave Control Panel', employeeMethod: 'get_employees', actionMethod: 'allocate_leave', actionLabel: __('Allocate Leave'), initial: { dates_based_on: 'Custom Range', carry_forward: 1, no_of_days: 0 } }
  }
  if (tool === 'shift-assignment-tool') {
    return { title: __('Shift Assignment Tool'), doctype: 'Shift Assignment Tool', employeeMethod: 'get_employees', actionMethod: 'bulk_assign', actionLabel: __('Assign Shift'), initial: { action: 'Assign Shift', status: 'Active' } }
  }
  if (tool === 'bulk-salary-structure-assignment') {
    return { title: __('Bulk Salary Structure Assignment'), doctype: 'Bulk Salary Structure Assignment', employeeMethod: 'get_employees', actionMethod: 'bulk_assign_structure', actionLabel: __('Assign Structure'), initial: {} }
  }
  return { title: __('Employee Attendance Tool'), doctype: 'Employee Attendance Tool', employeeMethod: 'hrms.hr.doctype.employee_attendance_tool.employee_attendance_tool.get_employees', actionMethod: 'hrms.hr.doctype.employee_attendance_tool.employee_attendance_tool.mark_employee_attendance', staticEmployeeMethod: true, actionLabel: __('Mark Attendance'), initial: { date: new Date().toISOString().slice(0, 10), status: 'Present', late_entry: 0, early_exit: 0 } }
}

export default function HrmsBulkToolPage() {
  const route = useRoute()
  const config = useMemo(() => configFor(String(route.params.tool ?? 'employee-attendance-tool')), [route.params.tool])
  const [values, setValues] = useState<AnyRecord>(config.initial)
  const [rows, setRows] = useState<EmployeeRow[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  usePageMeta({ title: config.title })

  function update(field: string, value: unknown) {
    setValues((current) => ({ ...current, [field]: value }))
  }

  function documentPayload() {
    return { doctype: config.doctype, ...values }
  }

  async function loadEmployees() {
    setLoading(true)
    setError(null)
    try {
      const response = config.staticEmployeeMethod
        ? await rpc({ url: config.employeeMethod, params: values })
        : await rpc({ url: 'run_doc_method', method: 'POST', params: { method: config.employeeMethod, docs: JSON.stringify(documentPayload()), args: JSON.stringify({ advanced_filters: [] }) } })
      const value = message(response)
      const list = config.staticEmployeeMethod && value && typeof value === 'object' && !Array.isArray(value)
        ? ((value as AnyRecord).unmarked ?? [])
        : Array.isArray(value) ? value : []
      setRows(list as EmployeeRow[])
      setSelected(new Set())
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure))
    } finally {
      setLoading(false)
    }
  }

  async function execute() {
    const employees = [...selected]
    if (!employees.length) {
      setError(__('Select at least one employee'))
      return
    }
    setBusy(true)
    setError(null)
    try {
      const args = config.doctype === 'Employee Attendance Tool'
        ? { employee_list: employees, status: values.status, date: values.date, late_entry: values.late_entry, early_exit: values.early_exit, shift: values.shift }
        : config.doctype === 'Shift Assignment Tool'
          ? { employees }
          : config.doctype === 'Bulk Salary Structure Assignment'
            ? { employees }
            : { employees }
      await rpc({ url: config.staticEmployeeMethod ? config.actionMethod : 'run_doc_method', method: 'POST', params: config.staticEmployeeMethod ? args : { method: config.actionMethod, docs: JSON.stringify(documentPayload()), args: JSON.stringify(args) } })
      await loadEmployees()
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure))
    } finally {
      setBusy(false)
    }
  }

  function toggle(name: string, checked: boolean) {
    setSelected((current) => {
      const next = new Set(current)
      if (checked) next.add(name)
      else next.delete(name)
      return next
    })
  }

  const filterFields: Array<[string, string, 'date' | 'text']> = config.doctype === 'Employee Attendance Tool'
    ? [['date', __('Date'), 'date'], ['company', __('Company'), 'text'], ['department', __('Department'), 'text'], ['shift', __('Shift'), 'text']]
    : [['company', __('Company'), 'text'], ['from_date', __('From Date'), 'date'], ['to_date', __('To Date'), 'date'], ['department', __('Department'), 'text']]

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <LayoutHeader left={<h1 className="text-base-medium text-ink-gray-9">{config.title}</h1>} right={<Button variant="solid" label={__('Get Employees')} loading={loading} onClick={() => void loadEmployees()} />} />
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-auto p-4 sm:p-8">
        <section className="grid gap-4 rounded-xl border border-outline-gray-2 bg-surface-base p-4 sm:grid-cols-2 lg:grid-cols-4">
          {filterFields.map(([field, label, type]) => <FormControl key={field} type={type} label={label} value={values[field] ?? ''} onChange={(value: unknown) => update(field, value)} />)}
          {config.doctype === 'Employee Attendance Tool' && <FormControl type="select" label={__('Status')} value={values.status ?? ''} options={['Present', 'Absent', 'Work From Home'].map((value) => ({ label: __(value), value }))} onChange={(value: unknown) => update('status', value)} />}
          {config.doctype === 'Leave Control Panel' && <FormControl type="text" label={__('Leave Type')} value={values.leave_type ?? ''} onChange={(value: unknown) => update('leave_type', value)} />}
          {config.doctype === 'Shift Assignment Tool' && <FormControl type="text" label={__('Shift Type')} value={values.shift_type ?? ''} onChange={(value: unknown) => update('shift_type', value)} />}
        </section>
        {error && <ErrorMessage message={error} />}
        <section className="min-h-0 overflow-auto rounded-xl border border-outline-gray-2 bg-surface-base">
          {loading ? <div className="flex justify-center p-10"><Spinner size="md" /></div> : rows.length ? <table className="w-full text-left text-sm"><thead className="bg-surface-gray-1 text-ink-gray-6"><tr><th className="w-12 px-3 py-2"><FormControl type="checkbox" value={selected.size === rows.length} onChange={(checked: boolean) => setSelected(checked ? new Set(rows.map((row) => String(row.employee ?? row.name ?? ''))) : new Set())} /></th><th className="px-3 py-2">{__('Employee')}</th><th className="px-3 py-2">{__('Name')}</th><th className="px-3 py-2">{__('Department')}</th><th className="px-3 py-2">{__('Branch')}</th></tr></thead><tbody>{rows.map((row) => { const name = String(row.employee ?? row.name ?? ''); return <tr key={name} className="border-t border-outline-gray-1"><td className="px-3 py-2"><FormControl type="checkbox" value={selected.has(name)} onChange={(checked: boolean) => toggle(name, checked)} /></td><td className="px-3 py-2 text-ink-blue-6">{name}</td><td className="px-3 py-2 text-ink-gray-8">{String(row.employee_name ?? '')}</td><td className="px-3 py-2 text-ink-gray-7">{String(row.department ?? '')}</td><td className="px-3 py-2 text-ink-gray-7">{String(row.branch ?? '')}</td></tr> })}</tbody></table> : <div className="p-10 text-center text-sm text-ink-gray-5">{__('Choose filters and get employees to begin')}</div>}
        </section>
        <div className="flex justify-end"><Button variant="solid" label={`${config.actionLabel} (${selected.size})`} loading={busy} disabled={!selected.size} onClick={() => void execute()} /></div>
      </div>
    </main>
  )
}
