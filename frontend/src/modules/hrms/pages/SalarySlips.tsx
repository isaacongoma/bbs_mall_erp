import { useState } from 'react'
import { __ } from '@/core/i18n'
import { dayjs } from '@/core/datetime'
import { Badge, Select, Spinner } from '@/design-system'
import { Link } from 'react-router-dom'
import { useHrmsEmployee } from '../stores/employeeStore'
import { usePayrollPeriods, useSalarySlips } from '../stores/financeStore'

export default function SalarySlips() {
  const employee = useHrmsEmployee()
  const { periods, resource: periodsResource } = usePayrollPeriods(employee)
  const [selectedPeriodName, setSelectedPeriodName] = useState<string | null>(null)
  const selectedPeriod = periods.find((period) => period.name === selectedPeriodName) ?? periods[0] ?? null
  const { resource, slips: allSlips } = useSalarySlips(employee)
  const slips =
    selectedPeriod?.start_date && selectedPeriod.end_date
      ? allSlips.filter(
          (slip) =>
            String(slip.start_date ?? '') >= selectedPeriod.start_date! &&
            String(slip.start_date ?? '') <= selectedPeriod.end_date!,
        )
      : allSlips
  const latest = slips[0]
  const periodOptions = periods.map((period) => ({
    label: `${dayjs(period.start_date).format('MMM YYYY')} - ${dayjs(period.end_date).format('MMM YYYY')}`,
    value: period.name,
  }))
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-7 p-4 sm:p-8">
      <h1 className="text-2xl font-semibold text-ink-gray-9">{__('Salary Slips')}</h1>
      <section className="flex flex-col gap-5 rounded-xl border border-outline-gray-2 bg-surface-base p-5 sm:flex-row sm:items-end">
        {latest?.year_to_date !== undefined && (
          <div className="flex flex-1 flex-col gap-1">
            <p className="text-sm font-medium text-ink-gray-6">{__('Year To Date')}</p>
            <p className="text-xl font-bold text-ink-gray-8">
              {String(latest.year_to_date)} {String(latest.currency ?? '')}
            </p>
          </div>
        )}
        <Select
          className="w-full sm:max-w-xs"
          label={__('Payroll Period')}
          placeholder={__('Select Payroll Period')}
          options={periodOptions}
          value={selectedPeriod?.name ?? null}
          onChange={(value) => setSelectedPeriodName(value ? String(value) : null)}
          disabled={periodsResource.loading && !periodsResource.data}
        />
      </section>
      {(periodsResource.loading || resource.loading) && !resource.data ? (
        <div className="flex justify-center py-10">
          <Spinner size="md" />
        </div>
      ) : !slips.length ? (
        <p className="rounded-xl border border-outline-gray-2 p-5 text-sm text-ink-gray-6">
          {__('No salary slips found')}
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-outline-gray-2 bg-surface-base">
          {slips.map((slip) => (
            <Link
              key={slip.name}
              to={`/hrms/salary-slips/${encodeURIComponent(slip.name)}`}
              className="flex items-center justify-between gap-4 border-b border-outline-gray-1 p-4 last:border-b-0 hover:bg-surface-gray-2"
            >
              <div>
                <p className="font-medium text-ink-gray-8">{slip.name}</p>
                <p className="mt-1 text-sm text-ink-gray-6">
                  {String(slip.start_date ?? '')} - {String(slip.end_date ?? '')}
                </p>
              </div>
              <Badge theme="green" label={`${String(slip.net_pay ?? 0)} ${String(slip.currency ?? '')}`} />
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}
