import { useState } from 'react'
import { __ } from '@/core/i18n'
import { resolveLocation, useRoute } from '@/core/navigation'
import { Breadcrumbs } from '@/design-system'
import { useDataImports } from '../../hooks/useDataImports'
import type { DataImportRecord, DataImportStep, DoctypeMap, DoctypeOption } from '../../utils/dataImport'
import { DataImportList } from './DataImportList'
import { ImportSteps } from './ImportSteps'
import { MappingStep } from './MappingStep'
import { PreviewStep } from './PreviewStep'
import { UploadStep } from './UploadStep'

export interface DataImportViewProps {
  doctype?: string | null
  importName?: string | null
  doctypeMap: DoctypeMap
  doctypeOptions?: DoctypeOption[]
}

export function DataImportView({ doctype, importName, doctypeMap, doctypeOptions }: DataImportViewProps) {
  const route = useRoute()
  const { list, status, filterByStatus } = useDataImports()
  const [viewState, setViewState] = useState<{
    key: string
    step: DataImportStep
    data: DataImportRecord | null
  }>({ key: '', step: 'list', data: null })

  const imports = list.data as DataImportRecord[] | null
  const queryStep = Array.isArray(route.query.step) ? route.query.step[0] : route.query.step
  const key = `${doctype ?? ''}|${importName ?? ''}|${queryStep ?? ''}|${(imports ?? [])
    .map(
      (entry) =>
        `${entry.name}:${entry.status}:${entry.import_file}:${entry.google_sheets_url}:${entry.template_options}`,
    )
    .join(',')}`

  const foundData = importName ? (imports?.find((entry) => entry.name === importName) ?? null) : null
  const derivedStep: DataImportStep =
    queryStep === 'list' || (!doctype && !importName)
      ? 'list'
      : doctype
        ? 'upload'
        : foundData?.import_file || foundData?.google_sheets_url
          ? queryStep === 'map'
            ? 'map'
            : 'preview'
          : 'upload'
  const current = viewState.key === key ? viewState : { key, step: derivedStep, data: foundData }
  const step = current.step
  const data = current.data

  function updateStep(next: DataImportStep, nextData: DataImportRecord | null) {
    setViewState({ key, step: next, data: nextData ?? data })
  }

  const referenceDoctype = doctype || data?.reference_doctype || ''
  const title = doctypeMap[referenceDoctype]?.title || referenceDoctype

  const crumbs = [
    { label: __('Data Import'), route: resolveLocation({ name: 'DataImportList', query: { step: 'list' } }) },
    ...(step !== 'list' ? [{ label: __('Importing {0}', [title]) }] : []),
  ]

  return (
    <>
      <header className="sticky top-0 z-10 flex items-center justify-between space-x-28 border-b bg-surface-base px-3 py-2.5 sm:px-5">
        <Breadcrumbs items={crumbs} />
        {step !== 'list' && (
          <ImportSteps className="hidden flex-1 lg:flex" data={data} step={step} onUpdateStep={updateStep} />
        )}
      </header>
      <div>
        {step !== 'list' && (
          <ImportSteps
            className="mx-auto mt-5 w-[90%] flex-1 lg:hidden"
            data={data}
            step={step}
            onUpdateStep={updateStep}
          />
        )}
        {step === 'list' && (
          <DataImportList
            dataImports={list}
            status={status}
            onStatusChange={filterByStatus}
            doctypeMap={doctypeMap}
            doctypeOptions={doctypeOptions}
          />
        )}
        {step === 'upload' && (
          <UploadStep
            key={data?.name ?? 'new'}
            dataImports={list}
            doctype={doctype ?? undefined}
            data={data}
            onUpdateStep={updateStep}
          />
        )}
        {step === 'map' && data && <MappingStep dataImports={list} data={data} onUpdateStep={updateStep} />}
        {step === 'preview' && data && (
          <PreviewStep dataImports={list} data={data} doctypeMap={doctypeMap} onUpdateStep={updateStep} />
        )}
      </div>
    </>
  )
}
