import { useEffect } from 'react'
import { create } from 'zustand'
import { ApiError } from '@/core/api/errors'
import type { HrmsUser } from '../types'
import { makeHrmsResource, messageTransform, useHrmsResource } from './resource'

const userResource = makeHrmsResource<unknown>('hrms.api.get_current_user_info', 'hrms:user')

interface HrmsUserState {
  user: HrmsUser | null
  setUser: (user: HrmsUser | null) => void
}

export const useHrmsUserStore = create<HrmsUserState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}))

export function useHrmsUser(enabled = true): HrmsUser | null {
  const resource = useHrmsResource(userResource, enabled)
  const user = resource.data ? messageTransform<HrmsUser>(resource.data) : null
  const current = useHrmsUserStore((state) => state.user)

  useEffect(() => {
    if (user && current?.name !== user.name) useHrmsUserStore.getState().setUser(user)
  }, [current?.name, user])
  return current ?? user
}

export function isHrmsAuthenticationError(error: unknown): boolean {
  return error instanceof ApiError && error.excType === 'AuthenticationError'
}

export function resetHrmsUser(): void {
  userResource.reset()
  useHrmsUserStore.getState().setUser(null)
}

export { userResource }
