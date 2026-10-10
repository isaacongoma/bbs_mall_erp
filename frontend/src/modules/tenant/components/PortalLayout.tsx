import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/core/auth/authStore'
import { Avatar, Button, cn, Dropdown, LucideIcon } from '@/design-system'
import logo from '@/app/assets/bbs-mall-logo.png'
import { portalApi } from '../api/portal'
import { activeTenant, usePortalStore } from '../stores/portalStore'
import type { AccessLevel } from '../types/portal'
import { readSeen } from '../utils/notices'
import { ErrorPanel, Loading } from './PortalUi'

interface NavItem {
  to: string
  label: string
  icon: string
  needs?: 'finance' | 'operations' | 'manage'
  feature?: 'sales_declarations'
}

const NAV: NavItem[] = [
  { to: '/tenant', label: 'Overview', icon: 'lucide-layout-dashboard' },
  { to: '/tenant/invoices', label: 'Invoices', icon: 'lucide-receipt', needs: 'finance' },
  { to: '/tenant/payments', label: 'Payments', icon: 'lucide-wallet', needs: 'finance' },
  { to: '/tenant/statement', label: 'Statement', icon: 'lucide-file-text', needs: 'finance' },
  { to: '/tenant/lease', label: 'My Lease', icon: 'lucide-file-signature' },
  { to: '/tenant/maintenance', label: 'Maintenance', icon: 'lucide-wrench', needs: 'operations' },
  { to: '/tenant/meters', label: 'Utilities', icon: 'lucide-zap', needs: 'operations' },
  {
    to: '/tenant/sales',
    label: 'Sales Declaration',
    icon: 'lucide-chart-no-axes-combined',
    needs: 'operations',
    feature: 'sales_declarations',
  },
  { to: '/tenant/notices', label: 'Notices', icon: 'lucide-megaphone' },
  { to: '/tenant/team', label: 'Team', icon: 'lucide-users', needs: 'manage' },
]

const ACCESS: Record<AccessLevel, string[]> = {
  Owner: ['finance', 'operations', 'manage'],
  Finance: ['finance'],
  Operations: ['operations'],
}

function isActive(path: string, current: string) {
  return path === '/tenant' ? current === '/tenant' : current === path || current.startsWith(`${path}/`)
}

