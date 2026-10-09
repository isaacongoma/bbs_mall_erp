import { makeHrmsResource, messageTransform, useHrmsQuery } from './resource'
import type { HrmsEmployee } from '../types'
import { dayjsLocal } from '@/core/datetime'

export interface RosterEvent {
  shift?: Array<{
    name: string
    shift_type?: string
    shift_location?: string
    start_time?: string
    end_time?: string
    status?: string
    color?: string
    shift_schedule_assignment?: string
  }>
  leave?: { leave?: string; leave_type?: string }
  holiday?: { description?: string; weekly_off?: boolean }
}

export type RosterEvents = Record<string, Record<string, RosterEvent>>

const employeesResource = makeHrmsResource<unknown>('frappe.client.get_list', 'hrms:roster_employees')
const eventsResource = makeHrmsResource<unknown>('hrms.api.roster.get_events')
const defaultCompanyResource = makeHrmsResource<unknown>(
  'hrms.api.roster.get_default_company',
  'hrms:roster_default_company',
)
const filterResources = new Map<string, ReturnType<typeof makeHrmsResource<unknown>>>()

function getFilterResource(doctype: string) {
  const existing = filterResources.get(doctype)
  if (existing) return existing
  const resource = makeHrmsResource<unknown>('frappe.client.get_list', `hrms:roster_filter:${doctype}`)
  filterResources.set(doctype, resource)
  return resource
}

export interface RosterFilters {
  company?: string
  department?: string
  branch?: string
  designation?: string
  status?: string
}

export interface RosterShift {
  name: string
  employee: string
  shift_type?: string
  shift_location?: string
  start_date?: string
  end_date?: string | null
  status?: string
  start_time?: string
  end_time?: string
  color?: string
  shift_schedule_assignment?: string
}

interface RawRosterEvent extends RosterShift {
  holiday?: string
  holiday_date?: string
  description?: string
  weekly_off?: boolean
  leave?: string
  leave_type?: string
  from_date?: string
  to_date?: string
}

function mapEvents(raw: Record<string, RawRosterEvent[]>, month: string): RosterEvents {
  const first = dayjsLocal(`${month}-01`)
  const mapped: RosterEvents = {}
  Object.entries(raw).forEach(([employee, employeeEvents]) => {
    mapped[employee] = {}
    for (let day = 1; day <= first.daysInMonth(); day += 1) {
      const date = first.date(day).format('YYYY-MM-DD')
      const entry: RosterEvent = {}
      employeeEvents.forEach((event) => {
        if (event.holiday && event.holiday_date === date) {
          entry.holiday = { description: event.description, weekly_off: event.weekly_off }
        } else if (
          event.leave &&
          event.from_date &&
          event.to_date &&
          date >= event.from_date &&
          date <= event.to_date
        ) {
          entry.leave = { leave_type: event.leave_type }
        } else if (
          event.name &&
          event.start_date &&
          event.start_date <= date &&
          (!event.end_date || event.end_date >= date)
        ) {
          entry.shift = entry.shift ?? []
          entry.shift.push({
            name: event.name,
            shift_type: event.shift_type,
            shift_location: event.shift_location,
            start_time: event.start_time?.slice(0, 5),
            end_time: event.end_time?.slice(0, 5),
            status: event.status,
            color: event.color?.toLowerCase(),
            shift_schedule_assignment: event.shift_schedule_assignment,
          })
        }
      })
      entry.shift?.sort((left, right) => String(left.start_time).localeCompare(String(right.start_time)))
      mapped[employee][date] = entry
    }
  })
  return mapped
}

export function useRosterFilterOptions(doctype: string, filters: Record<string, unknown> = {}) {
  const resource = useHrmsQuery(
    getFilterResource(doctype),
    { doctype, fields: ['name'], filters, limit_page_length: 100 },
    true,
  )
  const options = resource.data ? messageTransform<Array<{ name: string }>>(resource.data).map((item) => item.name) : []
  return { resource, options }
}

export function useRosterDefaultCompany() {
  const resource = useHrmsQuery(defaultCompanyResource, {}, true)
  return { resource, company: resource.data ? messageTransform<string>(resource.data) : '' }
}

export function useRosterEmployees(filters: RosterFilters) {
  const resource = useHrmsQuery(
    employeesResource,
    filters.company
      ? {
          doctype: 'Employee',
          fields: ['name', 'employee_name', 'designation', 'image'],
          filters: { status: 'Active', ...filters },
          limit_page_length: 99999,
        }
      : null,
    Boolean(filters.company),
  )
  const employees = resource.data ? messageTransform<HrmsEmployee[]>(resource.data) : []
  return { resource, employees }
}

export function useRosterEvents(month: string, filters: RosterFilters, shiftFilters: Record<string, string> = {}) {
  const date = new Date(`${month}-01T00:00:00`)
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0)
  const resource = useHrmsQuery(
    eventsResource,
    filters.company
      ? {
          month_start: `${month}-01`,
          month_end: end.toISOString().slice(0, 10),
          employee_filters: { status: 'Active', ...filters },
          shift_filters: shiftFilters,
        }
      : null,
    Boolean(filters.company),
  )
  const raw = resource.data ? messageTransform<Record<string, RawRosterEvent[]>>(resource.data) : {}
  const events = mapEvents(raw, month)
  return { resource, events }
}
