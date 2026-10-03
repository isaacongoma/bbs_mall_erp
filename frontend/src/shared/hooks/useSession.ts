import { selectIsLoggedIn, selectSessionUser, useAuthStore } from '@/core/auth/authStore'

export function useSession() {
  const user = useAuthStore(selectSessionUser)
  const isLoggedIn = useAuthStore(selectIsLoggedIn)
  const logout = useAuthStore((state) => state.logout)
  return { user, isLoggedIn, logout }
}