export function PortalLayout({
  title,
  children,
  actions,
}: {
  title?: string
  children: ReactNode
  actions?: ReactNode
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const logout = useAuthStore((state) => state.logout)
  const context = usePortalStore((state) => state.context)
  const loading = usePortalStore((state) => state.loading)
  const error = usePortalStore((state) => state.error)
  const tenant = usePortalStore(activeTenant)
  const customer = usePortalStore((state) => state.customer)
  const select = usePortalStore((state) => state.select)
  const [unseen, setUnseen] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const preview = new URLSearchParams(window.location.search).get('customer')
    if (preview) usePortalStore.getState().preview(preview)
    void usePortalStore.getState().load()
  }, [])

  useEffect(() => {
    if (!context || !customer) return undefined
    let live = true
    portalApi
      .notices(customer)
      .then((rows) => {
        if (!live) return
        const seen = readSeen()
        setUnseen(rows.filter((row) => row.published_on && new Date(row.published_on).getTime() > seen).length)
      })
      .catch(() => undefined)
    return () => {
      live = false
    }
  }, [context, customer])

  const level = tenant?.access_level ?? 'Owner'
  const allowed = useMemo(() => {
    const grants = context?.is_staff && !context.tenants.length ? ['finance', 'operations', 'manage'] : ACCESS[level]
    return NAV.filter(
      (item) => (!item.needs || grants.includes(item.needs)) && (!item.feature || context?.settings[item.feature]),
    )
  }, [context, level])

  if (error && !context) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md items-center p-6">
        <ErrorPanel message={error} onRetry={() => void usePortalStore.getState().load()} />
      </div>
    )
  }
  if (!context || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-gray-1">
        <Loading label="Opening your portal" />
      </div>
    )
  }
  if (!context.enabled) {
    return (
      <Notice
        icon="power"
        title="The tenant portal is switched off"
        message="Please contact the management office."
        onSignOut={logout}
      />
    )
  }
  if (!context.tenants.length && !(context.is_staff && customer)) {
    return (
      <Notice
        icon="link-2-off"
        title={context.is_staff ? 'Choose a tenant to preview' : 'Your account is not linked to a tenant yet'}
        message={
          context.is_staff
            ? 'Open the portal from a tenant record using Customer > Tenant > Open Portal as Tenant.'
            : `Ask the management office to invite ${context.user.email ?? 'your email'} to the portal.`
        }
        onSignOut={logout}
        phone={context.settings.support_phone}
        staff={context.is_staff}
        onDesk={() => navigate('/desk')}
      />
    )
  }

  const switcher = context.tenants.length > 1

  return (
    <div className="min-h-screen bg-surface-gray-1 text-ink-gray-9 lg:grid lg:grid-cols-[272px_1fr] print:block print:bg-white">
      <aside className="sticky top-0 hidden h-screen flex-col gap-4 border-r border-outline-gray-2 bg-surface-base p-4 lg:flex print:hidden">
        <Link to="/tenant" className="flex items-center gap-3 px-2 pt-1">
          <img src={logo} alt="BBS Mall" className="h-9 w-auto" />
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a6508]">Tenant Portal</span>
        </Link>
        <div className="rounded-2xl bg-linear-to-br from-[#b8860b] to-[#7a5a06] p-4 text-white shadow-md">
          <p className="text-[11px] uppercase tracking-wider text-white/70">Tenant</p>
          <p className="mt-0.5 truncate text-base font-semibold">{tenant?.customer_name ?? customer}</p>
          {switcher && (
            <select
              value={customer}
              onChange={(event) => select(event.target.value)}
              className="mt-2 w-full rounded-lg border-0 bg-white/15 py-1.5 text-sm text-white focus:ring-white/40"
              aria-label="Switch tenant"
            >
              {context.tenants.map((row) => (
                <option key={row.customer} value={row.customer} className="text-black">
                  {row.customer_name}
                </option>
              ))}
            </select>
          )}
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto" aria-label="Portal">
          {allowed.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                isActive(item.to, location.pathname)
                  ? 'bg-[#b8860b]/12 text-[#8a6508]'
                  : 'text-ink-gray-6 hover:bg-surface-gray-2 hover:text-ink-gray-9',
              )}
            >
              <LucideIcon name={item.icon} className="size-[18px]" />
              {item.label}
              {item.to === '/tenant/notices' && unseen > 0 && (
                <span className="ml-auto rounded-full bg-[#dc2626] px-1.5 text-[11px] font-semibold text-white">
                  {unseen}
                </span>
              )}
            </Link>
          ))}
        </nav>
        <SupportCard />
      </aside>

      <div className="flex min-w-0 flex-col pb-24 lg:pb-0">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-outline-gray-2 bg-surface-base/85 px-4 py-3 backdrop-blur sm:px-8 print:hidden">
          <Link to="/tenant" className="flex items-center gap-2 lg:hidden">
            <img src={logo} alt="BBS Mall" className="h-8 w-auto" />
          </Link>
          <p className="hidden truncate text-sm font-medium text-ink-gray-6 lg:block">{title}</p>
          <div className="ml-auto flex items-center gap-2">
            {actions}
            <Link
              to="/tenant/notices"
              className="relative flex size-9 items-center justify-center rounded-full text-ink-gray-6 hover:bg-surface-gray-2"
              aria-label="Notices"
            >
              <LucideIcon name="bell" className="size-[18px]" />
              {unseen > 0 && <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-[#dc2626]" />}
            </Link>
            <Dropdown
              align="end"
              options={[
                { label: context.user.full_name ?? context.user.email ?? 'Account', disabled: true },
                { label: 'My profile', icon: 'lucide-user-round', onClick: () => navigate('/tenant/profile') },
                ...(context.is_staff
                  ? [{ label: 'Back to staff desk', icon: 'lucide-layout-dashboard', onClick: () => navigate('/desk') }]
                  : []),
                { label: 'Sign out', icon: 'lucide-log-out', theme: 'red' as const, onClick: logout },
              ]}
            >
              <button type="button" className="rounded-full" aria-label="Account menu">
                <Avatar
                  label={context.user.full_name ?? context.user.email ?? 'T'}
                  image={context.user.user_image ?? undefined}
                  size="md"
                />
              </button>
            </Dropdown>
          </div>
        </header>
        {context.is_staff && context.tenants.length === 0 && (
          <div className="bg-[#2563eb]/10 px-4 py-2 text-center text-sm text-[#1d4ed8]">
            Previewing the portal as <strong>{customer}</strong>
          </div>
        )}
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-8 sm:py-8">{children}</main>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-outline-gray-2 bg-surface-base/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden print:hidden"
        aria-label="Portal tabs"
      >
        {allowed.slice(0, 4).map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              'flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium',
              isActive(item.to, location.pathname) ? 'text-[#8a6508]' : 'text-ink-gray-5',
            )}
          >
            <LucideIcon name={item.icon} className="size-5" />
            {item.label.split(' ')[0]}
          </Link>
        ))}
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-ink-gray-5"
        >
          <LucideIcon name="layout-grid" className="size-5" />
          More
        </button>
      </nav>

      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
          />
          <div className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-surface-base p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-outline-gray-3" />
            <div className="grid grid-cols-3 gap-3">
              {allowed.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMenuOpen(false)}
                  className="flex flex-col items-center gap-2 rounded-2xl bg-surface-gray-1 p-3 text-center text-xs font-medium text-ink-gray-8"
                >
                  <LucideIcon name={item.icon} className="size-5 text-[#8a6508]" />
                  {item.label}
                </Link>
              ))}
              <Link
                to="/tenant/profile"
                onClick={() => setMenuOpen(false)}
                className="flex flex-col items-center gap-2 rounded-2xl bg-surface-gray-1 p-3 text-center text-xs font-medium text-ink-gray-8"
              >
                <LucideIcon name="user-round" className="size-5 text-[#8a6508]" />
                Profile
              </Link>
            </div>
            <Button label="Sign out" variant="subtle" theme="red" className="mt-4 w-full" onClick={logout} />
          </div>
        </div>
      )}
    </div>
  )
}

