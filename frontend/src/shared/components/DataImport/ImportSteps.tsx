import { __ } from '@/core/i18n'
import { cn } from '@/design-system'
import { parseTemplateOptions, type DataImportRecord, type DataImportStep } from '../../utils/dataImport'

export interface ImportStepsProps {
  data: DataImportRecord | null
  step: DataImportStep
  className?: string
  onUpdateStep: (step: DataImportStep, data: DataImportRecord | null) => void
}

function StepMarker({ index, completed, active }: { index: number; completed: boolean; active: boolean }) {
  if (completed) {
    return (
      <span
        className={cn(
          'lucide-check size-5 rounded-[5px] border p-0.5 text-sm',
          active && 'bg-surface-gray-10 text-ink-base',
        )}
        aria-hidden="true"
      />
    )
  }
  return (
    <div className={cn('rounded-[5px] border px-1.5 py-0.5 text-sm', active && 'bg-surface-gray-10 text-ink-base')}>
      <span>{index}</span>
    </div>
  )
}

export function ImportSteps({ data, step, className, onUpdateStep }: ImportStepsProps) {
  const uploadCompleted = Boolean(data?.import_file || data?.google_sheets_url)
  const mapCompleted = Boolean(parseTemplateOptions(data?.template_options).column_to_field_map)
  const previewCompleted = data?.status === 'Success'

  return (
    <div className={cn('flex items-center space-x-3 text-xs lg:space-x-10 lg:text-base', className)}>
      <div
        className={cn(
          'flex cursor-pointer items-center space-x-1 text-ink-gray-5 lg:space-x-2',
          step === 'upload' && 'font-semibold text-ink-gray-9',
        )}
        onClick={() => onUpdateStep('upload', data ? { ...data } : null)}
      >
        <StepMarker index={1} completed={uploadCompleted} active={step === 'upload'} />
        <div>{__('Upload File')}</div>
      </div>
      <div
        className={cn(
          'flex items-center space-x-1 text-ink-gray-5 lg:space-x-2',
          step === 'map' && 'font-semibold text-ink-gray-9',
          uploadCompleted && 'cursor-pointer',
        )}
        onClick={() => uploadCompleted && onUpdateStep('map', data ? { ...data } : null)}
      >
        <StepMarker index={2} completed={mapCompleted} active={step === 'map'} />
        <div>{__('Map Data')}</div>
      </div>
      <div
        className={cn(
          'flex items-center space-x-1 text-ink-gray-5 lg:space-x-2',
          step === 'preview' && 'font-semibold text-ink-gray-9',
          uploadCompleted && 'cursor-pointer',
        )}
        onClick={() => uploadCompleted && onUpdateStep('preview', data ? { ...data } : null)}
      >
        <StepMarker index={3} completed={previewCompleted} active={step === 'preview'} />
        <div>{__('Review & Import')}</div>
      </div>
    </div>
  )
}
