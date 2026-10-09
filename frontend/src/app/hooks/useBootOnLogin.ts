import { useEffect } from 'react'
import { useBootStore } from '@/core/boot'
import { loadDeskBoot } from '@/shared/frappe/boot'

export function useBootOnLogin(isLoggedIn: boolean): void {
  useEffect(() => {
    const { loaded, load } = useBootStore.getState()
    if (isLoggedIn && !loaded) void load().catch(() => undefined)
    if (isLoggedIn) void loadDeskBoot().catch(() => undefined)
  }, [isLoggedIn])
}
