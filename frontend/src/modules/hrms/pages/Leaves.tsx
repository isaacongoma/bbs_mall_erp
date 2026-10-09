import { __ } from '@/core/i18n'
import { Badge, Button, Spinner } from '@/design-system'
import { Link } from 'react-router-dom'
import { RequestList } from '../components/RequestList'
import { Holidays } from '../components/Holidays'
import { useHrmsEmployee } from '../stores/employeeStore'
import { useHolidays, useLeaveBalance, useLeaves } from '../stores/leaveStore'

export default function Leaves() {
  const employee = useHrmsEmployee()
  const leaves = useLeaves(employee)
  const balance = useLeaveBalance()
  const holidays = useHolidays(employee)

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-7 p-4 sm:p-8">
      <section className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold text-ink-gray-9">{__('Leaves & Holidays')}</h1>
        {balance.resource.loading && !balance.resource.data ? (
          <div className="flex justify-center py-8">
            <Spinner size="md" />
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(balance.balance).map(([name, values]) => (
              <article key={name} className="rounded-xl border border-outline-gray-2 bg-surface-base p-4">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="truncate font-medium text-ink-gray-8">{name}</h2>
                  <Badge theme="blue" label={values.balance_leaves ?? 0} />
                </div>
                <p className="mt-3 text-sm text-ink-gray-6">{__('Available balance')}</p>
                <p className="mt-1 text-2xl font-semibold text-ink-gray-9">{values.balance_leaves ?? 0}</p>
              </article>
            ))}
          </div>
        )}
      </section>
      <Holidays holidays={holidays.holidays} loading={holidays.resource.loading} error={holidays.resource.error} />
      <Button to={{ pathname: '/hrms/leaves/new' }} variant="solid" size="lg">
        {__('Request a Leave')}
      </Button>
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink-gray-8">{__('Recent Leaves')}</h2>
          <Link className="text-sm text-ink-blue-7" to="/hrms/leaves/list">
            {__('View all')}
          </Link>
        </div>
        <RequestList
          items={leaves.leaves}
          loading={leaves.resource.loading}
          error={leaves.resource.error}
          kind="leave"
          emptyName="Leaves"
        />
      </section>
    </main>
  )
}
