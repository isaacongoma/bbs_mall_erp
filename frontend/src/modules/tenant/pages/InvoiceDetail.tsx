import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useRoute } from '@/core/navigation'
import { Button } from '@/design-system'
import { portalApi } from '../api/portal'
import { PayDialog } from '../components/PayDialog'
import { PortalLayout } from '../components/PortalLayout'
import { ErrorPanel, Loading, StatusBadge } from '../components/PortalUi'
import { usePortalQuery } from '../hooks/usePortalQuery'
import { usePortalStore } from '../stores/portalStore'
import { formatDate, formatMoney, formatNumber, invoiceState } from '../utils/format'

export default function InvoiceDetail() {
  const route = useRoute()
  const navigate = useNavigate()
  const name = decodeURIComponent(route.params.name ?? '')
  const mpesa = usePortalStore((state) => state.context?.settings.mpesa)
  const [paying, setPaying] = useState(false)
  const { data, loading, error, reload } = usePortalQuery((customer) => portalApi.invoice(name, customer), [name])

  return (
    <PortalLayout title={name}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <button
            type="button"
            onClick={() => navigate('/tenant/invoices')}
            className="text-sm font-medium text-ink-gray-6 hover:text-ink-gray-9"
          >
            &larr; All invoices
          </button>
          <div className="flex gap-2">
            <Button
              label="Print / Save PDF"
              iconLeft="lucide-printer"
              variant="subtle"
              onClick={() => window.print()}
            />
            {data && mpesa && data.outstanding_amount > 0 && (
              <Button
                label={`Pay ${formatMoney(data.outstanding_amount)}`}
                variant="solid"
                theme="green"
                onClick={() => setPaying(true)}
              />
            )}
          </div>
        </div>
        {loading && !data && <Loading />}
        {error && <ErrorPanel message={error} onRetry={reload} />}
        {data && (
          <article className="mx-auto w-full max-w-3xl rounded-3xl border border-outline-gray-2 bg-white p-6 text-gray-900 shadow-sm sm:p-10 print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none">
            <header className="flex flex-wrap items-start justify-between gap-6 border-b border-gray-200 pb-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8a6508]">Tax Invoice</p>
                <h1 className="mt-1 text-2xl font-semibold">{data.name}</h1>
                <div className="mt-2">
                  <StatusBadge status={invoiceState({ ...data })} />
                </div>
              </div>
              <div className="text-right text-sm text-gray-600">
                <p className="font-semibold text-gray-900">{data.company.company_name}</p>
                {data.company.tax_id && <p>PIN {data.company.tax_id}</p>}
                {data.company.phone_no && <p>{data.company.phone_no}</p>}
                {data.company.email && <p>{data.company.email}</p>}
              </div>
            </header>
            <section className="grid gap-6 py-6 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Billed to</p>
                <p className="mt-1 font-semibold">{data.customer_name}</p>
                {data.tax_id && <p className="text-sm text-gray-600">PIN {data.tax_id}</p>}
                {data.property && <p className="text-sm text-gray-600">{data.property}</p>}
              </div>
              <dl className="grid grid-cols-2 gap-y-1 text-sm">
                <dt className="text-gray-500">Invoice date</dt>
                <dd className="text-right font-medium">{formatDate(data.posting_date)}</dd>
                <dt className="text-gray-500">Due date</dt>
                <dd className="text-right font-medium">{formatDate(data.due_date)}</dd>
                {data.period_start && (
                  <>
                    <dt className="text-gray-500">Period</dt>
                    <dd className="text-right font-medium">
                      {formatDate(data.period_start, 'D MMM')} - {formatDate(data.period_end)}
                    </dd>
                  </>
                )}
                {data.lease && (
                  <>
                    <dt className="text-gray-500">Lease</dt>
                    <dd className="text-right font-medium">
                      <Link to="/tenant/lease" className="print:no-underline">
                        {data.lease}
                      </Link>
                    </dd>
                  </>
                )}
              </dl>
            </section>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="py-2 font-semibold">Description</th>
                  <th className="py-2 text-right font-semibold">Qty</th>
                  <th className="py-2 text-right font-semibold">Rate</th>
                  <th className="py-2 text-right font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item, index) => (
                  <tr key={index} className="border-b border-gray-100 align-top">
                    <td className="py-3 pr-4">{item.description}</td>
                    <td className="py-3 text-right">{formatNumber(item.qty)}</td>
                    <td className="py-3 text-right">{formatMoney(item.rate)}</td>
                    <td className="py-3 text-right font-medium">{formatMoney(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <section className="ml-auto mt-6 w-full max-w-xs text-sm">
              <div className="flex justify-between py-1">
                <span className="text-gray-500">Subtotal</span>
                <span>{formatMoney(data.net_total)}</span>
              </div>
              {data.taxes.map((tax, index) => (
                <div key={index} className="flex justify-between py-1">
                  <span className="text-gray-500">{tax.description}</span>
                  <span>{formatMoney(tax.amount)}</span>
                </div>
              ))}
              <div className="mt-1 flex justify-between border-t border-gray-300 py-2 text-base font-semibold">
                <span>Total</span>
                <span>{formatMoney(data.grand_total)}</span>
              </div>
              <div className="flex justify-between rounded-xl bg-[#b8860b]/10 px-3 py-2 font-semibold text-[#6d4f05]">
                <span>Balance due</span>
                <span>{formatMoney(data.outstanding_amount)}</span>
              </div>
            </section>
            {(data.etims?.receipt || data.etims?.qr) && (
              <footer className="mt-8 flex items-center gap-4 border-t border-gray-200 pt-4 text-xs text-gray-500">
                {data.etims.qr && <img src={data.etims.qr} alt="KRA eTIMS QR" className="size-20" />}
                {data.etims.receipt && <span>KRA eTIMS receipt {data.etims.receipt}</span>}
              </footer>
            )}
          </article>
        )}
      </div>
      <PayDialog
        open={paying}
        onOpenChange={setPaying}
        amount={data?.outstanding_amount ?? 0}
        invoice={data?.name}
        onPaid={reload}
      />
    </PortalLayout>
  )
}
