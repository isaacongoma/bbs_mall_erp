import { makeHrmsResource, messageTransform, useHrmsQuery } from './resource'
import type { HrmsCalendarEvents, HrmsEmployee, HrmsRequest } from '../types'

export const attendanceRequestsResource = makeHrmsResource<unknown>(
  'hrms.api.get_attendance_requests',
  'hrms:attendance_requests',
)
export const shiftRequestsResource = makeHrmsResource<unknown>('hrms.api.get_shift_requests', 'hrms:shift_requests')
export const shiftsResource = makeHrmsResource<unknown>('hrms.api.get_shifts', 'hrms:shifts')
export const attendanceCalendarResource = makeHrmsResource<unknown>('hrms.api.get_attendance_calendar_events')

function withAttendanceDates(request: HrmsRequest): HrmsRequest {
  return {
    ...request,
    doctype: 'Attendance Request',
    attendance_dates: request.attendance_dates ?? '',
  }
}

function withShiftDates(request: HrmsRequest): HrmsRequest {
  return {
    ...request,
    doctype: request.doctype ?? 'Shift Request',
    shift_dates: request.shift_dates ?? '',
  }
}

export function useAttendanceRequests(employee: HrmsEmployee | null, team = false) {
  const resource = useHrmsQuery(
    attendanceRequestsResource,
    employee?.name
      ? { employee: employee.name, limit: 10, ...(team ? { approver_id: employee.user_id, for_approval: 1 } : {}) }
      : null,
    Boolean(employee?.name),
  )
  const requests = resource.data ? messageTransform<HrmsRequest[]>(resource.data) : []
  return { resource, requests: requests.map(withAttendanceDates) }
}

export function useShiftRequests(employee: HrmsEmployee | null, team = false) {
  const resource = useHrmsQuery(
    shiftRequestsResource,
    employee?.name
      ? { employee: employee.name, limit: 10, ...(team ? { approver_id: employee.user_id, for_approval: 1 } : {}) }
      : null,
    Boolean(employee?.name),
  )
  const requests = resource.data ? messageTransform<HrmsRequest[]>(resource.data) : []
  return { resource, requests: requests.map(withShiftDates) }
}

export function useShifts(employee: HrmsEmployee | null) {
  const resource = useHrmsQuery(
    shiftsResource,
    employee?.name ? { employee: employee.name } : null,
    Boolean(employee?.name),
  )
  const shifts = resource.data ? messageTransform<HrmsRequest[]>(resource.data) : []
  return { resource, shifts: shifts.map((shift) => ({ ...withShiftDates(shift), doctype: 'Shift Assignment' })) }
}

export function useAttendanceCalendar(month: string, enabled = true) {
  const fromDate = `${month}-01`
  const date = new Date(`${fromDate}T00:00:00`)
  const toDate = new Date(date.getFullYear(), date.getMonth() + 1, 0)
  const params = {
    from_date: fromDate,
    to_date: toDate.toISOString().slice(0, 10),
  }
  const resource = useHrmsQuery(attendanceCalendarResource, params, enabled)
  const events = resource.data ? messageTransform<HrmsCalendarEvents>(resource.data) : {}
  return { resource, events }
}
