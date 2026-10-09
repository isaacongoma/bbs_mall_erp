import { selectIsLoggedIn, selectSessionUser, useAuthStore } from '@/core/auth/authStore'
import { useHrmsEmployee } from '../stores/employeeStore'
import { useHrmsSettings } from '../stores/settingsStore'
import { useHrmsUser } from '../stores/userStore'

export function useHrmsSession() {
  const isLoggedIn = useAuthStore(selectIsLoggedIn)
  const user = useAuthStore(selectSessionUser)
  const employee = useHrmsEmployee(isLoggedIn)
  const profile = useHrmsUser(isLoggedIn)
  const settings = useHrmsSettings(isLoggedIn)
  return { isLoggedIn, user, employee, profile, settings }
}
