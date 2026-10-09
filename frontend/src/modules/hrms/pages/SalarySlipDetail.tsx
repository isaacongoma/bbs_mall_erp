import { useState } from 'react'
import { rpc } from '@/core/api/rpc'
import { toErrorMessage } from '@/core/api/errors'
import { __ } from '@/core/i18n'
import { useDocumentResource } from '@/core/resources'
import { Badge, Button, ErrorMessage, Spinner, toast } from '@/design-system'
import { useParams } from 'react-router-dom'
import { unwrapMessage } from '../api/response'

function detailRows(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter((row): row is Record<string, unknown> => Boolean(row && typeof row === 'object'))
    : []
}

export default function SalarySlipDetail() {
  const { id } = useParams()
  const resource = useDocumentResource({ doctype: 'Salary Slip', name: id ?? '', auto: Boolean(id) })
  const slip = resource?.doc
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState('')

  if (!id || !resource || (!slip && resource.get.loading)) {
    return (
      <div className="flex min-h-full items-center justify-center">
        <Spinner size="md" />
      </div>
    )
  }

  if (!slip) {
    return (
      <main className="mx-auto w-full max-w-3xl p-4 sm:p-8">
        <p className="rounded-lg bg-surface-red-2 p-4 text-sm text-ink-red-8" role="alert">
          {__('Unable to load salary slip')}
        </p>
      </main>
    )
  }

  async function downloadPdf() {
    setDownloading(true)
    setDownloadError('')
    try {
      const response = await rpc<unknown>({
        url: 'hrms.api._download_pdf',
        method: 'POST',
        params: { doctype: 'Salary Slip', docname: id },
      })
      const dataUrl = unwrapMessage<string>(response)
      if (!dataUrl?.startsWith('data:')) throw new Error(__('Failed to download PDF'))
      const link = document.createElement('a')
      link.href = dataUrl
      link.download = `${id}.pdf`
      link.click()
      toast.success(__('Salary slip downloaded'))
    } catch (error) {
      setDownloadError(toErrorMessage(error) || __('Failed to download PDF'))
    } finally {
      setDownloading(false)
    }
  }

  const earnings = detailRows(slip.earnings)
  const deductions = detailRows(slip.deductions)

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 sm:p-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink-gray-9">{__('Salary Slip')}</h1>
          <p className="mt-1 text-sm text-ink-gray-6">{slip.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge theme="green" label={`${String(slip.net_pay ?? 0)} ${String(slip.currency ?? '')}`} />
          <Button variant="outline" loading={downloading} onClick={() => void downloadPdf()}>
            {__('Download PDF')}
          </Button>
        </div>
      </div>
      <ErrorMessage message={downloadError} />
      <section className="grid gap-3 sm:grid-cols-2">
        {[
          ['Start Date', slip.start_date],
          ['End Date', slip.end_date],
          ['Gross Pay', slip.gross_pay],
          ['Net Pay', slip.net_pay],
          ['Year To Date', slip.year_to_date],
          ['Currency', slip.currency],
        ].map(([label, value]) => (
          <article key={String(label)} className="rounded-xl border border-outline-gray-2 bg-surface-base p-4">
            <p className="text-sm text-ink-gray-6">{__(String(label))}</p>
            <p className="mt-2 font-medium text-ink-gray-9">{String(value ?? '')}</p>
          </article>
        ))}
      </section>
      {(earnings.length > 0 || deductions.length > 0) && (
        <section className="grid gap-6 md:grid-cols-2">
          {[
            { title: __('Earnings'), rows: earnings },
            { title: __('Deductions'), rows: deductions },
          ].map((table) => (
            <div key={table.title} className="overflow-hidden rounded-xl border border-outline-gray-2 bg-surface-base">
              <h2 className="border-b border-outline-gray-1 px-4 py-3 font-semibold text-ink-gray-8">{table.title}</h2>
              <div className="divide-y divide-outline-gray-1">
                {table.rows.map((row, index) => (
                  <div
                    key={`${table.title}-${String(row.salary_component ?? index)}`}
                    className="flex justify-between gap-4 px-4 py-3 text-sm"
                  >
                    <span className="text-ink-gray-7">{String(row.salary_component ?? row.description ?? '')}</span>
                    <span className="font-medium text-ink-gray-8">{String(row.amount ?? '')}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}
    </main>
  )
}
