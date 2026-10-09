import { useRoute } from '@/core/navigation'
import { __ } from '@/core/i18n'
import { Avatar, LucideIcon } from '@/design-system'
import { Link } from 'react-router-dom'
import { useHrmsSession } from './hooks/useHrmsSession'
import { useUnreadNotificationCount } from './stores/notificationStore'

const tabs = [
  { label: 'Home', path: '/hrms/home', icon: 'house' },
  { label: 'Attendance', path: '/hrms/attendance', icon: 'calendar-check' },
  { label: 'Leaves', path: '/hrms/leaves', icon: 'calendar-off' },
  { label: 'Expenses', path: '/hrms/expense-claims', icon: 'receipt' },
  { label: 'Salary', path: '/hrms/salary-slips', icon: 'wallet-cards' },
]

function isHrmsRoute(path: string): boolean {
  return path.startsWith('/hrms')
}

export function HrmsHeaderActions() {
  const route = useRoute()
  const { employee, profile } = useHrmsSession()
  const count = useUnreadNotificationCount(isHrmsRoute(route.path))
  if (!isHrmsRoute(route.path)) return null
  const name = employee?.employee_name || profile?.full_name || profile?.first_name || profile?.name || ''
  return (
    <div className="flex items-center gap-2">
      <Link
        to="/hrms/notifications"
        className="relative rounded p-1.5 text-ink-gray-7 hover:bg-surface-gray-2"
        aria-label={__('Notifications')}
      >
        <LucideIcon name="bell" className="size-4" />
        {count > 0 && <span className="absolute right-1 top-1 size-1.5 rounded-full bg-surface-red-7" />}
      </Link>
      <Link to="/hrms/profile" aria-label={__('Profile')}>
        <Avatar label={name} image={profile?.user_image ?? employee?.image ?? undefined} size="sm" />
      </Link>
    </div>
  )
}

export function HrmsMobileTabs({ mobile }: { mobile: boolean }) {
  const route = useRoute()
  if (!mobile || !isHrmsRoute(route.path)) return null
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-outline-gray-2 bg-surface-base/95 pb-safe backdrop-blur"
      aria-label={__('HRMS navigation')}
    >
      {tabs.map((tab) => (
        <Link
          key={tab.path}
          to={tab.path}
          className={`flex flex-col items-center gap-1 px-1 py-2 text-[11px] ${route.path === tab.path ? 'font-semibold text-ink-gray-9' : 'text-ink-gray-5'}`}
        >
          <LucideIcon name={tab.icon} className="size-4" />
          <span>{__(tab.label)}</span>
        </Link>
      ))}
    </nav>
  )
}
