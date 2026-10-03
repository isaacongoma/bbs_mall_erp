import { useRef, useState } from 'react'
import { __ } from '@/core/i18n'
import { router } from '@/core/navigation'
import type { ListResource } from '@/core/resources'
import { Badge, Button, Dropdown, toast, uploadFile } from '@/design-system'
import { useMeta } from '../../hooks/useMeta'
import {
  allExportFields,
  downloadTemplate,
  getBadgeColor,
  mandatoryExportFields,
  type DataImportRecord,
  type DataImportStep,
} from '../../utils/dataImport'
import { TemplateModal } from './TemplateModal'

type AnyRecord = Record<string, any>

export interface UploadStepProps {
  dataImports: ListResource
  doctype?: string
  data: DataImportRecord | null
  onUpdateStep: (step: DataImportStep, data: DataImportRecord | null) => void
}

type SourceFile = { file_url: string; file_name?: string; file_size?: number }

function initialFile(data: DataImportRecord | null): SourceFile | null {
  return data?.import_file ? { file_url: data.import_file } : null
}

function convertToKB(bytes: number) {
  return (bytes / 1024).toFixed(2) + ' KB'
}

export function UploadStep({ dataImports, doctype, data, onUpdateStep }: UploadStepProps) {
  const referenceDoctype = doctype || data?.reference_doctype || ''
  const { doctypeMeta } = useMeta(referenceDoctype)
  const fileInput = useRef<HTMLInputElement | null>(null)
  const [importFile, setImportFile] = useState<SourceFile | null>(() => initialFile(data))
  const [googleSheet, setGoogleSheet] = useState(data?.google_sheets_url ?? '')
  const [showSheetSelector, setShowSheetSelector] = useState(Boolean(data?.google_sheets_url))
  const [uploadingFile, setUploadingFile] = useState<File | null>(null)
  const [progress, setProgress] = useState({ uploaded: 0, total: 0 })
  const [showTemplateModal, setShowTemplateModal] = useState(false)

  const showFileSelector = !showSheetSelector
  const uploadProgress = progress.total ? Math.floor((progress.uploaded / progress.total) * 100) : 0
  const disableContinue = !importFile && !googleSheet.trim().length

  function handleFile(file: File | null | undefined) {
    if (!file) return
    if (file.type !== 'text/csv' && !file.name.toLowerCase().endsWith('.csv')) {
      toast.error(__('Please upload a valid CSV file.'))
      return
    }
    setUploadingFile(file)
    uploadFile(file, {}, (state) => setProgress({ uploaded: state.uploaded ?? 0, total: state.total ?? 0 }))
      .then((uploaded) => setImportFile(uploaded))
      .catch((failure: unknown) => toast.error(failure instanceof Error ? failure.message : String(failure)))
      .finally(() => setUploadingFile(null))
  }

  function persistRemoval() {
    if (data?.name) {
      dataImports.setValue.submit({ ...data, import_file: '', google_sheets_url: googleSheet.trim() }, {})
    }
  }

  function deleteFile() {
    setImportFile(null)
    persistRemoval()
  }

  function saveImport() {
    if (data?.name) updateImport()
    else createImport()
  }

  function createImport() {
    dataImports.insert.submit(
      {
        reference_doctype: referenceDoctype,
        import_type: 'Insert New Records',
        mute_emails: true,
        status: 'Pending',
        google_sheets_url: googleSheet.trim(),
        import_file: importFile?.file_url,
      },
      {
        onSuccess(created: AnyRecord) {
          router.replace({ name: 'DataImport', params: { importName: created.name }, query: { step: 'map' } })
        },
        onError(error: unknown) {
          toast.error((error as AnyRecord).messages?.[0] || String(error))
        },
      },
    )
  }

  function updateImport() {
    if (!data) return
    dataImports.setValue.submit(
      { ...data, google_sheets_url: googleSheet.trim(), import_file: importFile ? importFile.file_url : '' },
      {
        onSuccess(updated: DataImportRecord) {
          onUpdateStep(importFile || googleSheet.trim().length ? 'map' : 'upload', updated)
        },
        onError(error: unknown) {
          toast.error((error as AnyRecord).messages?.[0] || String(error))
        },
      },
    )
  }

  const fields = doctypeMeta?.fields ?? []

  return (
    <div className="mx-auto flex h-full w-[85%] flex-col space-y-8 pt-12 text-base lg:w-[700px]">
      <div className="flex flex-col space-y-1 text-ink-gray-7">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-lg font-semibold text-ink-gray-9">
            <span>{__('Choose Import')}</span>
            {data?.status && <Badge theme={getBadgeColor(data.status)} label={data.status} />}
          </div>
          <Button variant="solid" label={__('Continue')} disabled={disableContinue} onClick={saveImport} />
        </div>
        <div className="leading-5">{__('Import data into your system using CSV files or Google Sheets.')}</div>
      </div>

      <div className="space-y-4">
        {importFile ? (
          <div className="flex h-[300px] items-center justify-center rounded-md border border-dashed border-outline-gray-3 bg-surface-gray-1">
            <div className="flex w-4/5 items-center justify-between rounded-md border bg-surface-base p-2 lg:w-2/5">
              <div className="space-y-2">
                <div className="font-medium leading-5 text-ink-gray-9">
                  {importFile.file_name || importFile.file_url.split('/').pop()}
                </div>
                {importFile.file_size ? (
                  <div className="text-ink-gray-6">{convertToKB(importFile.file_size)}</div>
                ) : null}
              </div>
              <span
                className="lucide-trash-2 size-4 cursor-pointer text-ink-red-6"
                aria-hidden="true"
                onClick={deleteFile}
              />
            </div>
          </div>
        ) : showFileSelector ? (
          <div
            className="flex h-[300px] items-center justify-center rounded-md border border-dashed border-outline-gray-3 bg-surface-gray-1"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault()
              handleFile(event.dataTransfer.files?.[0])
            }}
          >
            {!uploadingFile ? (
              <div className="w-4/5 text-center lg:w-2/5">
                <span className="lucide-upload-cloud mx-auto mb-2.5 block size-6 text-ink-gray-6" aria-hidden="true" />
                <input
                  ref={fileInput}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(event) => handleFile(event.target.files?.[0])}
                />
                <div className="leading-5 text-ink-gray-9">
                  {__('Drag and drop a CSV file, or upload from your')}{' '}
                  <span
                    onClick={() => fileInput.current?.click()}
                    className="cursor-pointer font-semibold hover:underline"
                  >
                    {__('Device')}
                  </span>{' '}
                  {__('or')}{' '}
                  <span
                    onClick={() => setShowSheetSelector(true)}
                    className="cursor-pointer font-semibold hover:underline"
                  >
                    {__('Google Sheet')}
                  </span>
                </div>
              </div>
            ) : (
              <div className="w-4/5 rounded-md border bg-surface-base p-2 lg:w-2/5">
                <div className="space-y-2">
                  <div className="font-medium">{uploadingFile.name}</div>
                  <div className="text-ink-gray-6">
                    {convertToKB(progress.uploaded)} {__('of')} {convertToKB(progress.total)}
                  </div>
                </div>
                <div className="mt-3 h-1 w-full rounded-full bg-surface-gray-1">
                  <div
                    className="h-1 rounded-full bg-surface-gray-10 transition-all duration-500 ease-in-out"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex h-[300px] flex-col rounded-md border border-dashed border-outline-gray-3 p-4">
            <div className="flex items-center space-x-2 text-ink-gray-7">
              <span
                className="lucide-chevron-left size-4 cursor-pointer"
                aria-hidden="true"
                onClick={() => setShowSheetSelector(false)}
              />
              <div>{__('Google Sheet')}</div>
            </div>
            <div className="mx-auto flex w-[95%] flex-1 flex-col items-center justify-center space-y-3 lg:w-[400px]">
              <input
                value={googleSheet}
                onChange={(event) => setGoogleSheet(event.target.value)}
                type="text"
                className="w-full rounded-md border border-outline-gray-2 px-2.5 text-base"
                placeholder={__('Add Google Sheets Link')}
              />
              <div className="text-ink-gray-5">
                {__('Make sure the link is publically accessible to fetch the data.')}
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <Dropdown
            options={[
              {
                label: __('Mandatory Fields'),
                onClick: () => void downloadTemplate(referenceDoctype, mandatoryExportFields(referenceDoctype, fields)),
              },
              {
                label: __('All Fields'),
                onClick: () => void downloadTemplate(referenceDoctype, allExportFields(referenceDoctype, fields)),
              },
              { label: __('Custom Template'), onClick: () => setShowTemplateModal(true) },
            ]}
          >
            {({ open }) => (
              <Button
                variant="ghost"
                iconLeft="lucide-download"
                iconRight={open ? 'lucide-chevron-up' : 'lucide-chevron-down'}
                label={__('Download CSV Template')}
              />
            )}
          </Dropdown>
        </div>
      </div>

      {referenceDoctype && (
        <TemplateModal open={showTemplateModal} onOpenChange={setShowTemplateModal} doctype={referenceDoctype} />
      )}
    </div>
  )
}
