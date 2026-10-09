import { useMemo, useState } from 'react'
import { rpc } from '@/core/api/rpc'
import { toErrorMessage } from '@/core/api/errors'
import { __ } from '@/core/i18n'
import { dayjsLocal } from '@/core/datetime'
import { Button, Combobox, LucideIcon, Spinner, TextInput, toast } from '@/design-system'
import { ShiftAssignmentDialog } from '../components/ShiftAssignmentDialog'
import {
  useRosterDefaultCompany,
  useRosterEmployees,
  useRosterEvents,
  useRosterFilterOptions,
  type RosterFilters,
  type RosterShift,
} from '../stores/rosterStore'

const colors: Record<string, string> = {
  blue: 'border-outline-blue-3 bg-surface-blue-2 text-ink-blue-8',
  cyan: 'border-outline-cyan-3 bg-surface-cyan-2 text-ink-cyan-8',
  fuchsia: 'border-outline-fuchsia-3 bg-surface-fuchsia-2 text-ink-fuchsia-8',
  green: 'border-outline-green-3 bg-surface-green-2 text-ink-green-8',
  lime: 'border-outline-lime-3 bg-surface-lime-2 text-ink-lime-8',
  orange: 'border-outline-orange-3 bg-surface-orange-2 text-ink-orange-8',
  pink: 'border-outline-pink-3 bg-surface-pink-2 text-ink-pink-8',
  red: 'border-outline-red-3 bg-surface-red-2 text-ink-red-8',
  violet: 'border-outline-violet-3 bg-surface-violet-2 text-ink-violet-8',
  yellow: 'border-outline-yellow-3 bg-surface-yellow-2 text-ink-yellow-8',
}

