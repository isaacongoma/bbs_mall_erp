import { create } from 'zustand'
import { useAuthStore } from '@/core/auth/authStore'
import { portalApi } from '../api/portal'
import type { PortalContext } from '../types/portal'

const STORAGE_KEY = 'tenant_portal_customer'

function remembered(): string | undefined {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? undefined
  } catch {
    return undefined
  }
}

function remember(customer: string | undefined) {
  try {
    if (customer) localStorage.setItem(STORAGE_KEY, customer)
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    return
  }
}

interface PortalState {
  context: PortalContext | null
  loading: boolean
  error: string | null
  customer: string | undefined
  token: string | null
  load: () => Promise<PortalContext | null>
  select: (customer: string | undefined) => void
  preview: (customer: string) => void
  reset: () => void
}

let pending: Promise<PortalContext | null> | null = null

export const usePortalStore = create<PortalState>((set, get) => ({
  context: null,
  loading: false,
  error: null,
  customer: remembered(),
  token: null,
  load: () => {
    const token = useAuthStore.getState().access
    if (get().context && get().token === token) return Promise.resolve(get().context)
    pending ??= (async () => {
      set({ loading: true, error: null })
      try {
        const context = await portalApi.context()
        const stored = get().customer
        const known = context.tenants.some((tenant) => tenant.customer === stored)
        set({
          context,
          token,
          loading: false,
          customer: known || context.is_staff ? stored : context.tenants[0]?.customer,
        })
        return context
      } catch (error) {
        set({ loading: false, error: error instanceof Error ? error.message : String(error) })
        return null
      } finally {
        pending = null
      }
    })()
    return pending
  },
  select: (customer) => {
    remember(customer)
    set({ customer })
  },
  preview: (customer) => {
    set({ customer })
  },
  reset: () => {
    pending = null
    set({ context: null, token: null, error: null })
  },
}))

export function activeTenant(state: PortalState) {
  const { context, customer } = state
  if (!context) return undefined
  return context.tenants.find((tenant) => tenant.customer === customer) ?? context.tenants[0]
}
