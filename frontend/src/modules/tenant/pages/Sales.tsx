import dayjs from 'dayjs'
import { useState } from 'react'
import { Button, Dialog, ErrorMessage, Select, TextInput, toast } from '@/design-system'
import { portalApi } from '../api/portal'
import { PortalLayout } from '../components/PortalLayout'
import { Card, EmptyState, ErrorPanel, Loading, PageHeading, StatusBadge } from '../components/PortalUi'
import { usePortalQuery } from '../hooks/usePortalQuery'
import { usePortalStore } from '../stores/portalStore'
import { formatDate, formatMoney } from '../utils/format'

export default function Sales() {
  const customer = usePortalStore((state) => state.customer)
  const { data, loading, error, reload } = usePortalQuery((id) => portalApi.sales(id))
  const [open, setOpen] = useState(false)
  const [lease, setLease] = useState('')
  const [start, setStart] = useState(dayjs().subtract(1, 'month').startOf('month').format('YYYY-MM-DD'))
  const [end, setEnd] = useState(dayjs().subtract(1, 'month').endOf('month').format('YYYY-MM-DD'))
  const [sales, setSales] = useState('')
  const [problem, setProblem] = useState('')
  const [busy, setBusy] = useState(false)

  const leases = data?.leases ?? []
  const selected = lease || leases[0]?.name || ''

  async function submit() {
    setProblem('')
    if (!selected) return setProblem('No lease with turnover rent was found.')
    if (!(Number(sales) >= 0) || sales === '')
      return setProblem('Enter your total sales for the period, excluding VAT.')
    setBusy(true)
    try {
      const result = await portalApi.submitSales(customer, selected, start, end, Number(sales))
      toast.success(`Declaration received. Turnover rent due: ${formatMoney(result.turnover_rent_due)}`)
      setOpen(false)
      setSales('')
      reload()
    } catch (caught) {
      setProblem(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setBusy(false)
    }
  }

  return (
    <PortalLayout title="Sales declaration">
      <div className="flex flex-col gap-6">
        <PageHeading
          title="Sales declarations"
          subtitle="Declare your monthly sales so turnover rent can be calculated"
          actions={
            data?.enabled && leases.length > 0 ? (
              <Button label="New declaration" variant="solid" iconLeft="lucide-plus" onClick={() => setOpen(true)} />
            ) : undefined
          }
        />
        {loading && !data && <Loading />}
        {error && <ErrorPanel message={error} onRetry={reload} />}
        {data && leases.length === 0 && (
          <Card>
            <EmptyState
              icon="chart-no-axes-combined"
              title="Not applicable"
              message="Your lease does not include turnover rent."
            />
          </Card>
        )}
        {data && leases.length > 0 && (
          <Card bodyClassName="p-0 sm:p-0">
            {data.declarations.length === 0 ? (
              <EmptyState
                icon="chart-no-axes-combined"
                title="No declarations yet"
                message="Submit your first monthly sales figure."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b border-outline-gray-2 text-left text-xs uppercase tracking-wide text-ink-gray-5">
                      <th className="px-5 py-3 font-semibold">Period</th>
                      <th className="px-3 py-3 text-right font-semibold">Sales</th>
                      <th className="px-3 py-3 text-right font-semibold">Base rent</th>
                      <th className="px-3 py-3 text-right font-semibold">Turnover rent</th>
                      <th className="px-5 py-3 text-right font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.declarations.map((row) => (
                      <tr key={row.name} className="border-b border-outline-gray-1 last:border-0">
                        <td className="px-5 py-3">
                          <p className="font-medium text-ink-gray-9">{formatDate(row.period_start, 'MMM YYYY')}</p>
                          <p className="text-xs text-ink-gray-5">
                            {formatDate(row.period_start, 'D MMM')} - {formatDate(row.period_end, 'D MMM')}
                          </p>
                        </td>
                        <td className="px-3 py-3 text-right">{formatMoney(row.gross_sales)}</td>
                        <td className="px-3 py-3 text-right text-ink-gray-6">
                          {formatMoney(row.base_rent_for_period)}
                        </td>
                        <td className="px-3 py-3 text-right font-semibold">{formatMoney(row.turnover_rent_due)}</td>
                        <td className="px-5 py-3 text-right">
                          <StatusBadge status={row.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}
      </div>
      <Dialog open={open} onOpenChange={setOpen} title="Declare sales" size="md">
        <div className="flex flex-col gap-4">
          {leases.length > 1 && (
            <Select
              label="Lease"
              value={selected}
              onChange={(value) => setLease(String(value ?? ''))}
              options={leases.map((row) => ({ label: `${row.name} - ${row.property}`, value: row.name }))}
            />
          )}
          <div className="grid grid-cols-2 gap-3">
            <TextInput label="Period start" type="date" value={start} onChange={setStart} />
            <TextInput label="Period end" type="date" value={end} onChange={setEnd} />
          </div>
          <TextInput
            label="Total sales (KSh, excluding VAT)"
            type="number"
            value={sales}
            onChange={setSales}
            inputMode="decimal"
          />
          <ErrorMessage message={problem} />
          <div className="flex justify-end gap-2">
            <Button label="Cancel" variant="subtle" onClick={() => setOpen(false)} />
            <Button label="Submit" variant="solid" loading={busy} onClick={() => void submit()} />
          </div>
        </div>
      </Dialog>
    </PortalLayout>
  )
}
