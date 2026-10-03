import { useEffect, useState } from 'react'
import { __ } from '@/core/i18n'
import type { ListResource } from '@/core/resources'
import { Badge, Button, Combobox, toast } from '@/design-system'
import { useMeta } from '../../hooks/useMeta'
import {
  getBadgeColor,
  getPreviewData,
  importableFields,
  parseTemplateOptions,
  type DataImportRecord,
  type DataImportStep,
} from '../../utils/dataImport'

type AnyRecord = Record<string, any>

export interface MappingStepProps {
  dataImports: ListResource
  data: DataImportRecord
  onUpdateStep: (step: DataImportStep, data: DataImportRecord | null) => void
}

export function MappingStep({ dataImports, data, onUpdateStep }: MappingStepProps) {
  const { doctypeMeta } = useMeta(data.reference_doctype)
  const [preview, setPreview] = useState<AnyRecord | null>(null)

  useEffect(() => {
    let cancelled = false
    void getPreviewData(data.name!, data.import_file, data.google_sheets_url).then((result) => {
      if (!cancelled) setPreview(result ?? null)
    })
    return () => {
      cancelled = true
    }
  }, [data.name, data.import_file, data.google_sheets_url, data.template_options])

  const columnsFromFile: string[] = (preview?.columns ?? [])
    .filter((column: AnyRecord) => column.header_title !== 'Sr. No')
    .map((column: AnyRecord) => column.header_title)

  const systemOptions = [
    { value: 'name', label: 'ID' },
    ...importableFields(doctypeMeta?.fields ?? []).map((field) => ({
      value: field.fieldname,
      label: field.label || field.fieldname,
    })),
  ]

  const templateOptions = parseTemplateOptions(data.template_options)
  const columnToFieldMap: Record<string, string> = templateOptions.column_to_field_map ?? {}
  const mappingUpdated = Object.keys(columnToFieldMap).length > 0

  function mappedValue(column: AnyRecord, index: number): string | null {
    const explicit = columnToFieldMap[String(index)]
    if (explicit !== undefined) return explicit || null
    return column.map_to_field ?? null
  }

  function save(nextMap: Record<string, string>) {
    dataImports.setValue.submit(
      { ...data, template_options: JSON.stringify({ ...templateOptions, column_to_field_map: nextMap }) },
      {
        onSuccess: (updated: DataImportRecord) => onUpdateStep('map', { ...updated }),
        onError: (error: unknown) => {
          toast.error((error as AnyRecord).messages?.[0] || String(error))
        },
      },
    )
  }

  const fileColumns: AnyRecord[] = (preview?.columns ?? []).filter(
    (column: AnyRecord) => column.header_title !== 'Sr. No',
  )

  return (
    <div className="mx-auto w-[85%] space-y-8 py-12 text-base lg:w-[700px]">
      <div className="flex justify-between">
        <div className="space-y-2">
          <div className="text-md font-semibold text-ink-gray-9">
            <span>{__('Map Data')}</span>
            {data.status && <Badge theme={getBadgeColor(data.status)} label={data.status} />}
          </div>
          <div className="leading-5 text-ink-gray-7">
            {__('Change the mapping of columns from your file to fields in the system')}
          </div>
        </div>
        <div className="flex flex-col space-y-2 lg:flex-row lg:space-x-2 lg:space-y-0">
          {mappingUpdated && <Button label={__('Reset Mapping')} onClick={() => save({})} />}
          <Button label={__('Continue')} variant="solid" onClick={() => onUpdateStep('preview', null)} />
        </div>
      </div>

      {columnsFromFile.length > 0 && (
        <div className="space-y-8 rounded-md border">
          <div className="grid grid-cols-2 border-b px-4 py-2 text-ink-gray-5">
            <div>{__('Fields in File')}</div>
            <div>{__('Fields in System')}</div>
          </div>
          <div className="grid grid-cols-2 gap-y-8 px-4 py-2">
            {fileColumns.map((column, index) => (
              <div key={`${column.header_title}-${index}`} className="contents">
                <div className="text-ink-gray-7">{column.header_title}</div>
                <Combobox
                  value={mappedValue(column, index)}
                  options={systemOptions}
                  placeholder={__('Select field')}
                  onChange={(value) => {
                    if (!value) return
                    save({ ...columnToFieldMap, [String(index)]: String(value) })
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
