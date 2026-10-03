import { useState } from 'react'
import { __ } from '@/core/i18n'
import { Button, Dropdown } from '@/design-system'
import { CFConditions } from '@/shared/components/ConditionsFilter'
import type { ConditionList } from '@/shared/types/conditions'

export interface WorkflowFiltersProps {
  value: string | ConditionList | null | undefined
  doctype: string
  label?: string
  flat?: boolean
  onChange: (value: string) => void
}

function read(value: WorkflowFiltersProps['value']): ConditionList {
  if (Array.isArray(value)) return value
  try {
    const parsed = JSON.parse(value || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function clean(conditions: ConditionList): ConditionList {
  const kept: ConditionList = []
  conditions.forEach((entry) => {
    if (typeof entry === 'string') {
      kept.push(entry)
      return
    }
    if (Array.isArray(entry[0])) {
      kept.push(clean(entry as ConditionList))
      return
    }
    if ((entry as unknown[])[0]) kept.push(entry)
  })
  return kept
}

export function WorkflowFilters({
  value,
  doctype,
  label = __('Filters'),
  flat = false,
  onChange,
}: WorkflowFiltersProps) {
  const [tree, setTree] = useState<ConditionList>(() => read(value))
  const [mirrored, setMirrored] = useState(() => JSON.stringify(clean(tree)))
  const incoming = JSON.stringify(read(value))
  if (incoming !== mirrored) {
    setMirrored(incoming)
    setTree(read(value))
  }
  const conditions = tree

  function store(next: ConditionList) {
    const cleaned = JSON.stringify(clean(next))
    setMirrored(cleaned)
    setTree(next)
    onChange(cleaned)
  }

  function add(node: ConditionList[number]) {
    store([...conditions, ...(conditions.length ? ['and'] : []), node])
  }

  return (
    <div className="space-y-2">
      {label && <label className="block text-sm text-ink-gray-5">{label}</label>}
      {conditions.length ? (
        <CFConditions key={doctype} conditions={conditions} onChange={store} doctype={doctype} />
      ) : (
        <div className="flex w-full rounded-lg border border-outline-gray-2 p-3">
          {flat ? (
            <Button label={__('Add Condition')} iconLeft="lucide-plus" onClick={() => add(['', '=', ''])} />
          ) : (
            <Dropdown
              options={[
                { label: __('Add Condition'), onClick: () => add(['', '=', '']) },
                { label: __('Add Condition Group'), onClick: () => add([['', '=', '']] as never) },
              ]}
            >
              {({ open }) => (
                <Button
                  label={__('Add Condition')}
                  iconLeft="lucide-plus"
                  iconRight={open ? 'lucide-chevron-up' : 'lucide-chevron-down'}
                />
              )}
            </Dropdown>
          )}
        </div>
      )}
      {flat && conditions.length > 1 && (
        <p className="text-xs text-ink-gray-5">{__('A trigger runs only when these filters match.')}</p>
      )}
    </div>
  )
}
