import { __ } from '@/core/i18n'
import { Button, Dropdown } from '@/design-system'
import { useFilterableFields } from '../../hooks/useFilterableFields'
import type { ConditionList } from '../../types/conditions'
import '../../styles/conditionsFilter.css'
import { CFCondition } from './CFCondition'

export interface CFConditionsProps {
  conditions: ConditionList
  onChange: (conditions: ConditionList) => void
  isChild?: boolean
  level?: number
  disableAddCondition?: boolean
  doctype: string
  variant?: 'subtle' | 'outline' | 'ghost'
}

function getConjunction(conditions: ConditionList): string {
  let conjunction = 'and'
  conditions.forEach((condition) => {
    if (typeof condition === 'string') conjunction = condition
  })
  return conjunction
}

export function CFConditions({
  conditions,
  onChange,
  isChild = false,
  level = 0,
  disableAddCondition = false,
  doctype,
  variant = 'subtle',
}: CFConditionsProps) {
  useFilterableFields(doctype)

  function replaceAt(index: number, deleteCount: number, ...items: ConditionList) {
    const next = [...conditions]
    next.splice(index, deleteCount, ...items)
    onChange(next)
  }

  function removeCondition(index: number) {
    if (index === 0) replaceAt(0, 2)
    else replaceAt(index - 1, 2)
  }

  function unGroupConditions(index: number) {
    const conjunction = getConjunction(conditions)
    const group = conditions[index] as ConditionList
    const flattened = group.map((entry) => (typeof entry === 'string' ? conjunction : entry))
    replaceAt(index, 1, ...flattened)
  }

  function toggleConjunction(conjunction: string) {
    const toggled = conjunction === 'and' ? 'or' : 'and'
    onChange(conditions.map((condition) => (typeof condition === 'string' ? toggled : condition)))
  }

  function turnIntoGroup(index: number) {
    replaceAt(index, 1, [conditions[index]])
  }

  const dropdownOptions = [
    {
      label: __('Add Condition'),
      onClick: () => onChange([...conditions, getConjunction(conditions), ['', '', '']]),
    },
    ...(level < 3
      ? [
          {
            label: __('Add Condition Group'),
            onClick: () => onChange([...conditions, getConjunction(conditions), [[]]]),
          },
        ]
      : []),
  ]

  return (
    <div className="condition-group flex w-full flex-col gap-4 rounded-lg border border-outline-gray-2 p-3">
      {conditions.map((condition, index) =>
        Array.isArray(condition) ? (
          <CFCondition
            key={index}
            condition={condition}
            onChange={(next) => replaceAt(index, 1, next)}
            isChild={isChild}
            itemIndex={index}
            level={level + 1}
            isGroup={Array.isArray(condition[0])}
            conjunction={getConjunction(conditions)}
            disableAddCondition={disableAddCondition}
            doctype={doctype}
            variant={variant}
            onRemove={() => removeCondition(index)}
            onUnGroupConditions={() => unGroupConditions(index)}
            onToggleConjunction={toggleConjunction}
            onTurnIntoGroup={() => turnIntoGroup(index)}
          />
        ) : null,
      )}
      {isChild && (
        <div className="flex">
          <Dropdown options={dropdownOptions}>
            {({ open }) => (
              <Button
                disabled={disableAddCondition}
                label={__('Add Condition')}
                iconLeft="lucide-plus"
                iconRight={open ? 'lucide-chevron-up' : 'lucide-chevron-down'}
              />
            )}
          </Dropdown>
        </div>
      )}
    </div>
  )
}
