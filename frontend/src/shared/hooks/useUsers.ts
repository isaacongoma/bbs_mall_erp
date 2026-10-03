import { useEffect } from 'react'
import {
  currentSessionUser,
  ensureUsersLoaded,
  getUser,
  getUserRole,
  isAdmin,
  isCrmUser,
  isManager,
  isSalesUser,
  isTelephonyAgent,
  isWebsiteUser,
  useUsersStore,
} from '../stores/usersStore'

export function useUsers() {
  useEffect(() => {
    ensureUsersLoaded()
  }, [])

  useUsersStore((state) => state.usersByName)
  const allUsers = useUsersStore((state) => state.allUsers)
  const crmUsers = useUsersStore((state) => state.crmUsers)

  return {
    allUsers,
    crmUsers,
    getUser,
    isAdmin,
    isManager,
    isSalesUser,
    isTelephonyAgent,
    isWebsiteUser,
    isCrmUser,
    getUserRole,
    sessionUser: currentSessionUser,
  }
}

export function useUser(email?: string | null) {
  useUsers()
  return getUser(email)
}
