import { __ } from '@/core/i18n'
import { Avatar, Button, ItemListRow, LucideIcon } from '@/design-system'
import { Link } from 'react-router-dom'
import { useState } from 'react'
import { useHrmsSession } from '../hooks/useHrmsSession'
import { ProfileInfoDialog, type ProfileInfoSection } from '../components/ProfileInfoDialog'
import { logoutHrms } from '../stores/sessionStore'

const profileSections: ProfileInfoSection[] = [
  {
    title: __('Employee Details'),
    fields: ['employee_name', 'employee_number', 'gender', 'date_of_birth', 'date_of_joining', 'blood_group'],
  },
  {
    title: __('Company Information'),
    fields: ['company', 'department', 'designation', 'branch', 'grade', 'reports_to', 'employment_type'],
  },
  {
    title: __('Contact Information'),
    fields: ['cell_number', 'personal_email', 'company_email', 'preferred_email'],
  },
  {
    title: __('Salary Information'),
    fields: [
      'ctc',
      'payroll_cost_center',
      'pan_number',
      'provident_fund_account',
      'salary_mode',
      'bank_name',
      'bank_ac_no',
      'ifsc_code',
      'micr_code',
      'iban',
    ],
  },
]

export default function Profile() {
  const { employee, profile } = useHrmsSession()
  const [section, setSection] = useState<ProfileInfoSection | null>(null)
  const name = employee?.employee_name || profile?.full_name || profile?.first_name || profile?.name || ''
  const links = [
    { label: __('Notifications'), icon: 'bell', to: '/hrms/notifications' },
    { label: __('Settings'), icon: 'settings', to: '/hrms/settings' },
  ]
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col items-center gap-6 p-4 sm:p-8">
      <section className="flex w-full flex-col items-center rounded-xl border border-outline-gray-2 bg-surface-base p-6">
        <Avatar label={name} image={profile?.user_image ?? employee?.image ?? undefined} size="xl" />
        <h1 className="mt-4 text-xl font-semibold text-ink-gray-9">{name}</h1>
        <p className="mt-1 text-sm text-ink-gray-6">{employee?.designation ?? ''}</p>
      </section>
      <section className="w-full overflow-hidden rounded-xl border border-outline-gray-2 bg-surface-base">
        {profileSections.map((item) => (
          <button
            key={item.title}
            type="button"
            className="block w-full border-b border-outline-gray-1 text-left last:border-b-0 hover:bg-surface-gray-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-outline-gray-3"
            onClick={() => setSection(item)}
          >
            <ItemListRow
              size="lg"
              prefix={<LucideIcon name="user" className="size-5 text-ink-gray-5" />}
              suffix={<LucideIcon name="chevron-right" className="size-4 text-ink-gray-5" />}
            >
              {item.title}
            </ItemListRow>
          </button>
        ))}
        {links.map((link) => (
          <Link key={link.to} to={link.to}>
            <ItemListRow
              size="lg"
              className="border-b border-outline-gray-1 last:border-b-0"
              prefix={<LucideIcon name={link.icon} className="size-5 text-ink-gray-5" />}
              suffix={<LucideIcon name="chevron-right" className="size-4 text-ink-gray-5" />}
            >
              {link.label}
            </ItemListRow>
          </Link>
        ))}
      </section>
      <Button variant="outline" theme="red" className="w-full" onClick={logoutHrms}>
        {__('Log Out')}
      </Button>
      <ProfileInfoDialog employee={employee} section={section} onClose={() => setSection(null)} />
    </main>
  )
}
