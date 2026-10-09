import { makeHrmsResource, messageTransform, useHrmsQuery } from './resource'
import type { HrmsEmployee, HrmsPayrollPeriod, HrmsRequest } from '../types'

export const claimsResource = makeHrmsResource<unknown>('hrms.api.get_expense_claims', 'hrms:claims')
export const claimSummaryResource = makeHrmsResource<unknown>(
  'hrms.api.get_expense_claim_summary',
  'hrms:claim_summary',
)
export const advancesResource = makeHrmsResource<unknown>('hrms.api.get_employee_advance_balance', 'hrms:advances')
export const salarySlipsResource = makeHrmsResource<unknown>('frappe.client.get_list', 'hrms:salary_slips')
export const payrollPeriodsResource = makeHrmsResource<unknown>('frappe.client.get_list', 'hrms:payroll_periods')

export function useClaims(employee: HrmsEmployee | null, team = false) {
  const resource = useHrmsQuery(
    claimsResource,
    employee?.name
      ? { employee: employee.name, limit: 10, ...(team ? { approver_id: employee.user_id, for_approval: 1 } : {}) }
      : null,
    Boolean(employee?.name),
  )
  const claims = resource.data ? messageTransform<HrmsRequest[]>(resource.data) : []
  return { resource, claims: claims.map((claim) => ({ ...claim, doctype: 'Expense Claim' })) }
}

export function useClaimSummary(enabled = true) {
  const resource = useHrmsQuery(claimSummaryResource, {}, enabled)
  const summary = resource.data ? messageTransform<Record<string, unknown>>(resource.data) : {}
  return { resource, summary }
}

export function useAdvances(enabled = true) {
  const resource = useHrmsQuery(advancesResource, {}, enabled)
  const advances = resource.data ? messageTransform<HrmsRequest[]>(resource.data) : []
  return { resource, advances: advances.map((advance) => ({ ...advance, doctype: 'Employee Advance' })) }
}

export function usePayrollPeriods(employee: HrmsEmployee | null) {
  const resource = useHrmsQuery(
    payrollPeriodsResource,
    employee?.company
      ? {
          doctype: 'Payroll Period',
          fields: ['name', 'start_date', 'end_date'],
          filters: { company: employee.company },
          limit_page_length: 50,
          order_by: 'start_date desc',
        }
      : null,
    Boolean(employee?.company),
  )
  const periods = resource.data ? messageTransform<HrmsPayrollPeriod[]>(resource.data) : []
  return { resource, periods }
}

export function useSalarySlips(employee: HrmsEmployee | null) {
  const resource = useHrmsQuery(
    salarySlipsResource,
    employee?.name
      ? {
          doctype: 'Salary Slip',
          fields: ['name', 'start_date', 'end_date', 'currency', 'gross_pay', 'net_pay', 'year_to_date'],
          filters: { employee: employee.name, docstatus: 1 },
          limit_page_length: 20,
          order_by: 'end_date desc',
        }
      : null,
    Boolean(employee?.name),
  )
  const slips = resource.data ? messageTransform<HrmsRequest[]>(resource.data) : []
  return { resource, slips }
}
