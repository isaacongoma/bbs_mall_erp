import { useAuthStore } from '@/core/auth/authStore'
import type { RouteGuard } from '@/core/modules/types'
import { usePortalStore } from './stores/portalStore'

export const tenantRouteGuard: RouteGuard = async ({ to }) => {
  if (!useAuthStore.getState().access) return null
  const context = await usePortalStore.getState().load()
  if (!context) return null
  const tenantOnly = context.tenants.length > 0 && !context.is_staff
  if (tenantOnly && !to.path.startsWith('/tenant')) return { name: 'Tenant Home' }
  return null
}
