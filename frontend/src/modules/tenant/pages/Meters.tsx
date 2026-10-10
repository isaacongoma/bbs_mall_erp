import { useState } from 'react'
import { Button, Dialog, ErrorMessage, TextInput, toast } from '@/design-system'
import { portalApi } from '../api/portal'
import { PortalLayout } from '../components/PortalLayout'
import { Card, EmptyState, ErrorPanel, IconTile, Loading, PageHeading, StatusBadge } from '../components/PortalUi'
import { usePortalQuery } from '../hooks/usePortalQuery'
import { usePortalStore } from '../stores/portalStore'
import type { MeterRow } from '../types/portal'
import { formatDate, formatMoney, formatNumber } from '../utils/format'

const ICONS: Record<string, string> = {
  Electricity: 'zap',
  Water: 'droplets',
  Gas: 'flame',
  Cooling: 'snowflake',
  Other: 'gauge',
}

function Trend({ values }: { values: number[] }) {
  if (values.length < 2) return null
  const max = Math.max(...values, 1)
  const points = values
    .map((value, index) => `${(index / (values.length - 1)) * 100},${100 - (value / max) * 90}`)
    .join(' ')
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-12 w-full" aria-hidden="true">
      <polyline
        points={points}
        fill="none"
        stroke="#b8860b"
        strokeWidth="3"
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function Meters() {
  const customer = usePortalStore((state) => state.customer)
  const canSubmit = usePortalStore((state) => state.context?.settings.meter_readings)
  const { data, loading, error, reload } = usePortalQuery((id) => portalApi.meters(id))
  const [active, setActive] = useState<MeterRow | null>(null)
  const [reading, setReading] = useState('')
  const [problem, setProblem] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit() {
    if (!active) return
    const value = Number(reading)
    if (!(value >= active.last_reading))
      return setProblem(`Enter a reading of ${formatNumber(active.last_reading)} or more.`)
    setBusy(true)
    setProblem('')
    try {
      const result = await portalApi.submitReading(customer, active.name, value)
      toast.success(`Reading received: ${formatNumber(result.consumption)} ${active.uom ?? 'units'} used`)
      setActive(null)
      setReading('')
      reload()
    } catch (caught) {
      setProblem(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setBusy(false)
    }
  }

  return (
    <PortalLayout title="Utilities">
      <div className="flex flex-col gap-6">
        <PageHeading title="Utilities" subtitle="Your meters, readings and usage" />
        {loading && !data && <Loading />}
        {error && <ErrorPanel message={error} onRetry={reload} />}
        {data?.length === 0 && (
          <Card>
            <EmptyState icon="gauge" title="No meters" message="No utility meters are linked to your space yet." />
          </Card>
        )}
        <div className="grid gap-6 lg:grid-cols-2">
          {data?.map((meter) => {
            const history = [...meter.history].reverse()
            return (
              <Card key={meter.name} className="overflow-hidden">
                <div className="flex items-start gap-4">
                  <IconTile
                    icon={ICONS[meter.utility_type] ?? 'gauge'}
                    tone={meter.utility_type === 'Water' ? 'blue' : 'gold'}
                    className="size-12"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink-gray-9">{meter.utility_type} meter</p>
                    <p className="text-xs text-ink-gray-5">
                      {meter.meter_number} - {meter.unit}
                    </p>
                  </div>
                  <StatusBadge status={meter.status === 'Active' ? 'Active' : meter.status} />
                </div>
                <div className="mt-4 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-ink-gray-5">Last reading</p>
                    <p className="text-2xl font-semibold text-ink-gray-9">
                      {formatNumber(meter.last_reading)}{' '}
                      <span className="text-sm font-normal text-ink-gray-5">{meter.uom}</span>
                    </p>
                    <p className="text-xs text-ink-gray-5">{formatDate(meter.last_reading_date)}</p>
                  </div>
                  <div className="w-32 shrink-0">
                    <Trend values={history.map((row) => Number(row.consumption))} />
                  </div>
                </div>
                {canSubmit && meter.status === 'Active' && (
                  <Button
                    label="Submit a reading"
                    variant="solid"
                    className="mt-4 w-full"
                    iconLeft="lucide-plus"
                    onClick={() => {
                      setProblem('')
                      setReading('')
                      setActive(meter)
                    }}
                  />
                )}
                {meter.history.length > 0 && (
                  <ul className="mt-4 divide-y divide-outline-gray-1 border-t border-outline-gray-1 text-sm">
                    {meter.history.slice(0, 5).map((row) => (
                      <li key={row.name} className="flex items-center justify-between gap-3 py-2.5">
                        <span className="text-ink-gray-6">{formatDate(row.reading_date)}</span>
                        <span className="text-ink-gray-9">
                          {formatNumber(row.current_reading)} ({formatNumber(row.consumption)} used)
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="font-medium">{formatMoney(row.amount)}</span>
                          <StatusBadge status={row.status} />
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            )
          })}
        </div>
      </div>
      <Dialog
        open={active !== null}
        onOpenChange={(open) => !open && setActive(null)}
        title={`Submit ${active?.utility_type ?? ''} reading`}
        size="sm"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink-gray-6">
            Previous reading:{' '}
            <strong>
              {formatNumber(active?.last_reading)} {active?.uom}
            </strong>
          </p>
          <TextInput
            label="Current reading"
            type="number"
            value={reading}
            onChange={setReading}
            inputMode="decimal"
            autoFocus
          />
          <ErrorMessage message={problem} />
          <div className="flex justify-end gap-2">
            <Button label="Cancel" variant="subtle" onClick={() => setActive(null)} />
            <Button label="Submit" variant="solid" loading={busy} onClick={() => void submit()} />
          </div>
        </div>
      </Dialog>
    </PortalLayout>
  )
}
