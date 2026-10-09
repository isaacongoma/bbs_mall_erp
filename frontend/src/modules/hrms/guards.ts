import { useAuthStore } from '@/core/auth/authStore'
import type { RouteGuard } from '@/core/modules/types'
import { unwrapMessage } from './api/response'
import { employeeResource } from './stores/employeeStore'

export const hrmsRouteGuard: RouteGuard = async ({ to }) => {
  if (!to.path.startsWith('/hrms')) return null
  if (!useAuthStore.getState().access) return null

  employeeResource.start()
  if (!employeeResource.fetched && !employeeResource.loading) {
    try {
      await employeeResource.fetch()
    } catch {
      return { name: 'HRMS Invalid Employee' }
    }
  }

  const employee = unwrapMessage<Record<string, unknown> | null>(employeeResource.data)
  if (to.name !== 'HRMS Invalid Employee' && !employee) return { name: 'HRMS Invalid Employee' }
  if (to.name === 'HRMS Invalid Employee' && employee) return { name: 'HRMS Home' }
  return null
}