export default function Roster() {
  const [month, setMonth] = useState(dayjsLocal().format('YYYY-MM'))
  const [filters, setFilters] = useState<RosterFilters>({ status: 'Active' })
  const [shiftFilters, setShiftFilters] = useState({ shift_type: '', shift_location: '' })
  const [employeeSearch, setEmployeeSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedAssignment, setSelectedAssignment] = useState<RosterShift | null>(null)
  const [selectedCell, setSelectedCell] = useState({ employee: '', date: '' })
  const [dragged, setDragged] = useState<{ shift: RosterShift; employee: string; date: string } | null>(null)
  const [dragError, setDragError] = useState('')
  const first = dayjsLocal(`${month}-01`)
  const days = useMemo(() => Array.from({ length: first.daysInMonth() }, (_, index) => first.date(index + 1)), [first])
  const defaultCompany = useRosterDefaultCompany()
  const companyOptions = useRosterFilterOptions('Company')
  const departmentOptions = useRosterFilterOptions('Department', filters.company ? { company: filters.company } : {})
  const branchOptions = useRosterFilterOptions('Branch')
  const designationOptions = useRosterFilterOptions('Designation')
  const shiftTypeOptions = useRosterFilterOptions('Shift Type')
  const shiftLocationOptions = useRosterFilterOptions('Shift Location')
  const employeeFilters = { ...filters, company: filters.company || defaultCompany.company }
  const employees = useRosterEmployees(employeeFilters)
  const events = useRosterEvents(month, employeeFilters, shiftFilters)
  const visibleEmployees = employees.employees.filter((employee) => {
    const query = employeeSearch.trim().toLowerCase()
    return !query || `${employee.name} ${employee.employee_name ?? ''}`.toLowerCase().includes(query)
  })

  function updateFilter(field: keyof RosterFilters, value: string) {
    setFilters((current) => ({ ...current, [field]: value || undefined }))
    if (field === 'company')
      setFilters((current) => ({ ...current, department: undefined, [field]: value || undefined }))
  }

  async function moveShift(targetEmployee: string, targetDate: string, targetShift?: RosterShift) {
    if (!dragged || (dragged.employee === targetEmployee && dragged.date === targetDate)) return
    setDragError('')
    try {
      await rpc({
        url: 'hrms.api.roster.swap_shift',
        method: 'POST',
        params: {
          src_shift: dragged.shift.name,
          src_date: dragged.date,
          tgt_employee: targetEmployee,
          tgt_date: targetDate,
          tgt_shift: targetShift?.name ?? null,
        },
      })
      toast.success(__(targetShift ? 'Shift swapped successfully!' : 'Shift moved successfully!'))
      void events.resource.reload()
    } catch (failure) {
      setDragError(toErrorMessage(failure))
    } finally {
      setDragged(null)
    }
  }

  function openCreate(employee: string, date: string) {
    setSelectedAssignment(null)
    setSelectedCell({ employee, date })
    setDialogOpen(true)
  }

  return (
    <main className="flex w-full flex-col gap-6 p-4 sm:p-8">
      <div className="flex flex-wrap items-center gap-3">
        <LucideIcon name="calendar" className="size-6 text-ink-gray-5" />
        <h1 className="text-2xl font-semibold text-ink-gray-9">{__('Roster: Month View')}</h1>
        <Button className="ml-auto" variant="solid" iconLeft="lucide-plus" onClick={() => openCreate('', '')}>
          {__('Create Shift Assignment')}
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          icon="chevron-left"
          variant="ghost"
          aria-label={__('Previous month')}
          onClick={() => setMonth(first.subtract(1, 'month').format('YYYY-MM'))}
        />
        <span className="min-w-32 text-center font-medium text-ink-gray-8">{first.format('MMMM, YYYY')}</span>
        <Button
          icon="chevron-right"
          variant="ghost"
          aria-label={__('Next month')}
          onClick={() => setMonth(first.add(1, 'month').format('YYYY-MM'))}
        />
        <div className="ml-auto grid w-full gap-2 sm:w-auto sm:grid-cols-3 lg:grid-cols-6">
          <Combobox
            label={__('Company')}
            value={filters.company || defaultCompany.company}
            options={companyOptions.options}
            onChange={(value) => updateFilter('company', String(value ?? ''))}
          />
          <Combobox
            label={__('Department')}
            value={filters.department ?? ''}
            options={departmentOptions.options}
            onChange={(value) => updateFilter('department', String(value ?? ''))}
            disabled={!filters.company && !defaultCompany.company}
          />
          <Combobox
            label={__('Branch')}
            value={filters.branch ?? ''}
            options={branchOptions.options}
            onChange={(value) => updateFilter('branch', String(value ?? ''))}
          />
          <Combobox
            label={__('Designation')}
            value={filters.designation ?? ''}
            options={designationOptions.options}
            onChange={(value) => updateFilter('designation', String(value ?? ''))}
          />
          <Combobox
            label={__('Shift Type')}
            value={shiftFilters.shift_type}
            options={shiftTypeOptions.options}
            onChange={(value) => setShiftFilters((current) => ({ ...current, shift_type: String(value ?? '') }))}
          />
          <Combobox
            label={__('Shift Location')}
            value={shiftFilters.shift_location}
            options={shiftLocationOptions.options}
            onChange={(value) => setShiftFilters((current) => ({ ...current, shift_location: String(value ?? '') }))}
          />
        </div>
      </div>
      {!employeeFilters.company ? (
        <p className="py-40 text-center text-sm text-ink-gray-6">{__('Please select a company.')}</p>
      ) : employees.resource.loading && !employees.resource.data ? (
        <div className="flex justify-center py-10">
          <Spinner size="md" />
        </div>
      ) : (
        <div className="overflow-auto rounded-lg border border-outline-gray-2 bg-surface-base">
          <TextInput
            className="m-2 w-72"
            value={employeeSearch}
            onChange={setEmployeeSearch}
            placeholder={__('Search Employee')}
            aria-label={__('Search Employee')}
          />
          {dragError && (
            <p className="px-3 pb-2 text-sm text-ink-red-8" role="alert">
              {dragError}
            </p>
          )}
          <table className="min-w-max border-separate border-spacing-0">
            <thead>
              <tr className="sticky top-0 z-10 bg-surface-base">
                <th className="sticky left-0 z-20 min-w-64 border-b border-outline-gray-2 bg-surface-base p-3 text-left text-sm font-medium text-ink-gray-7">
                  {__('Employee')}
                </th>
                {days.map((day) => (
                  <th
                    key={day.format('YYYY-MM-DD')}
                    className="border-b border-l border-outline-gray-2 p-2 text-center text-xs font-medium text-ink-gray-6"
                  >
                    {day.format('ddd')}
                    <br />
                    {day.format('DD')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleEmployees.map((employee) => (
                <tr key={employee.name}>
                  <td className="sticky left-0 z-10 min-w-64 border-b border-outline-gray-1 bg-surface-base p-3">
                    <p className="font-medium text-ink-gray-8">{employee.employee_name ?? employee.name}</p>
                    <p className="text-xs text-ink-gray-5">{employee.designation ?? ''}</p>
                  </td>
                  {days.map((day) => {
                    const date = day.format('YYYY-MM-DD')
                    const event = events.events[employee.name]?.[date]
                    const shift = event?.shift ?? []
                    return (
                      <td
                        key={date}
                        className={`min-w-36 border-b border-l border-outline-gray-1 p-1.5 align-top ${event?.holiday ? 'bg-surface-blue-1' : event?.leave ? 'bg-surface-pink-1' : ''}`}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={() => void moveShift(employee.name, date)}
                      >
                        <div className="flex min-h-20 flex-col gap-1.5">
                          {event?.holiday && (
                            <div className="rounded border border-outline-gray-2 bg-surface-gray-2 p-2 text-xs text-ink-gray-6">
                              {event.holiday.weekly_off ? <strong>{__('WO')}</strong> : event.holiday.description}
                            </div>
                          )}
                          {!event?.holiday && event?.leave && (
                            <div className="rounded border border-outline-pink-3 bg-surface-pink-2 p-2 text-xs text-ink-pink-8">
                              {event.leave.leave_type || __('On Leave')}
                            </div>
                          )}
                          {shift.map((item) => (
                            <div
                              key={item.name}
                              draggable
                              onDragStart={() =>
                                setDragged({
                                  shift: { ...item, employee: employee.name },
                                  employee: employee.name,
                                  date,
                                })
                              }
                              onClick={() => {
                                setSelectedAssignment({ ...item, employee: employee.name })
                                setSelectedCell({ employee: employee.name, date })
                                setDialogOpen(true)
                              }}
                              className={`cursor-pointer rounded border-2 p-2 ${colors[item.color ?? 'blue'] ?? colors.blue}`}
                            >
                              <p className="truncate text-sm font-medium">{item.shift_type}</p>
                              <p className="text-xs">
                                {item.start_time} - {item.end_time}
                              </p>
                              {item.shift_location && <p className="truncate text-xs">{item.shift_location}</p>}
                            </div>
                          ))}
                          <Button
                            variant="outline"
                            icon="plus"
                            className="w-full"
                            aria-label={__('Add Shift')}
                            onClick={() => openCreate(employee.name, date)}
                          />
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
              {!visibleEmployees.length && (
                <tr>
                  <td colSpan={days.length + 1} className="p-12 text-center text-sm text-ink-gray-6">
                    {__('No employees found')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {events.resource.error && (
            <p className="p-4 text-sm text-ink-red-8" role="alert">
              {__('Unable to load roster events')}
            </p>
          )}
        </div>
      )}
      <ShiftAssignmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        assignment={selectedAssignment}
        selectedCell={selectedCell}
        employees={employees.employees}
        shiftTypes={shiftTypeOptions.options}
        shiftLocations={shiftLocationOptions.options}
        onRefresh={() => void events.resource.reload()}
      />
    </main>
  )
}
