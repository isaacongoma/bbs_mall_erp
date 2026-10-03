import { Outlet } from 'react-router-dom'
import { RouterBridge, useRoute } from '@/core/navigation'
import { UIProvider, useMediaQuery } from '@/design-system'
import { useSession } from '@/shared/hooks/useSession'
import { Login } from '../pages/Login'
import { useBootOnLogin } from '../hooks/useBootOnLogin'
import { DesktopLayout } from './DesktopLayout'
import { MobileLayout } from './MobileLayout'

export function AppRoot() {
  const { isLoggedIn } = useSession()
  const route = useRoute()
  const isMobile = useMediaQuery('(max-width: 639px)')
  useBootOnLogin(isLoggedIn)

  const Layout = isMobile ? MobileLayout : DesktopLayout

  return (
    <UIProvider>
      <RouterBridge />
      {route.name === 'Not Permitted' ? (
        <Outlet />
      ) : !isLoggedIn ? (
        <Login />
      ) : (
        <Layout>
          <Outlet key={route.fullPath} />
        </Layout>
      )}
    </UIProvider>
  )
}
