import { useAuthStore } from '@/core/auth/authStore'
import { resetHrmsEmployee } from './employeeStore'
import { resetHrmsSettings } from './settingsStore'
import { resetHrmsUser } from './userStore'

export function logoutHrms(): void {
  resetHrmsUser()
  resetHrmsEmployee()
  resetHrmsSettings()
  useAuthStore.getState().logout()
}
