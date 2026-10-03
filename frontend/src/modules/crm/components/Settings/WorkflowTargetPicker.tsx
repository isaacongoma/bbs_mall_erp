import { __ } from '@/core/i18n'
import { FormControl } from '@/design-system'
import type { AliasTarget } from '../../stores/workflowCapabilitiesStore'

export interface WorkflowTargetPickerProps {
  value: string
  targets: AliasTarget[]
  label?: string
  onChange: (value: string) => void
}

export function WorkflowTargetPicker({ value, targets, label = '', onChange }: WorkflowTargetPickerProps) {
  const options = targets.map((target) => ({
    label: target.doctype ? `${target.alias} (${target.doctype})` : target.alias,
    value: target.alias,
  }))
  const target = targets.find((item) => item.alias === (value || 'trigger'))
  const hint = !target
    ? __('This alias is not available at this step')
    : target.doctype
      ? __('One {0} record', [target.doctype])
      : __('DocType resolved at runtime')

  return (
    <div>
      <FormControl
        type="select"
        variant="outline"
        label={label}
        options={options}
        value={value || 'trigger'}
        onChange={(next: string) => onChange(next)}
      />
      <div className="mt-1 text-xs text-ink-gray-5">{hint}</div>
    </div>
  )
}
