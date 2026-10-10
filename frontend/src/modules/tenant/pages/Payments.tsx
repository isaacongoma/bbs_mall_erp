import { useState } from 'react'
import { Button } from '@/design-system'
import { portalApi } from '../api/portal'
import { PayDialog } from '../components/PayDialog'
import { PortalLayout } from '../components/PortalLayout'
import { Card, EmptyState, ErrorPanel, IconTile, Loading, PageHeading, StatusBadge } from '../components/PortalUi'
import { usePortalQuery } from '../hooks/usePortalQuery'
import { usePortalStore } from '../stores/portalStore'
import { formatDate, formatDateTime, formatMoney } from '../utils/format'

export default function Payments() {
  const settings = usePortalStore((state) => state.context?.settings)
  const [paying, setPaying] = useState(false)
  const { data, loading, error, reload } = usePortalQuery((customer) => portalApi.payments(customer))
  const balance = usePortalQuery((customer) => portalApi.dashboard(customer))

  return (
    <PortalLayout title="Payments">
      <div className="flex flex-col gap-6">
        <PageHeading
          title="Payments"
          subtitle="Everything you have paid, including M-Pesa transactions"
          actions={
            settings?.mpesa && (balance.data?.balance.outstanding ?? 0) > 0 ? (
              <Button
                label={`Pay ${formatMoney(balance.data?.balance.outstanding)}`}
                variant="solid"
                theme="green"
                iconLeft="lucide-smartphone"
                onClick={() => setPaying(true)}
              />
            ) : undefined
          }
        />
        {(settings?.paybill || settings?.till) && (
          <Card>
            <div className="flex flex-wrap items-center gap-4">
              <IconTile icon="smartphone" tone="green" />
              <div className="min-w-0 flex-1 text-sm text-ink-gray-7">
                <p className="font-semibold text-ink-gray-9">Pay by M-Pesa</p>
                <p>
                  {settings.paybill ? (
                    <>
                      Paybill <strong>{settings.paybill}</strong>, account number <strong>your tenant number</strong>
                    </>
                  ) : (
                    <>
                      Buy Goods Till <strong>{settings.till}</strong>
                    </>
                  )}
                  . Payments are matched to your invoices automatically.
                </p>
              </div>
            </div>
          </Card>
        )}
        {loading && !data && <Loading />}
        {error && <ErrorPanel message={error} onRetry={reload} />}
        {data && (
          <div className="grid gap-6 lg:grid-cols-5">
            <Card title="Payment history" className="lg:col-span-3" bodyClassName="p-0 sm:p-0">
              {data.payments.length ? (
                <ul className="divide-y divide-outline-gray-1">
                  {data.payments.map((payment) => (
                    <li key={payment.name} className="flex items-center gap-3 px-5 py-3.5">
                      <IconTile icon="circle-check" tone="green" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink-gray-9">
                          {payment.mode_of_payment || 'Payment'}
                        </p>
                        <p className="truncate text-xs text-ink-gray-5">
                          {formatDate(payment.posting_date)} - {payment.reference_no || payment.name}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-[#15803d]">{formatMoney(payment.paid_amount)}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  icon="wallet"
                  title="No payments yet"
                  message="Your payments will be listed here as soon as they are received."
                />
              )}
            </Card>
            <Card title="M-Pesa activity" className="lg:col-span-2" bodyClassName="p-0 sm:p-0">
              {data.mpesa.length ? (
                <ul className="divide-y divide-outline-gray-1">
                  {data.mpesa.map((row) => (
                    <li key={row.name} className="flex items-center gap-3 px-5 py-3.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink-gray-9">
                          {row.transaction_id || row.source}
                        </p>
                        <p className="truncate text-xs text-ink-gray-5">
                          {formatDateTime(row.transaction_time || row.creation)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-ink-gray-9">{formatMoney(row.amount)}</p>
                        <StatusBadge status={row.status} />
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState icon="smartphone" title="No M-Pesa activity" />
              )}
            </Card>
          </div>
        )}
      </div>
      <PayDialog
        open={paying}
        onOpenChange={setPaying}
        amount={balance.data?.balance.outstanding ?? 0}
        onPaid={() => {
          reload()
          balance.reload()
        }}
      />
    </PortalLayout>
  )
}
