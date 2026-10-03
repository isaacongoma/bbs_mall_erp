import { useState } from 'react'
import { __ } from '@/core/i18n'
import { useListResource } from '@/core/resources'
import { Button, Dropdown, ErrorMessage, Popover } from '@/design-system'
import { getGridTemplateColumnsForTable } from '@/shared/utils/collections'
import { confirmDeleteOptions } from '@/shared/utils/confirmDelete'
import { WORKDAY_OPTIONS, formatTime, type SlaData, type SlaErrors, type SlaWorkday } from '../../utils/sla'
import { WorkDayModal, type WorkDayDialogState } from './WorkDayModal'

type AnyRecord = Record<string, any>

export interface SlaHolidaysProps {
  data: SlaData
  errors: SlaErrors
  onPatch: (patch: Partial<SlaData>) => void
}

const COLUMNS = [
  { label: 'Day', key: 'workday', isRequired: true },
  { label: 'Start Time', key: 'start_time', isRequired: true },
  { label: 'End Time', key: 'end_time', isRequired: true },
]

export function SlaHolidays({ data, errors, onPatch }: SlaHolidaysProps) {
  const [dialog, setDialog] = useState<WorkDayDialogState>({ show: false, isEditing: false, data: {} })
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const holidayLists = useListResource({ doctype: 'CRM Holiday List', fields: ['name'], auto: true })
  const holidays = (holidayLists.data as AnyRecord[] | null) ?? []
  const workingHours = data.working_hours ?? []
  const columns = COLUMNS.map((column) => ({ ...column, label: __(column.label) }))
  const template = getGridTemplateColumnsForTable(columns.map(() => ({})))

  function setHours(next: SlaWorkday[]) {
    onPatch({ working_hours: next })
  }

  function updateDay(index: number, workday: string) {
    setHours(workingHours.map((row, at) => (at === index ? { ...row, workday } : row)))
  }

  function addWorkDay() {
    const used = new Set(workingHours.map((day) => day.workday))
    const next = WORKDAY_OPTIONS.find((day) => !used.has(day.label))?.label || WORKDAY_OPTIONS[0]?.label || 'Monday'
    setHours([
      ...workingHours,
      { workday: next, start_time: '09:00:00', end_time: '17:00:00', id: Math.random().toString(36).substring(2, 9) },
    ])
  }

  function rowOptions(row: SlaWorkday) {
    return [
      {
        label: __('Edit'),
        icon: 'edit',
        onClick: () =>
          setDialog({
            show: true,
            isEditing: true,
            data: { workday: row.workday, start_time: row.start_time, end_time: row.end_time },
          }),
      },
      ...confirmDeleteOptions({
        onConfirmDelete: () => setHours(workingHours.filter((item) => item !== row)),
        isConfirmingDelete: confirmingDelete,
        setConfirmingDelete,
      }).filter((option) => option.condition()),
    ]
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <div className="text-lg-semibold text-ink-gray-8">{__('Work Schedule & Holidays')}</div>
          <div className="max-w-lg text-p-sm text-ink-gray-6">
            {__('Set working days, hours, and holidays by selecting a predefined schedule or creating a new one')}
          </div>
        </div>
        <Popover
          target={({ isOpen, togglePopover }) => (
            <Button
              className="text-sm"
              iconRight={isOpen ? 'lucide-chevron-up' : 'lucide-chevron-down'}
              label={data.holiday_list || __('Select Holiday List')}
              onClick={() => togglePopover()}
            />
          )}
          body={() => (
            <div className="my-2 min-w-40 rounded-lg bg-surface-elevation-2 shadow-2xl ring-1 ring-black ring-opacity-5 focus:outline-none">
              <div className="max-h-52 overflow-y-auto p-1">
                {holidays.map((holiday) => (
                  <div
                    key={holiday.name}
                    className="flex cursor-pointer items-center justify-between gap-4 rounded px-2 py-1.5 text-base text-ink-gray-8 hover:bg-surface-gray-3"
                    onClick={() => onPatch({ holiday_list: data.holiday_list === holiday.name ? '' : holiday.name })}
                  >
                    <div className="flex w-full items-center gap-2">
                      <input name="holiday_list" checked={holiday.name === data.holiday_list} type="radio" readOnly />
                      <div className="select-none">{holiday.name}</div>
                    </div>
                    <div className="flex cursor-pointer items-center gap-1">
                      <Button
                        variant="ghost"
                        icon="lucide-edit"
                        onClick={(event) => {
                          event.stopPropagation()
                          window.open(`${window.location.origin}/app/crm-holiday-list/${holiday.name}`)
                        }}
                      />
                    </div>
                  </div>
                ))}
                {holidays.length === 0 && (
                  <div className="p-2.5 text-center text-sm text-ink-gray-5">{__('No holiday list found')}</div>
                )}
              </div>
              <div className="flex flex-col gap-1 border-t border-outline-elevation-2 p-1 pt-1.5">
                <Button
                  className="w-full !justify-start !text-ink-gray-5"
                  variant="ghost"
                  label={__('Create New Holiday List')}
                  iconLeft="lucide-plus"
                  onClick={() => window.open(`${window.location.origin}/app/crm-holiday-list`)}
                />
              </div>
            </div>
          )}
        />
      </div>
      <div className="mt-5">
        <div className="rounded-md border border-outline-gray-2 px-2 text-sm">
          {workingHours.length !== 0 && (
            <>
              <div className="grid items-center p-3 px-4" style={{ gridTemplateColumns: template }}>
                {columns.map((column) => (
                  <div
                    key={column.key}
                    className={`overflow-hidden text-ellipsis whitespace-nowrap text-ink-gray-5 ${
                      column.key === 'workday' ? 'ml-2' : ''
                    }`}
                  >
                    {column.label}
                    {column.isRequired && <span className="text-red-500">*</span>}
                  </div>
                ))}
              </div>
              <hr className="border-outline-gray-2" />
            </>
          )}
          {workingHours.map((row, index) => (
            <div key={`${index}${row.workday}${row.id ?? ''}`}>
              <div className="grid items-center gap-2 px-4 py-3.5" style={{ gridTemplateColumns: template }}>
                {columns.map((column) => (
                  <div key={column.key} className="w-full overflow-hidden text-ellipsis whitespace-nowrap">
                    {column.key === 'start_time' || column.key === 'end_time' ? (
                      <div>{formatTime(row[column.key])}</div>
                    ) : (
                      <div className="ml-2">
                        <select
                          value={row.workday}
                          className="-ml-2 h-7 w-full truncate rounded-md border-0 bg-transparent bg-none p-0 pl-2 pr-5 text-base text-ink-gray-8 hover:bg-surface-gray-3 focus-visible:!ring-0"
                          onChange={(event) => updateDay(index, event.target.value)}
                        >
                          {WORKDAY_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value} className="text-ink-gray-8">
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                ))}
                <div className="flex justify-end">
                  <Dropdown placement="right" options={rowOptions(row) as never}>
                    <Button icon="lucide-more-horizontal" variant="ghost" onClick={() => setConfirmingDelete(false)} />
                  </Dropdown>
                </div>
              </div>
              {index !== workingHours.length - 1 && <hr className="border-outline-gray-2" />}
            </div>
          ))}
          {workingHours.length === 0 && (
            <div className="p-4 text-center text-ink-gray-5">{__('No Workdays in the List')}</div>
          )}
        </div>
        <div className="mt-2.5 flex items-center justify-between">
          {workingHours.length < 7 ? (
            <Button variant="subtle" label={__('Add Row')} iconLeft="lucide-plus" onClick={addWorkDay} />
          ) : (
            <span />
          )}
          <ErrorMessage message={errors.working_hours} />
        </div>
      </div>
      {dialog.show && (
        <WorkDayModal
          key={`${dialog.isEditing}-${dialog.data.workday ?? ''}`}
          state={dialog}
          workDays={workingHours}
          onClose={() => setDialog((current) => ({ ...current, show: false }))}
          onChange={setHours}
        />
      )}
    </>
  )
}
