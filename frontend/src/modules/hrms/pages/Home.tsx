import { useMemo } from 'react'
import { __ } from '@/core/i18n'
import { Avatar, Badge, Button, LucideIcon, Spinner } from '@/design-system'
import { CheckInPanel } from '../components/CheckInPanel'
import { RequestPanel } from '../components/RequestPanel'
import { useHrmsSession } from '../hooks/useHrmsSession'

const quickLinks = [
  { label: 'Request Attendance', path: '/hrms/attendance/requests/new', icon: 'calendar-check' },
  { label: 'Request a Shift', path: '/hrms/attendance/shifts/new', icon: 'briefcase-business' },
  { label: 'Request Leave', path: '/hrms/leaves/new', icon: 'calendar-off' },
  { label: 'Claim an Expense', path: '/hrms/expense-claims/new', icon: 'receipt' },
  { label: 'Request an Advance', path: '/hrms/employee-advances/new', icon: 'wallet-cards' },
  { label: 'View Salary Slips', path: '/hrms/salary-slips', icon: 'banknote' },
]

export default function HrmsHome() {
  const { employee, profile, isLoggedIn } = useHrmsSession()
  const displayName = useMemo(
    () => employee?.employee_name || profile?.full_name || profile?.first_name || profile?.name || '',
    [employee, profile],
  )

  if (!isLoggedIn || (!employee && !profile)) {
    return (
      <main className="flex min-h-full items-center justify-center p-6">
        <Spinner className="size-6" />
      </main>
    )
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 sm:p-8">
      <CheckInPanel />
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-ink-gray-8">{__('Quick Links')}</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {quickLinks.map((link) => (
            <Button key={link.path} to={link.path} variant="outline" className="h-auto justify-start gap-3 p-4">
              <LucideIcon name={link.icon} className="size-5 shrink-0 text-ink-gray-5" />
              <span className="text-left">{__(link.label)}</span>
            </Button>
          ))}
        </div>
      </section>
      <RequestPanel />
      <section className="rounded-2xl border border-outline-gray-2 bg-surface-base p-6 shadow-sm sm:p-8">
        <div className="flex items-start gap-4">
          <Avatar label={displayName} image={profile?.user_image ?? employee?.image ?? undefined} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-ink-gray-6">{__('Employee self service')}</p>
            <h1 className="mt-1 truncate text-2xl font-semibold text-ink-gray-9">{displayName}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-ink-gray-6">
              {employee?.designation && <span>{employee.designation}</span>}
              {employee?.department && <Badge theme="gray">{employee.department}</Badge>}
              {employee?.company && <Badge theme="blue">{employee.company}</Badge>}
            </div>
          </div>
        </div>
      </section>
      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-outline-gray-2 bg-surface-base p-5">
          <p className="text-sm text-ink-gray-6">{__('Employee')}</p>
          <p className="mt-2 font-medium text-ink-gray-9">{employee?.name || __('Profile not linked')}</p>
        </article>
        <article className="rounded-2xl border border-outline-gray-2 bg-surface-base p-5">
          <p className="text-sm text-ink-gray-6">{__('Reports to')}</p>
          <p className="mt-2 font-medium text-ink-gray-9">{employee?.reports_to || __('Not assigned')}</p>
        </article>
        <article className="rounded-2xl border border-outline-gray-2 bg-surface-base p-5">
          <p className="text-sm text-ink-gray-6">{__('Account')}</p>
          <p className="mt-2 truncate font-medium text-ink-gray-9">{profile?.name || employee?.user_id || ''}</p>
        </article>
      </section>
    </main>
  )
}
