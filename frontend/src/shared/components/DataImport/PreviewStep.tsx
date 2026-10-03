import { useEffect, useState } from 'react'
import { rpc } from '@/core/api/rpc'
import { __ } from '@/core/i18n'
import { router } from '@/core/navigation'
import type { ListResource } from '@/core/resources'
import { Badge, Button, TabButtons, toast } from '@/design-system'
import { sanitizeHTML } from '../../utils/text'
import {
  getBadgeColor,
  getPreviewData,
  type DataImportRecord,
  type DataImportStep,
  type DoctypeMap,
} from '../../utils/dataImport'

type AnyRecord = Record<string, any>

export interface PreviewStepProps {
  dataImports: ListResource
  data: DataImportRecord
  doctypeMap: DoctypeMap
  onUpdateStep: (step: DataImportStep, data: DataImportRecord | null) => void
}

function rowMessage(row: AnyRecord): string | undefined {
  try {
    return JSON.parse(row.messages)?.[0]?.message
  } catch {
    return undefined
  }
}

function firstRowIndex(row: AnyRecord): number {
  try {
    return JSON.parse(row.row_indexes)[0] - 1
  } catch {
    return 0
  }
}

export function PreviewStep({ dataImports, data, doctypeMap, onUpdateStep }: PreviewStepProps) {
  const [preview, setPreview] = useState<AnyRecord | null>(null)
  const [importLogs, setImportLogs] = useState<AnyRecord[]>([])
  const [activeTab, setActiveTab] = useState('all')
  const [starting, setStarting] = useState(false)

  async function fetchLogs() {
    const logs = await rpc<AnyRecord[]>({
      url: 'frappe.core.doctype.data_import.data_import.get_import_logs',
      params: { data_import: data.name },
    })
    setImportLogs(logs)
  }

  useEffect(() => {
    if (!data.name) return
    let cancelled = false
    void getPreviewData(data.name, data.import_file, data.google_sheets_url).then((result) => {
      if (!cancelled) setPreview(result ?? null)
    })
    if (data.status !== 'Pending') {
      void rpc<AnyRecord[]>({
        url: 'frappe.core.doctype.data_import.data_import.get_import_logs',
        params: { data_import: data.name },
      }).then((logs) => {
        if (!cancelled) setImportLogs(logs)
      })
    }
    return () => {
      cancelled = true
    }
  }, [data.name, data.status, data.import_file, data.google_sheets_url, data.template_options])

  async function startImport() {
    setStarting(true)
    try {
      await rpc({
        url: 'frappe.core.doctype.data_import.data_import.form_start_import',
        method: 'POST',
        params: { data_import: data.name },
      })
      await dataImports.reload()
      const updated = (dataImports.data as DataImportRecord[] | null)?.find((entry) => entry.name === data.name)
      onUpdateStep('preview', updated ? { ...updated } : { ...data })
      await fetchLogs()
    } catch (error) {
      toast.error((error as AnyRecord)?.messages?.[0] ?? String(error))
    } finally {
      setStarting(false)
    }
  }

  const columns: AnyRecord[] = preview?.columns ?? []
  const previewColumns = columns.map((column, index) => ({
    key: index === 0 ? 'No' : column.header_title,
    label: index === 0 ? 'No' : column.header_title,
    width: index === 0 ? '60px' : column.header_title === 'ID' ? '150px' : '300px',
    align: index === 0 ? 'center' : 'left',
  }))

  const previewRows: AnyRecord[] = (preview?.data ?? []).map((row: unknown[] | AnyRecord) => {
    const cells = Array.isArray(row) ? row : Object.values(row)
    const mapped: AnyRecord = {}
    previewColumns.forEach((column, index) => {
      mapped[column.key] = index === 0 ? Number(cells[0]) - 1 : cells[index]
    })
    return mapped
  })

  const mapping: string[][] = (preview?.warnings ?? [])
    .filter((warning: AnyRecord) => warning.type === 'info')
    .map((warning: AnyRecord) =>
      [...String(warning.message).matchAll(/<strong>(.*?)<\/strong>/g)].map((match) => match[1]!),
    )
  const warnings: AnyRecord[] = (preview?.warnings ?? []).filter((warning: AnyRecord) => warning.type !== 'info')

  const successCount = importLogs.filter((log) => log.success).length
  const errorCount = importLogs.filter((log) => !log.success).length
  const bannerClass =
    errorCount === 0
      ? 'bg-surface-green-2 text-ink-green-6'
      : successCount === 0
        ? 'bg-surface-red-2 text-ink-red-6'
        : 'bg-surface-amber-2 text-ink-amber-6'

  const filteredLogs = importLogs.filter((log) =>
    activeTab === 'all' ? true : activeTab === 'successful' ? log.success : !log.success,
  )

  const entry = doctypeMap[data.reference_doctype]
  const listRoute = entry?.listRoute
  const pageRoute = entry?.pageRoute

  return (
    <div className="mx-auto flex h-full w-[90%] flex-col space-y-10 py-12 text-base lg:w-[700px]">
      <div className="flex flex-col space-y-1">
        <div className="flex items-center justify-between text-ink-gray-7">
          <div className="flex items-center space-x-2 text-md font-semibold text-ink-gray-9">
            <span>{__('Review and Import')}</span>
            <Badge theme={getBadgeColor(data.status)} label={data.status} />
          </div>
          {data.status !== 'Success' ? (
            <Button
              label={data.status !== 'Pending' ? __('Retry') : __('Import')}
              variant="solid"
              loading={starting}
              onClick={() => void startImport()}
            />
          ) : listRoute ? (
            <Button label={__('Done')} onClick={() => router.push(listRoute)} />
          ) : null}
        </div>
        <div className="leading-5 text-ink-gray-7">{__('Verify the data before starting the import process')}</div>
      </div>

      {mapping.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm text-ink-gray-5">{__('Column Mapping')}</div>
          <div className="space-y-4 rounded-md border bg-surface-gray-2 p-4 text-sm text-ink-gray-7">
            {mapping.map((pair, index) => (
              <div key={index} className="grid grid-cols-[40%_10%_40%] items-center space-x-3 lg:grid-cols-3">
                <div>{pair[0]}</div>
                <div className="flex justify-end">
                  <span className="lucide-arrow-right inline size-4 text-ink-gray-5" aria-hidden="true" />
                </div>
                <div>{pair[1]}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm text-ink-gray-5">{__('Warnings')}</div>
          <div className="space-y-2 rounded-md bg-surface-amber-2 p-2 text-xs">
            {warnings.map((warning, index) => (
              <div key={index} className="flex items-center space-x-2">
                <span className="lucide-circle-alert size-3 text-ink-amber-6" aria-hidden="true" />
                <div className="text-ink-amber-6" dangerouslySetInnerHTML={{ __html: sanitizeHTML(warning.message) }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {previewRows.length > 0 && (
        <div className="overflow-x-auto rounded-md border">
          <table className="divide-y">
            <thead className="rounded-t-md">
              <tr>
                {previewColumns.map((column, index) => (
                  <th
                    key={column.key}
                    style={{ minWidth: column.width, textAlign: column.align as never }}
                    className={`p-2 text-left text-sm text-ink-gray-5 ${
                      index !== previewColumns.length - 1 ? 'border-r' : 'w-full'
                    }`}
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-gray-2 bg-surface-base">
              {previewRows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {previewColumns.map((column, index) => (
                    <td
                      key={column.key}
                      style={{ minWidth: column.width, textAlign: column.align as never }}
                      className={`px-3 py-2 align-top text-sm text-ink-gray-7 ${
                        index !== previewColumns.length - 1 ? 'border-r' : ''
                      }`}
                    >
                      <div className="text-sm leading-5">{row[column.key]}</div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data.status !== 'Pending' && importLogs.length > 0 && (
        <div className="space-y-4">
          <div className="font-semibold text-ink-gray-9">{__('Import Logs')}</div>
          <div className={`rounded-md p-2 ${bannerClass}`}>
            {successCount} {successCount === 1 ? __('row') : __('rows')} {__('imported successfully')}, {errorCount}{' '}
            {errorCount === 1 ? __('row') : __('rows')} {__('failed.')}
          </div>
          <TabButtons
            className="w-fit"
            value={activeTab}
            onChange={(value) => setActiveTab(String(value))}
            options={[
              { label: __('All'), value: 'all' },
              { label: __('Successful'), value: 'successful' },
              { label: __('Failed'), value: 'failed' },
            ]}
          />
          {filteredLogs.length ? (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full table-fixed divide-y">
                <thead className="rounded-t-md">
                  <tr>
                    <th className="w-20 border-r p-2 text-center text-sm text-ink-gray-5">{__('Row no.')}</th>
                    <th className="w-[80%] p-2 text-left text-sm text-ink-gray-5">{__('Message')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-gray-2 bg-surface-base">
                  {filteredLogs.map((row, rowIndex) => {
                    const message = rowMessage(row)
                    return (
                      <tr key={rowIndex} className="group">
                        <td className="border-r px-3 py-2 text-sm text-ink-gray-7">
                          <div className="flex items-center justify-center space-x-2">
                            <div
                              className={`size-1.5 rounded ${row.success ? 'bg-surface-green-3' : 'bg-surface-red-7'}`}
                            />
                            <div>{firstRowIndex(row)}</div>
                          </div>
                        </td>
                        <td className="w-full px-3 py-2 text-sm text-ink-gray-7">
                          {message ? (
                            <span dangerouslySetInnerHTML={{ __html: sanitizeHTML(message) }} />
                          ) : !row.success ? (
                            <span>{__('Failed to import')}</span>
                          ) : (
                            <span>
                              {__('Successfully imported')}{' '}
                              <span
                                onClick={() => pageRoute && router.push(pageRoute.replace('docname', row.docname))}
                                className={pageRoute ? 'cursor-pointer underline' : ''}
                              >
                                {row.docname}
                              </span>
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-sm text-ink-gray-5">{__('No logs to display.')}</div>
          )}
        </div>
      )}
    </div>
  )
}
