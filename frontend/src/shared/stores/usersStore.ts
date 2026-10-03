import { create } from 'zustand'
import { selectSessionUser, useAuthStore } from '@/core/auth/authStore'
import { rpc } from '@/core/api/rpc'
import { createResource } from '@/core/resources'
import type { CrmUser, UsersByName } from '../types/users'

interface UsersPayload {
  allUsers: CrmUser[]
  crmUsers: CrmUser[]
}

interface UsersState {
  usersByName: UsersByName
  allUsers: CrmUser[]
  crmUsers: CrmUser[]
  loaded: boolean
  fullLoaded: boolean
  mergeUsers: (users: CrmUser[], upgradeExisting?: boolean) => void
}

function normalizeUser(user: CrmUser): CrmUser {
  const name = user.name || user.email || ''
  const email = user.email || name
  return { ...user, name, email, full_name: user.full_name?.trim() || name || email }
}

function normalizeUsers(users: unknown): CrmUser[] {
  return ((users as CrmUser[] | null) || []).filter(Boolean).map(normalizeUser)
}

export const useUsersStore = create<UsersState>((set) => ({
  usersByName: {},
  allUsers: [],
  crmUsers: [],
  loaded: false,
  fullLoaded: false,
  mergeUsers(users, upgradeExisting = false) {
    set((state) => {
      const next = { ...state.usersByName }
      for (const user of users) {
        next[user.name] = upgradeExisting && next[user.name] ? { ...next[user.name], ...user } : user
        if (user.name === 'Administrator') next[user.email] = user
      }
      return { usersByName: next }
    })
  },
}))

let usersResource: ReturnType<typeof createUsersResource> | null = null
let backgroundScheduled = false
const stubs = new Map<string, CrmUser>()
const pendingResolves = new Set<string>()
let flushScheduled = false

function scheduleBackgroundFetch() {
  if (backgroundScheduled) return
  backgroundScheduled = true
  const fire = () => void loadAllUsers()
  if (typeof requestIdleCallback === 'function') requestIdleCallback(fire, { timeout: 5000 })
  else setTimeout(fire, 2000)
}

function createUsersResource() {
  return createResource<UsersPayload, [CrmUser[], CrmUser[]]>({
    url: 'crm.api.session.get_users',
    cache: 'crm-users',
    initialData: { allUsers: [], crmUsers: [] },
    auto: true,
    transform([all, crm]) {
      const allUsers = normalizeUsers(all)
      const crmUsers = normalizeUsers(crm)
      useUsersStore.getState().mergeUsers(allUsers)
      useUsersStore.setState({ allUsers, crmUsers, loaded: true })
      return { allUsers, crmUsers }
    },
    onError(error: any) {
      if (error?.exc_type === 'AuthenticationError') window.location.href = '/login?redirect-to=/crm'
    },
    onSuccess() {
      scheduleBackgroundFetch()
    },
  })
}

export function ensureUsersLoaded() {
  if (!usersResource) usersResource = createUsersResource()
  return usersResource
}

export async function loadAllUsers(): Promise<void> {
  if (useUsersStore.getState().fullLoaded) return
  const data = await rpc<[CrmUser[]]>({ url: 'crm.api.session.get_users', params: { include_all: 1 } })
  const allUsers = normalizeUsers(data?.[0])
  const { mergeUsers } = useUsersStore.getState()
  mergeUsers(allUsers, true)
  useUsersStore.setState({ allUsers, fullLoaded: true })
}

async function flushResolves() {
  flushScheduled = false
  if (!pendingResolves.size) return
  const batch = [...pendingResolves]
  pendingResolves.clear()
  try {
    const records = await rpc<CrmUser[]>({ url: 'crm.api.session.get_user_info', params: { users: batch } })
    useUsersStore.getState().mergeUsers(normalizeUsers(records), true)
  } catch {
    return
  }
}

function queueResolve(email: string) {
  pendingResolves.add(email)
  if (flushScheduled) return
  flushScheduled = true
  queueMicrotask(() => void flushResolves())
}

export function currentSessionUser(): string | null {
  return selectSessionUser(useAuthStore.getState())
}

export function getUser(email?: string | null): CrmUser {
  const state = useUsersStore.getState()
  let key = email
  if (!key || key === 'sessionUser') key = currentSessionUser() ?? ''

  const known = state.usersByName[key]
  if (known) return known

  let stub = stubs.get(key)
  if (!stub) {
    const local = key.split('@')[0] ?? key
    stub = { name: key, email: key, full_name: local, first_name: local, last_name: '', user_image: null, role: null }
    stubs.set(key, stub)
    if (!state.fullLoaded) queueResolve(key)
  }
  return stub
}

export function isAdmin(email?: string | null): boolean {
  return getUser(email).role === 'System Manager'
}

export function isManager(email?: string | null): boolean {
  return getUser(email).role === 'Sales Manager' || isAdmin(email)
}

export function isWebsiteUser(email?: string | null): boolean {
  return getUser(email).user_type === 'Website User'
}

export function isSalesUser(email?: string | null): boolean {
  return getUser(email).role === 'Sales User'
}

export function isTelephonyAgent(email?: string | null): boolean {
  return Boolean(getUser(email).is_telephony_agent)
}

export function getUserRole(email?: string | null): string | null {
  return getUser(email).role ?? null
}

export function isCrmUser(user?: string | null): boolean {
  const target = user || currentSessionUser()
  return Boolean(useUsersStore.getState().crmUsers.find((candidate) => candidate.name === target))
}
