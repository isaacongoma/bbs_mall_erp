import { __ } from '@/core/i18n'
import { Badge, Button, Spinner } from '@/design-system'
import { Link } from 'react-router-dom'
import { RequestList } from '../components/RequestList'
import { useHrmsEmployee } from '../stores/employeeStore'
import { useAdvances, useClaimSummary, useClaims } from '../stores/financeStore'

export default function ExpenseClaims() {
  const employee = useHrmsEmployee()
  const claims = useClaims(employee)
  const summary = useClaimSummary()
  const advances = useAdvances()

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-7 p-4 sm:p-8">
      <h1 className="text-2xl font-semibold text-ink-gray-9">{__('Expense Claims')}</h1>
      {summary.resource.loading && !summary.resource.data ? (
        <div className="flex justify-center py-8">
          <Spinner size="md" />
        </div>
      ) : (
        <section className="grid gap-3 sm:grid-cols-3">
          {[
            ['Pending', summary.summary.total_pending_amount],
            ['Approved', summary.summary.total_approved_amount],
            ['Rejected', summary.summary.total_rejected_amount],
          ].map(([label, amount]) => (
            <article key={String(label)} className="rounded-xl border border-outline-gray-2 bg-surface-base p-4">
              <p className="text-sm text-ink-gray-6">{__(String(label))}</p>
              <p className="mt-2 text-xl font-semibold text-ink-gray-9">
                {String(amount ?? 0)} {String(summary.summary.currency ?? '')}
              </p>
            </article>
          ))}
        </section>
      )}
      <Button to={{ pathname: '/hrms/expense-claims/new' }} variant="solid" size="lg">
        {__('Claim an Expense')}
      </Button>
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink-gray-8">{__('Recent Expenses')}</h2>
          <Link className="text-sm text-ink-blue-7" to="/hrms/expense-claims/list">
            {__('View all')}
          </Link>
        </div>
        <RequestList
          items={claims.claims}
          loading={claims.resource.loading}
          error={claims.resource.error}
          kind="expense"
          emptyName="Expense Claims"
        />
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-ink-gray-8">{__('Employee Advance Balance')}</h2>
        {advances.resource.loading && !advances.resource.data ? (
          <div className="flex justify-center py-8">
            <Spinner size="md" />
          </div>
        ) : !advances.advances.length ? (
          <p className="rounded-xl border border-outline-gray-2 p-4 text-sm text-ink-gray-6">
            {__('No outstanding advances')}
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {advances.advances.map((advance) => (
              <article key={advance.name} className="rounded-xl border border-outline-gray-2 bg-surface-base p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="truncate font-medium text-ink-gray-8">{advance.purpose || advance.name}</h3>
                  <Badge theme="blue" label={String(advance.status ?? '')} />
                </div>
                <p className="mt-3 text-2xl font-semibold text-ink-gray-9">
                  {String(advance.balance_amount ?? 0)} {String(advance.currency ?? '')}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
