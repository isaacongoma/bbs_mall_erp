import { useState } from 'react'
import { __ } from '@/core/i18n'
import { FormControl, TabButtons } from '@/design-system'
import { useFilterableFields } from '@/shared/hooks/useFilterableFields'
import { isFilterExpression, toExpression, toFilters } from '../../utils/workflowConditions'
import { WorkflowFilters } from './WorkflowFilters'

export interface WorkflowConditionEditorProps {
  value: string
  doctype: string
  variant?: 'subtle' | 'outline' | 'ghost'
  label?: string
  placeholder?: string
  onChange: (value: string) => void
}

export function WorkflowConditionEditor({
  value,
  doctype,
  variant = 'subtle',
  label = __('Condition'),
  placeholder = '',
  onChange,
}: WorkflowConditionEditorProps) {
  const fields = useFilterableFields(doctype)
  const canUseFilters = isFilterExpression(value)
  const [selected, setSelected] = useState<'filters' | 'expression'>(canUseFilters ? 'filters' : 'expression')
  const mode = canUseFilters ? selected : 'expression'
  const filters = toFilters(value) ?? []

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label className="block text-base text-ink-gray-5">{label}</label>
        <TabButtons
          value={mode}
          onChange={(next) => setSelected(next === 'filters' ? 'filters' : 'expression')}
          options={[
            { label: __('Filters'), value: 'filters', disabled: !canUseFilters },
            { label: __('Expression'), value: 'expression' },
          ]}
        />
      </div>

      {mode === 'filters' ? (
        <WorkflowFilters
          value={filters as never}
          doctype={doctype}
          label=""
          onChange={(next) => onChange(toExpression(JSON.parse(next || '[]'), fields))}
        />
      ) : (
        <FormControl
          type="textarea"
          variant={variant}
          value={value}
          placeholder={placeholder}
          onChange={(next: string) => onChange(next)}
        />
      )}

      {mode !== 'expression' ? (
        <p className="text-xs text-ink-gray-5">{__('All filters must match.')}</p>
      ) : canUseFilters ? (
        <p className="text-xs text-ink-gray-5">{__('Python, evaluated against doc, target and context.')}</p>
      ) : (
        <p className="text-xs text-ink-gray-5">{__('Not something filters can express. Edit it below.')}</p>
      )}
    </div>
  )
}