function SupportCard() {
  const settings = usePortalStore((state) => state.context?.settings)
  if (!settings?.support_phone && !settings?.support_email) return null
  return (
    <div className="rounded-2xl border border-outline-gray-2 bg-surface-gray-1 p-3 text-xs text-ink-gray-6">
      <p className="mb-1 flex items-center gap-1.5 font-semibold text-ink-gray-8">
        <LucideIcon name="headset" className="size-4" />
        Management office
      </p>
      {settings.support_phone && (
        <a href={`tel:${settings.support_phone}`} className="block hover:text-ink-gray-9">
          {settings.support_phone}
        </a>
      )}
      {settings.support_email && (
        <a href={`mailto:${settings.support_email}`} className="block truncate hover:text-ink-gray-9">
          {settings.support_email}
        </a>
      )}
    </div>
  )
}

function Notice({
  icon,
  title,
  message,
  onSignOut,
  phone,
  staff,
  onDesk,
}: {
  icon: string
  title: string
  message: string
  onSignOut: () => void
  phone?: string
  staff?: boolean
  onDesk?: () => void
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-gray-1 p-6">
      <div className="w-full max-w-md rounded-3xl border border-outline-gray-2 bg-surface-base p-8 text-center shadow-lg">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-[#b8860b]/12 text-[#8a6508]">
          <LucideIcon name={icon} className="size-6" />
        </span>
        <h1 className="mt-4 text-xl font-semibold text-ink-gray-9">{title}</h1>
        <p className="mt-2 text-sm text-ink-gray-6">{message}</p>
        {phone && <p className="mt-3 text-sm font-medium text-ink-gray-8">{phone}</p>}
        <div className="mt-6 flex justify-center gap-2">
          {staff && onDesk && <Button label="Go to desk" variant="subtle" onClick={onDesk} />}
          <Button label="Sign out" variant="solid" onClick={onSignOut} />
        </div>
      </div>
    </div>
  )
}
