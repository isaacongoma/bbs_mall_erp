import { makeHrmsResource, messageTransform, useHrmsQuery } from './resource'
import type { HrmsEmployee, HrmsHoliday, HrmsRequest, LeaveBalanceMap } from '../types'

export const leavesResource = makeHrmsResource<unknown>('hrms.api.get_leave_applications', 'hrms:leaves')
export const leaveBalanceResource = makeHrmsResource<unknown>('hrms.api.get_leave_balance_map', 'hrms:leave_balance')
export const holidaysResource = makeHrmsResource<unknown>('hrms.api.get_holidays_for_employee', 'hrms:holidays')

export function useLeaves(employee: HrmsEmployee | null, team = false) {
  const resource = useHrmsQuery(
    leavesResource,
    employee?.name
      ? { employee: employee.name, limit: 10, ...(team ? { approver_id: employee.user_id, for_approval: 1 } : {}) }
      : null,
    Boolean(employee?.name),
  )
  const leaves = resource.data ? messageTransform<HrmsRequest[]>(resource.data) : []
  return { resource, leaves: leaves.map((leave) => ({ ...leave, doctype: 'Leave Application' })) }
}

export function useLeaveBalance(enabled = true) {
  const resource = useHrmsQuery(leaveBalanceResource, {}, enabled)
  const balance = resource.data ? messageTransform<LeaveBalanceMap>(resource.data) : {}
  return { resource, balance }
}

export function useHolidays(employee: HrmsEmployee | null) {
  const resource = useHrmsQuery(
    holidaysResource,
    employee?.name ? { employee: employee.name } : null,
    Boolean(employee?.name),
  )
  const holidays = resource.data ? messageTransform<HrmsHoliday[]>(resource.data) : []
  return { resource, holidays }
}
