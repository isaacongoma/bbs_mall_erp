import { __ } from '@/core/i18n'
import { Button, FormControl } from '@/design-system'
import { capabilitiesFor, useWorkflowCapabilities, type AliasTarget } from '../../stores/workflowCapabilitiesStore'
import { WorkflowFilters } from './WorkflowFilters'

type AnyRecord = Record<string, any>

export interface WorkflowRelatedConditionProps {
  value: string
  targets: AliasTarget[]
  onChange: (value: string) => void
}

function parse(value: string): AnyRecord | null {
  if (!value) return null
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

export function WorkflowRelatedCondition({ value, targets, onChange }: WorkflowRelatedConditionProps) {
  useWorkflowCapabilities((state) => state.cache)
  const condition = parse(value)
  const jinjaHint = `${__('Filter values may use Jinja, e.g.')} {{ trigger.creation }}`

  const operatorOptions = [
    { label: __('A related record exists'), value: 'RelatedExists' },
    { label: __('No related record exists'), value: 'RelatedNotExists' },
    { label: __('Count of related records'), value: 'RelatedCount' },
  ]

  const sourceOptions = targets.map((target) => ({
    label: target.doctype ? `${target.alias} (${target.doctype})` : target.alias,
    value: target.alias,
  }))

  const sourceDoctype = targets.find((target) => target.alias === condition?.source)?.doctype
  const relationships: AnyRecord[] = capabilitiesFor(sourceDoctype)?.relationships || []
  const relationshipOptions = relationships.map((definition) => ({
    label: definition.label || definition.name,
    value: definition.name,
  }))
  const relatedDoctype = relationships.find((definition) => definition.name === condition?.relationship)?.target_doctype

  function commit(next: AnyRecord | null) {
    onChange(next ? JSON.stringify(next) : '')
  }

  function update(key: string, next: unknown) {
    commit({ ...condition, [key]: next })
  }

  function defaultCondition() {
    return {
      type: 'RelatedExists',
      source: targets[0]?.alias || 'trigger',
      relationship: '',
      filters: [],
      comparison: '>=',
      value: 1,
    }
  }

  return (
    <div className="space-y-3 rounded border border-outline-gray-2 p-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-ink-gray-5">{__('Related Record Condition')}</div>
        {condition && (
          <Button
            icon="lucide-x"
            variant="ghost"
            size="sm"
            aria-label={__('Clear condition')}
            onClick={() => commit(null)}
          />
        )}
      </div>
      {!condition ? (
        <Button
          size="sm"
          iconLeft="lucide-plus"
          label={__('Add condition')}
          onClick={() => commit(defaultCondition())}
        />
      ) : (
        <>
          <FormControl
            type="select"
            variant="outline"
            label={__('Check')}
            options={operatorOptions}
            value={condition.type}
            onChange={(next: string) => update('type', next)}
          />
          <FormControl
            type="select"
            variant="outline"
            label={__('Of record')}
            options={sourceOptions}
            value={condition.source}
            onChange={(next: string) => update('source', next)}
          />
          <FormControl
            type="select"
            variant="outline"
            label={__('Related')}
            options={relationshipOptions}
            value={condition.relationship}
            onChange={(next: string) => update('relationship', next)}
          />
          {condition.type === 'RelatedCount' && (
            <div className="flex gap-2">
              <FormControl
                type="select"
                variant="outline"
                className="w-24"
                label={__('Is')}
                options={['=', '!=', '>', '>=', '<', '<=']}
                value={condition.comparison}
                onChange={(next: string) => update('comparison', next)}
              />
              <FormControl
                type="number"
                variant="outline"
                className="flex-1"
                label={__('Count')}
                value={condition.value}
                onChange={(next: string) => update('value', Number(next))}
              />
            </div>
          )}
          <WorkflowFilters
            value={condition.filters || []}
            doctype={relatedDoctype ?? ''}
            label={__('Filters')}
            flat
            onChange={(next) => update('filters', next ? JSON.parse(next) : [])}
          />
          <div className="text-xs text-ink-gray-5">{jinjaHint}</div>
        </>
      )}
    </div>
  )
}
