import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/design-system'
import { portalApi } from '../api/portal'
import { PayDialog } from '../components/PayDialog'
import { PortalLayout } from '../components/PortalLayout'
import { Card, EmptyState, ErrorPanel, Loading, PageHeading, Segmented, StatusBadge } from '../components/PortalUi'
import { usePortalQuery } from '../hooks/usePortalQuery'
import { usePortalStore } from '../stores/portalStore'
import { formatDate, formatMoney, invoiceState } from '../utils/format'

type Filter = 'all' | 'unpaid' | 'paid'

const PAGE = 20

export default function Invoices() {
  const mpesa = usePortalStore((state) => state.context?.settings.mpesa)
  const [filter, setFilter] = useState<Filter>('all')
  const [limit, setLimit] = useState(PAGE)
  const [paying, setPaying] = useState<{ amount: number; invoice: string } | null>(null)
  const { data, loading, error, reload } = usePortalQuery(
    (customer) => portalApi.invoices(customer, filter, 0, limit),
    [filter, limit],
  )

  return (
    <PortalLayout title="Invoices">
      <div className="flex flex-col gap-6">
        <PageHeading
          title="Invoices"
          subtitle="Rent, service charges and other bills issued to you"
          actions={
            <Segmented
              value={filter}
              onChange={(value) => {
                setFilter(value)
                setLimit(PAGE)
              }}
              options={[
                { value: 'all', label: 'All' },
                { value: 'unpaid', label: 'Unpaid' },
                { value: 'paid', label: 'Paid' },
              ]}
            />
          }
        />
        {error && <ErrorPanel message={error} onRetry={reload} />}
        {loading && !data && <Loading />}
        {data && (
          <Card bodyClassName="p-0 sm:p-0">
            {data.rows.length === 0 ? (
              <EmptyState icon="receipt" title="No invoices" message="Nothing matches this filter." />
            ) : (
              <>
                <div className="hidden grid-cols-[1.4fr_1fr_1fr_1fr_1fr_auto] gap-4 border-b border-outline-gray-2 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-ink-gray-5 md:grid">
                  <span>Invoice</span>
                  <span>Period</span>
                  <span>Due</span>
                  <span className="text-right">Amount</span>
                  <span className="text-right">Balance</span>
                  <span className="w-32 text-right">Status</span>
                </div>
                <ul className="divide-y divide-outline-gray-1">
                  {data.rows.map((invoice) => {
                    const state = invoiceState(invoice)
                    return (
                      <li
                        key={invoice.name}
                        className="grid grid-cols-2 items-center gap-x-4 gap-y-1 px-5 py-4 md:grid-cols-[1.4fr_1fr_1fr_1fr_1fr_auto]"
                      >
                        <Link
                          to={`/tenant/invoices/${encodeURIComponent(invoice.name)}`}
                          className="font-medium text-ink-gray-9 hover:text-[#8a6508]"
                        >
                          {invoice.name}
                          {invoice.late_fee_for && (
                            <span className="ml-2 text-xs font-normal text-[#b91c1c]">Late fee</span>
                          )}
                        </Link>
                        <span className="text-right text-sm text-ink-gray-6 md:text-left">
                          {invoice.billing_period_start
                            ? `${formatDate(invoice.billing_period_start, 'D MMM')} - ${formatDate(invoice.billing_period_end, 'D MMM YYYY')}`
                            : formatDate(invoice.posting_date)}
                        </span>
                        <span className="text-sm text-ink-gray-6">{formatDate(invoice.due_date)}</span>
                        <span className="text-right text-sm font-medium text-ink-gray-9">
                          {formatMoney(invoice.grand_total)}
                        </span>
                        <span className="text-sm font-semibold text-ink-gray-9 md:text-right">
                          {formatMoney(invoice.outstanding_amount)}
                        </span>
                        <span className="flex items-center justify-end gap-2 md:w-32">
                          <StatusBadge status={state} />
                          {mpesa && invoice.outstanding_amount > 0 && (
                            <Button
                              label="Pay"
                              size="sm"
                              variant="solid"
                              theme="green"
                              onClick={() => setPaying({ amount: invoice.outstanding_amount, invoice: invoice.name })}
                            />
                          )}
                        </span>
                      </li>
                    )
                  })}
                </ul>
                {data.rows.length < data.total && (
                  <div className="flex justify-center border-t border-outline-gray-1 p-4">
                    <Button
                      label={`Show more (${data.total - data.rows.length} left)`}
                      variant="subtle"
                      onClick={() => setLimit((value) => value + PAGE)}
                    />
                  </div>
                )}
              </>
            )}
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
