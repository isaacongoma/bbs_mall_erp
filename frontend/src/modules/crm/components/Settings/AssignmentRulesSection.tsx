import { useEffect, useRef } from 'react'
import { __ } from '@/core/i18n'
import { Button, Dropdown, ErrorMessage } from '@/design-system'
import { CFConditions } from '@/shared/components/ConditionsFilter'
import type { ConditionList } from '@/shared/types/conditions'
import { validateConditions } from '@/shared/utils/conditions'

export interface AssignmentRulesSectionProps {
  conditions: ConditionList
  errors: string
  doctype: string
  onChange: (conditions: ConditionList) => void
  onValidate: () => void
  emptyLabel?: string
  debounce?: number
}

function getConjunction(conditions: ConditionList): string {
  let conjunction = 'and'
  conditions.forEach((condition) => {
    if (typeof condition === 'string') conjunction = condition
  })
  return conjunction
}

export function AssignmentRulesSection({
  conditions,
  errors,
  doctype,
  onChange,
  onValidate,
  emptyLabel,
  debounce = 300,
}: AssignmentRulesSectionProps) {
  const validate = useRef(onValidate)
  useEffect(() => {
    validate.current = onValidate
  })

  useEffect(() => {
    const timer = setTimeout(() => validate.current(), debounce)
    return () => clearTimeout(timer)
  }, [conditions, debounce])

  function addCondition() {
    if (!validateConditions(conditions)) return
    onChange([...conditions, getConjunction(conditions), ['', '', '']])
  }

  return (
    <>
      {conditions.length > 0 && (
        <CFConditions
          conditions={conditions}
          onChange={onChange}
          level={0}
          disableAddCondition={errors !== ''}
          doctype={doctype}
        />
      )}
      {conditions.length === 0 && (
        <div
          className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-outline-gray-2 p-4 text-sm text-ink-gray-5"
          onClick={() => onChange([['', '', '']])}
        >
          <span className="lucide-plus h-4" aria-hidden="true" />
          {emptyLabel ?? __('Add a Condition')}
        </div>
      )}
      <div className="mt-2 flex items-center justify-between">
        {conditions.length > 0 && (
          <div>
            <Dropdown
              options={[
                { label: __('Add Condition'), onClick: addCondition },
                {
                  label: __('Add Condition Group'),
                  onClick: () => onChange([...conditions, getConjunction(conditions), [[]]]),
                },
              ]}
            >
              {({ open }) => (
                <Button
                  disabled={errors !== ''}
                  iconRight={open ? 'lucide-chevron-up' : 'lucide-chevron-down'}
                  label={__('Add Condition')}
                />
              )}
            </Dropdown>
          </div>
        )}
        {conditions.length > 0 && <ErrorMessage message={errors} />}
      </div>
    </>
  )
}
