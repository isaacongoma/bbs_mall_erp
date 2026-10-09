import { useState } from 'react'
import { dayjs } from '@/core/datetime'
import { __ } from '@/core/i18n'
import { router } from '@/core/navigation'
import type { ListResource } from '@/core/resources'
import { Badge, Button, Dialog, FormControl, toast } from '@/design-system'
import {
  IMPORT_STATUSES,
  getBadgeColor,
  type DataImportRecord,
  type DataImportStatus,
  type DoctypeMap,
  type DoctypeOption,
} from '../../utils/dataImport'

type AnyRecord = Record<string, any>

export interface DataImportListProps {
  dataImports: ListResource
  status: 'All' | DataImportStatus
  onStatusChange: (status: 'All' | DataImportStatus) => void
  doctypeMap: DoctypeMap
  doctypeOptions?: DoctypeOption[]
}

export function DataImportList({ dataImports, status, onStatusChange, doctypeMap, doctypeOptions }: DataImportListProps) {
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [doctypeForImport, setDoctypeForImport] = useState<string>('')

  const needle = search.trim().toLowerCase()
  const imports = ((dataImports.data as DataImportRecord[] | null) ?? []).filter(
    (entry) =>
      !needle ||
      (entry.name ?? '').toLowerCase().includes(needle) ||
      entry.reference_doctype.toLowerCase().includes(needle),
  )

  function open(importName: string) {
    router.replace({ name: 'DataImport', params: { importName } })
  }

  function createDataImport(close: () => void) {
    if (!doctypeForImport) return
    dataImports.insert.submit(
      {
        reference_doctype: doctypeForImport,
        import_type: 'Insert New Records',
        mute_emails: true,
        status: 'Pending',
      },
      {
        onSuccess(created: AnyRecord) {
          router.replace({ name: 'DataImport', params: { importName: created.name } })
          close()
        },
        onError(error: unknown) {
          toast.error((error as AnyRecord).messages?.[0] || String(error))
        },
      },
    )
  }

  return (
    <div className="mx-auto flex min-h-0 w-[90%] flex-col py-5 text-base lg:w-[700px]">
      <div className="flex items-center justify-between">
        <div>
          <div className="mb-1 text-lg font-semibold text-ink-gray-9">{__('Data Import')}</div>
          <div className="leading-5 text-ink-gray-6">{__('Import data into your system using CSV files.')}</div>
        </div>
        <Button variant="solid" iconLeft="lucide-plus" label={__('Import')} onClick={() => setShowModal(true)} />
      </div>

      <div className="my-5 flex items-center space-x-2">
        <FormControl
          className="flex-1"
          type="text"
          placeholder={__('Search imported files')}
          value={search}
          onChange={setSearch}
        />
        <FormControl
          type="select"
          value={status}
          options={['All', ...IMPORT_STATUSES].map((option) => ({ label: __(option), value: option })) as never}
          onChange={(value: string) => onStatusChange(value as 'All' | DataImportStatus)}
        />
      </div>

      {imports.length ? (
        <div className="overflow-y-scroll">
          <div className="divide-y">
            <div className="mx-2 my-0.5 grid grid-cols-[75%_20%] items-center px-1 py-1.5 text-sm text-ink-gray-5 lg:grid-cols-[85%_20%]">
              <div>{__('Name')}</div>
              <div className="pl-1">{__('Status')}</div>
            </div>
            {imports.map((entry) => (
              <div
                key={entry.name}
                className="mx-2 grid cursor-pointer grid-cols-[75%_20%] items-center px-1 py-2.5 lg:grid-cols-[85%_20%]"
                onClick={() => open(entry.name!)}
              >
                <div className="space-y-1">
                  <div className="text-ink-gray-7">{entry.reference_doctype}</div>
                  <div className="text-ink-gray-5">{dayjs(entry.creation).fromNow()}</div>
                </div>
                <Badge label={entry.status} theme={getBadgeColor(entry.status)} className="w-fit" />
              </div>
            ))}
          </div>
          <div className="my-5 flex justify-center">
            {dataImports.hasNextPage && (
              <Button iconLeft="lucide-refresh-cw" label={__('Load More')} onClick={() => dataImports.next()} />
            )}
          </div>
        </div>
      ) : (
        <div className="mt-5 text-sm italic text-ink-gray-5">{__('No data imports found.')}</div>
      )}

      <Dialog
        open={showModal}
        onOpenChange={setShowModal}
        title={__('New Data Import')}
        actions={[
          {
            label: __('Continue'),
            variant: 'solid',
            onClick: ({ close }) => createDataImport(close),
          },
        ]}
      >
        <FormControl
          type="select"
          label={__('Choose a Document Type to import')}
          value={doctypeForImport}
          options={(doctypeOptions ?? Object.entries(doctypeMap).map(([value, entry]) => ({ label: entry.title, value }))) as never}
          onChange={setDoctypeForImport}
        />
      </Dialog>
    </div>
  )
}
