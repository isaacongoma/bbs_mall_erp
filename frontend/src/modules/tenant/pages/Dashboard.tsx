import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, LucideIcon } from '@/design-system'
import { portalApi } from '../api/portal'
import { BillingChart } from '../components/BillingChart'
import { PayDialog } from '../components/PayDialog'
import { PortalLayout } from '../components/PortalLayout'
import { Card, EmptyState, ErrorPanel, IconTile, Loading, StatCard, StatusBadge } from '../components/PortalUi'
import { usePortalQuery } from '../hooks/usePortalQuery'
import { usePortalStore } from '../stores/portalStore'
import type { LeaseSummary } from '../types/portal'
import { firstName, formatDate, formatMoney, greeting, invoiceState, relativeDays } from '../utils/format'

function termProgress(lease: LeaseSummary): number {
  const start = new Date(lease.start_date).getTime()
  const end = new Date(lease.end_date).getTime()
  return Math.min(100, Math.max(0, ((Date.now() - start) / Math.max(1, end - start)) * 100))
}

export default function Dashboard() {
  const navigate = useNavigate()
  const context = usePortalStore((state) => state.context)
  const { data, loading, error, reload } = usePortalQuery((customer) => portalApi.dashboard(customer))
  const [paying, setPaying] = useState<{ amount: number; invoice?: string } | null>(null)

  if (loading && !data) {
    return (
      <PortalLayout title="Overview">
        <Loading />
      </PortalLayout>
    )
  }
  if (error || !data) {
    return (
      <PortalLayout title="Overview">
        <ErrorPanel message={error ?? 'Unable to load your overview.'} onRetry={reload} />
      </PortalLayout>
    )
  }

  const finance = data.access_level !== 'Operations'
  const operations = data.access_level !== 'Finance'
  const nextDue = data.next_due?.[0]
  const deposit = data.leases.reduce((sum, lease) => sum + Number(lease.deposit_balance || 0), 0)
  const canPay = Boolean(context?.settings.mpesa) && data.balance.outstanding > 0

  return (
    <PortalLayout title="Overview">
      <div className="flex flex-col gap-6">
        <section className="relative overflow-hidden rounded-3xl bg-linear-to-br from-[#1f1a0b] via-[#3b2e0c] to-[#8a6508] p-6 text-white shadow-lg sm:p-8">
          <div className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-[#d4a017]/25 blur-3xl" />
          <div className="relative flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-sm text-white/70">{greeting()},</p>
              <h1 className="mt-0.5 text-2xl font-semibold tracking-tight sm:text-3xl">
                {firstName(context?.user.full_name) || data.customer_name}
              </h1>
              <p className="mt-2 max-w-xl text-sm text-white/75">
                {context?.settings.welcome || `${data.customer_name} - everything about your space in one place.`}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {finance && canPay && (
                <Button
                  label="Pay now"
                  variant="solid"
                  className="bg-white! text-[#3b2e0c]! hover:bg-white/90!"
                  iconLeft="lucide-smartphone"
                  onClick={() => setPaying({ amount: data.balance.outstanding })}
                />
              )}
              {operations && (
                <Button
                  label="Report an issue"
                  variant="subtle"
                  iconLeft="lucide-wrench"
                  className="bg-white/15! text-white! hover:bg-white/25!"
                  onClick={() => navigate('/tenant/maintenance/new')}
                />
              )}
              {finance && (
                <Button
                  label="Statement"
                  variant="subtle"
                  iconLeft="lucide-file-text"
                  className="bg-white/15! text-white! hover:bg-white/25!"
                  onClick={() => navigate('/tenant/statement')}
                />
              )}
            </div>
          </div>
        </section>

        {finance && (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              label="Outstanding"
              value={formatMoney(data.balance.outstanding)}
              icon="wallet"
              tone="gold"
              emphasis
              hint={data.balance.outstanding > 0 ? 'Across all invoices' : 'You are all settled'}
            />
            <StatCard
              label="Overdue"
              value={formatMoney(data.balance.overdue)}
              icon="clock-alert"
              tone={data.balance.overdue > 0 ? 'red' : 'green'}
              hint={data.balance.overdue > 0 ? 'Please settle to avoid late fees' : 'Nothing overdue'}
            />
            <StatCard
              label="Next due"
              value={nextDue ? formatDate(nextDue.due_date, 'D MMM') : '-'}
              icon="calendar-clock"
              tone="blue"
              hint={
                nextDue
                  ? `${formatMoney(nextDue.outstanding_amount)} ${relativeDays(nextDue.due_date)}`
                  : 'No invoices waiting'
              }
            />
            <StatCard
              label="Deposit held"
              value={formatMoney(deposit)}
              icon="shield-check"
              tone="violet"
              hint="Refundable security deposit"
            />
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {finance && (
            <Card
              title="Billed vs paid"
              className="lg:col-span-2"
              action={
                <Link to="/tenant/statement" className="text-sm font-medium text-[#8a6508]">
                  Full statement
                </Link>
              }
            >
              {data.monthly && data.monthly.some((point) => point.billed || point.paid) ? (
                <BillingChart data={data.monthly} />
              ) : (
                <EmptyState
                  icon="chart-column"
                  title="No billing yet"
                  message="Your monthly billing and payments will appear here once your first invoice is issued."
                />
              )}
            </Card>
          )}

          <div className={finance ? 'flex flex-col gap-6' : 'flex flex-col gap-6 lg:col-span-3'}>
            {data.leases.map((lease) => (
              <Card key={lease.name} title="My lease" action={<StatusBadge status={lease.status} />}>
                <div className="flex flex-col gap-3">
                  <div>
                    <p className="text-sm font-medium text-ink-gray-9">
                      {lease.units.map((unit) => unit.unit).join(', ')}
                    </p>
                    <p className="text-xs text-ink-gray-5">{lease.property}</p>
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between text-xs text-ink-gray-5">
                      <span>{formatDate(lease.start_date)}</span>
                      <span>{formatDate(lease.end_date)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-surface-gray-2">
                      <div
                        className="h-full rounded-full bg-linear-to-r from-[#d4a017] to-[#8a6508]"
                        style={{ width: `${termProgress(lease)}%` }}
                      />
                    </div>
                    <p className="mt-1.5 text-xs text-ink-gray-6">
                      {lease.days_left > 0 ? `${lease.days_left} days remaining` : 'Lease has ended'}
                    </p>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-surface-gray-1 px-3 py-2 text-sm">
                    <span className="text-ink-gray-5">Monthly rent</span>
                    <span className="font-semibold text-ink-gray-9">{formatMoney(lease.total_monthly_rent)}</span>
                  </div>
                  <Link to="/tenant/lease" className="text-sm font-medium text-[#8a6508]">
                    View lease details
                  </Link>
                </div>
              </Card>
            ))}
            {data.leases.length === 0 && (
              <Card title="My lease">
                <EmptyState
                  icon="file-signature"
                  title="No active lease"
                  message="Your lease will show here once it is active."
                />
              </Card>
            )}
          </div>
        </div>

        {finance && (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card
              title="Recent invoices"
              action={
                <Link to="/tenant/invoices" className="text-sm font-medium text-[#8a6508]">
                  View all
                </Link>
              }
              bodyClassName="p-0 sm:p-0"
            >
              {(data.recent_invoices ?? []).length ? (
                <ul className="divide-y divide-outline-gray-1">
                  {data.recent_invoices?.map((invoice) => (
                    <li key={invoice.name}>
                      <Link
                        to={`/tenant/invoices/${encodeURIComponent(invoice.name)}`}
                        className="flex items-center gap-3 px-5 py-3 hover:bg-surface-gray-1"
                      >
                        <IconTile icon="receipt" tone="gold" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-ink-gray-9">{invoice.name}</p>
                          <p className="text-xs text-ink-gray-5">Due {formatDate(invoice.due_date)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-ink-gray-9">{formatMoney(invoice.grand_total)}</p>
                          <StatusBadge status={invoiceState(invoice)} />
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState icon="receipt" title="No invoices yet" />
              )}
            </Card>
            <Card
              title="Recent payments"
              action={
                <Link to="/tenant/payments" className="text-sm font-medium text-[#8a6508]">
                  View all
                </Link>
              }
              bodyClassName="p-0 sm:p-0"
            >
              {(data.recent_payments ?? []).length ? (
                <ul className="divide-y divide-outline-gray-1">
                  {data.recent_payments?.map((payment) => (
                    <li key={payment.name} className="flex items-center gap-3 px-5 py-3">
                      <IconTile icon="circle-check" tone="green" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink-gray-9">
                          {payment.mode_of_payment || 'Payment'}
                        </p>
                        <p className="text-xs text-ink-gray-5">
                          {formatDate(payment.posting_date)} {payment.reference_no ? `- ${payment.reference_no}` : ''}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-[#15803d]">{formatMoney(payment.paid_amount)}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState icon="wallet" title="No payments yet" />
              )}
            </Card>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          {operations && (
            <Card
              title="Maintenance"
              action={
                <Link to="/tenant/maintenance" className="text-sm font-medium text-[#8a6508]">
                  All requests
                </Link>
              }
            >
              {(data.recent_requests ?? []).length ? (
                <ul className="flex flex-col gap-3">
                  {data.recent_requests?.map((request) => (
                    <li key={request.name}>
                      <Link
                        to={`/tenant/maintenance/${encodeURIComponent(request.name)}`}
                        className="flex items-center gap-3 rounded-xl p-2 hover:bg-surface-gray-1"
                      >
                        <IconTile icon="wrench" tone="blue" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-ink-gray-9">{request.subject}</p>
                          <p className="text-xs text-ink-gray-5">
                            {request.category} - {formatDate(request.opened_on)}
                          </p>
                        </div>
                        <StatusBadge status={request.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  icon="wrench"
                  title="Nothing to fix"
                  message="Report a problem and the maintenance team will take it from there."
                  action={
                    <Button
                      label="Report an issue"
                      variant="solid"
                      onClick={() => navigate('/tenant/maintenance/new')}
                    />
                  }
                />
              )}
            </Card>
          )}
          <Card
            title="Notices"
            action={
              <Link to="/tenant/notices" className="text-sm font-medium text-[#8a6508]">
                All notices
              </Link>
            }
          >
            {data.notices.length ? (
              <ul className="flex flex-col gap-3">
                {data.notices.map((notice) => (
                  <li key={notice.name} className="flex gap-3 rounded-xl p-2">
                    <IconTile
                      icon="megaphone"
                      tone={notice.priority === 'Urgent' ? 'red' : notice.priority === 'Important' ? 'gold' : 'blue'}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink-gray-9">{notice.title}</p>
                      <p className="text-xs text-ink-gray-5">{formatDate(notice.published_on)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                icon="megaphone"
                title="No notices"
                message="Announcements from the management office will appear here."
              />
            )}
          </Card>
        </div>

        {data.units.length > 0 && (
          <Card title="My spaces">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.units.map((unit) => (
                <div key={unit.unit} className="flex items-center gap-3 rounded-xl border border-outline-gray-2 p-3">
                  <LucideIcon name="store" className="size-5 text-[#8a6508]" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink-gray-9">{unit.unit_name || unit.unit}</p>
                    <p className="text-xs text-ink-gray-5">
                      {unit.unit_type} - {unit.area_sqm} sqm
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      <PayDialog
        open={paying !== null}
        onOpenChange={(open) => !open && setPaying(null)}
        amount={paying?.amount ?? 0}
        invoice={paying?.invoice}
        onPaid={reload}
      />
    </PortalLayout>
  )
}
