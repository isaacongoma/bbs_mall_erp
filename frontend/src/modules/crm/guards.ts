import { rpc } from '@/core/api/rpc'
import type { RouteGuard } from '@/core/modules/types'
import { currentSessionUser, ensureUsersLoaded, isAdmin, isCrmUser } from '@/shared/stores/usersStore'
import { ensureViewsLoaded, getDefaultView, useViewsStore } from '@/shared/stores/viewsStore'

export const PERSONA_DONE_KEY = 'crm_persona_captured'

const STANDARD_VIEW_TYPES = ['list', 'kanban', 'group_by']

let personaChecked = false

async function shouldCapturePersona(): Promise<boolean> {
  if (localStorage.getItem(PERSONA_DONE_KEY)) return false
  const captured = await rpc<boolean | null>({
    url: 'frappe.client.get_single_value',
    params: { doctype: 'FCRM Settings', field: 'persona_captured' },
  })
  if (captured) return false
  const config = await rpc<{ enabled?: boolean } | null>({ url: 'frappe.utils.telemetry.pulse.client.boot_config' })
  return !!config?.enabled
}

async function personaPending(): Promise<boolean> {
  try {
    return await shouldCapturePersona()
  } catch {
    return false
  }
}

async function loadUsers(): Promise<void> {
  const users = ensureUsersLoaded()
  if (users.fetched) return
  try {
    await users.promise
  } catch (error) {
    console.error('Error loading users', error)
    if ((error as { exc_type?: string } | null)?.exc_type !== 'PermissionError') throw error
  }
}

export const crmRouteGuard: RouteGuard = async ({ to }) => {
  await loadUsers()

  const sessionUser = currentSessionUser()
  const isAdminUser = isAdmin() || sessionUser === 'Administrator'

  if (to.name === 'Onboarding' && (!isAdminUser || !(await personaPending()))) return { name: 'Home' }

  if (isCrmUser() && !personaChecked && to.name !== 'Onboarding' && isAdminUser) {
    personaChecked = true
    if (await personaPending()) return { name: 'Onboarding' }
  }

  if (to.name !== 'Not Permitted' && !isCrmUser()) return { name: 'Not Permitted' }
  if (to.name === 'Not Permitted' && isCrmUser()) return { name: 'Home' }

  if (to.name === 'Home') {
    await ensureViewsLoaded().promise
    const defaultView = getDefaultView()
    if (!defaultView) return { name: 'Leads' }

    const { name, type, is_standard } = defaultView
    const routeName = defaultView.route_name || 'Leads'
    if (name && !is_standard) return { name: routeName, params: { viewType: type }, query: { view: name } }
    return { name: routeName, params: { viewType: type } }
  }

  if (!to.matched) return { name: 'Invalid Page', params: { invalidpath: to.path.replace(/^\//, '') } }

  const viewDoctype = to.meta.viewDoctype as string | undefined
  if (viewDoctype && to.name && !to.query.view) {
    await ensureViewsLoaded().promise
    const viewType = to.params.viewType ?? ''

    if (!viewType) {
      let defaultViewType = 'list'
      const globalDefault = getDefaultView(to.name)
      if (globalDefault) {
        defaultViewType = globalDefault.type || 'list'
        if (globalDefault.name && !globalDefault.is_standard) {
          return {
            name: to.name,
            params: { viewType: defaultViewType },
            query: { ...to.query, view: globalDefault.name },
          }
        }
      }

      const { standardViews } = useViewsStore.getState()
      for (const candidate of STANDARD_VIEW_TYPES) {
        if (standardViews[`${viewDoctype} ${candidate}`]?.is_default) {
          defaultViewType = candidate
          break
        }
      }
      return { name: to.name, params: { viewType: defaultViewType }, query: to.query }
    }

    if (!STANDARD_VIEW_TYPES.includes(viewType)) {
      const { viewsByName } = useViewsStore.getState()
      const view = Object.values(viewsByName).find((entry) => entry.name === viewType || entry.label === viewType)
      if (view) {
        return { name: to.name, params: { viewType: view.type || 'list' }, query: { ...to.query, view: view.name } }
      }
      return { name: to.name, params: { viewType: 'list' }, query: to.query }
    }
  }

  return null
}
