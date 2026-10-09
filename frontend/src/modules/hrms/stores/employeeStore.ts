import { useEffect, useMemo } from 'react'
import { create } from 'zustand'
import type { HrmsEmployee } from '../types'
import { makeHrmsResource, messageTransform, useHrmsResource } from './resource'

const employeeResource = makeHrmsResource<unknown>('hrms.api.get_current_employee_info', 'hrms:employee')
const employeesResource = makeHrmsResource<unknown>('hrms.api.get_all_employees', 'hrms:employees')

interface EmployeeState {
  employee: HrmsEmployee | null
  employeesById: Record<string, HrmsEmployee>
  employeesByUserId: Record<string, HrmsEmployee>
  setEmployee: (employee: HrmsEmployee | null) => void
  setEmployees: (employees: HrmsEmployee[]) => void
}

export const useHrmsEmployeeStore = create<EmployeeState>((set) => ({
  employee: null,
  employeesById: {},
  employeesByUserId: {},
  setEmployee: (employee) => set({ employee }),
  setEmployees: (employees) => {
    const employeesById: Record<string, HrmsEmployee> = {}
    const employeesByUserId: Record<string, HrmsEmployee> = {}
    for (const entry of employees) {
      const value = { ...entry, isActive: entry.status === 'Active' }
      employeesById[value.name] = value
      if (value.user_id) employeesByUserId[value.user_id] = value
    }
    set({ employeesById, employeesByUserId })
  },
}))

export function useHrmsEmployee(enabled = true): HrmsEmployee | null {
  const resource = useHrmsResource(employeeResource, enabled)
  const employee = resource.data ? messageTransform<HrmsEmployee | null>(resource.data) : null
  const current = useHrmsEmployeeStore((state) => state.employee)

  useEffect(() => {
    if (employee && current?.name !== employee.name) useHrmsEmployeeStore.getState().setEmployee(employee)
  }, [current?.name, employee])
  return current ?? employee
}

export function useHrmsEmployees(enabled = true): HrmsEmployee[] {
  const resource = useHrmsResource(employeesResource, enabled)
  const employees = useMemo(
    () => (resource.data ? messageTransform<HrmsEmployee[]>(resource.data) : []),
    [resource.data],
  )
  const state = useHrmsEmployeeStore()

  useEffect(() => {
    if (employees.length && Object.keys(state.employeesById).length !== employees.length) {
      useHrmsEmployeeStore.getState().setEmployees(employees)
    }
  }, [employees, state.employeesById])
  return Object.values(useHrmsEmployeeStore.getState().employeesById)
}

export function getEmployeeInfo(employeeId?: string | null): HrmsEmployee | undefined {
  const state = useHrmsEmployeeStore.getState()
  return state.employeesById[employeeId || state.employee?.name || '']
}

export function getEmployeeInfoByUserId(userId?: string | null): HrmsEmployee | undefined {
  return useHrmsEmployeeStore.getState().employeesByUserId[userId || '']
}

export function resetHrmsEmployee(): void {
  employeeResource.reset()
  employeesResource.reset()
  useHrmsEmployeeStore.setState({ employee: null, employeesById: {}, employeesByUserId: {} })
}

export { employeeResource, employeesResource }
