import dayjs from 'dayjs'
import { useState } from 'react'
import { Button, TextInput } from '@/design-system'
import { portalApi } from '../api/portal'
import { PortalLayout } from '../components/PortalLayout'
import { Card, EmptyState, ErrorPanel, Loading, PageHeading, StatCard } from '../components/PortalUi'
import { usePortalQuery } from '../hooks/usePortalQuery'
import { formatDate, formatMoney } from '../utils/format'

function toCsv(
  rows: {
    posting_date: string
    voucher_type: string
    voucher_no: string
    debit: number
    credit: number
    balance: number
  }[],
): string {
  const lines = [['Date', 'Type', 'Reference', 'Charges', 'Payments', 'Balance'].join(',')]
  rows.forEach((row) =>
    lines.push([row.posting_date, row.voucher_type, row.voucher_no, row.debit, row.credit, row.balance].join(',')),
  )
  return lines.join('\n')
}

export default function Statement() {
  const [from, setFrom] = useState(dayjs().subtract(6, 'month').format('YYYY-MM-DD'))
  const [to, setTo] = useState(dayjs().format('YYYY-MM-DD'))
  const { data, loading, error, reload } = usePortalQuery(
    (customer) => portalApi.statement(customer, from, to),
    [from, to],
  )

  function download() {
    if (!data) return
    const blob = new Blob([toCsv(data.rows)], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `statement-${from}-to-${to}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <PortalLayout title="Statement">
      <div className="flex flex-col gap-6">
        <PageHeading
          title="Account statement"
          subtitle="Charges, payments and your running balance"
          actions={
            <div className="flex gap-2 print:hidden">
              <Button
                label="CSV"
                iconLeft="lucide-download"
                variant="subtle"
                onClick={download}
                disabled={!data?.rows.length}
              />
              <Button label="Print" iconLeft="lucide-printer" variant="subtle" onClick={() => window.print()} />
            </div>
          }
        />
        <Card className="print:hidden">
          <div className="grid gap-4 sm:grid-cols-2 lg:max-w-xl">
            <TextInput label="From" type="date" value={from} onChange={setFrom} />
            <TextInput label="To" type="date" value={to} onChange={setTo} />
          </div>
        </Card>
        {loading && !data && <Loading />}
        {error && <ErrorPanel message={error} onRetry={reload} />}
        {data && (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard
                label="Opening balance"
                value={formatMoney(data.opening)}
                icon="arrow-right-to-line"
                tone="gray"
              />
              <StatCard
                label="Charges"
                value={formatMoney(data.rows.reduce((sum, row) => sum + row.debit, 0))}
                icon="receipt"
                tone="gold"
              />
              <StatCard
                label="Payments"
                value={formatMoney(data.rows.reduce((sum, row) => sum + row.credit, 0))}
                icon="wallet"
                tone="green"
              />
              <StatCard
                label="Closing balance"
                value={formatMoney(data.closing)}
                icon="scale"
                tone={data.closing > 0 ? 'red' : 'green'}
                emphasis
              />
            </div>
            <Card bodyClassName="p-0 sm:p-0">
              {data.rows.length === 0 ? (
                <EmptyState
                  icon="file-text"
                  title="No activity"
                  message="There are no entries in the selected period."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead>
                      <tr className="border-b border-outline-gray-2 text-left text-xs uppercase tracking-wide text-ink-gray-5">
                        <th className="px-5 py-3 font-semibold">Date</th>
                        <th className="px-3 py-3 font-semibold">Details</th>
                        <th className="px-3 py-3 text-right font-semibold">Charges</th>
                        <th className="px-3 py-3 text-right font-semibold">Payments</th>
                        <th className="px-5 py-3 text-right font-semibold">Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-outline-gray-1 bg-surface-gray-1 text-ink-gray-6">
                        <td className="px-5 py-2.5">{formatDate(data.from_date)}</td>
                        <td className="px-3 py-2.5">Opening balance</td>
                        <td />
                        <td />
                        <td className="px-5 py-2.5 text-right font-medium">{formatMoney(data.opening)}</td>
                      </tr>
                      {data.rows.map((row, index) => (
                        <tr key={index} className="border-b border-outline-gray-1 last:border-0">
                          <td className="whitespace-nowrap px-5 py-2.5 text-ink-gray-6">
                            {formatDate(row.posting_date)}
                          </td>
                          <td className="px-3 py-2.5">
                            <p className="font-medium text-ink-gray-9">{row.voucher_no}</p>
                            <p className="text-xs text-ink-gray-5">{row.voucher_type}</p>
                          </td>
                          <td className="px-3 py-2.5 text-right">{row.debit ? formatMoney(row.debit) : ''}</td>
                          <td className="px-3 py-2.5 text-right text-[#15803d]">
                            {row.credit ? formatMoney(row.credit) : ''}
                          </td>
                          <td className="px-5 py-2.5 text-right font-semibold text-ink-gray-9">
                            {formatMoney(row.balance)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </>
        )}
      </div>
    </PortalLayout>
  )
}
