import { useState } from 'react'
import { __ } from '@/core/i18n'
import {
  Button,
  Combobox,
  DatePicker,
  DateRangePicker,
  DateTimePicker,
  Dialog,
  Dropdown,
  FormControl,
  Rating,
  cn,
  type DropdownOption,
} from '@/design-system'
import { useFilterableFields } from '../../hooks/useFilterableFields'
import type { ConditionList, FilterableField } from '../../types/conditions'
import {
  TYPE_CHECK,
  TYPE_DATE,
  TYPE_LINK,
  TYPE_NUMBER,
  TYPE_RATING,
  TYPE_SELECT,
  getOperatorsFor,
  parseSelectOptions,
  resolveOperator,
} from '../../utils/conditionOperators'
import { Link } from '../Controls/Link'
import { CFConditions } from './CFConditions'

type Variant = 'subtle' | 'outline' | 'ghost'

export interface CFConditionProps {
  condition: unknown[]
  onChange: (condition: unknown[]) => void
  isChild?: boolean
  itemIndex?: number
  level?: number
  isGroup?: boolean
  conjunction?: string
  disableAddCondition?: boolean
  doctype?: string
  variant?: Variant
  onRemove: () => void
  onUnGroupConditions: () => void
  onToggleConjunction: (conjunction: string) => void
  onTurnIntoGroup: () => void
}

interface ValueControlProps {
  condition: unknown[]
  fieldData: FilterableField | undefined
  variant: Variant
  placeholder: string
  onChange: (value: unknown) => void
  onValue: (value: unknown) => void
  onCommit: () => void
}

function ValueControl({ condition, fieldData, variant, placeholder, onChange, onValue, onCommit }: ValueControlProps) {
  const [field, operator] = condition as [string, string, unknown]
  const value = condition[2]
  if (!field || !fieldData) return null
  const { fieldtype, options } = fieldData

  if (operator === 'is') {
    return (
      <FormControl
        type="select"
        variant={variant}
        value={String(value ?? '')}
        options={[
          { label: 'Set', value: 'set' },
          { label: 'Not Set', value: 'not set' },
        ]}
        onChange={(next: unknown) => onValue(next)}
      />
    )
  }

  if (['like', 'not like', 'in', 'not in'].includes(operator)) {
    return (
      <FormControl
        type="text"
        variant={variant}
        placeholder={placeholder}
        value={String(value ?? '')}
        onChange={(next: string) => onChange(next)}
        onBlur={onCommit}
      />
    )
  }

  if (TYPE_SELECT.includes(fieldtype) || TYPE_CHECK.includes(fieldtype)) {
    const selectOptions = fieldtype === 'Check' ? ['Yes', 'No'] : parseSelectOptions(options)
    return (
      <FormControl
        type="select"
        variant={variant}
        value={String(value ?? '')}
        options={selectOptions.map((option) => ({ label: option, value: option }))}
        onChange={(next: unknown) => onValue(next)}
      />
    )
  }

  if (TYPE_LINK.includes(fieldtype)) {
    if (fieldtype === 'Dynamic Link') {
      return (
        <FormControl
          type="text"
          variant={variant}
          placeholder={placeholder}
          value={String(value ?? '')}
          onChange={(next: string) => onChange(next)}
          onBlur={onCommit}
        />
      )
    }
    return (
      <Link
        className="form-control"
        doctype={options ?? ''}
        variant={variant}
        value={value as string}
        onChange={(next) => onValue(next)}
      />
    )
  }

  if (TYPE_NUMBER.includes(fieldtype)) {
    return (
      <FormControl
        type="number"
        variant={variant}
        placeholder={placeholder}
        value={String(value ?? '')}
        onChange={(next: string) => onChange(next)}
        onBlur={onCommit}
      />
    )
  }

  if (TYPE_DATE.includes(fieldtype) && operator === 'between') {
    return (
      <DateRangePicker
        value={Array.isArray(value) ? (value as string[]) : String(value ?? '').split(',')}
        variant={variant}
        onChange={(next) => onValue(next)}
      />
    )
  }

  if (TYPE_DATE.includes(fieldtype)) {
    const Picker = fieldtype === 'Date' ? DatePicker : DateTimePicker
    return <Picker value={(value as string) ?? ''} variant={variant} onChange={(next) => onValue(next)} />
  }

  if (TYPE_RATING.includes(fieldtype)) {
    return <Rating className="truncate" value={Number(value) || 0} onChange={(next) => onValue(next)} />
  }

  return (
    <FormControl
      type="text"
      variant={variant}
      placeholder={placeholder}
      value={String(value ?? '')}
      onChange={(next: string) => onChange(next)}
      onBlur={onCommit}
    />
  )
}

export function CFCondition({
  condition,
  onChange,
  itemIndex = 0,
  level = 0,
  isGroup = false,
  conjunction = 'and',
  disableAddCondition = false,
  doctype = '',
  variant = 'subtle',
  onRemove,
  onUnGroupConditions,
  onToggleConjunction,
  onTurnIntoGroup,
}: CFConditionProps) {
  const [show, setShow] = useState(false)
  const filterableFields = useFilterableFields(doctype)
  const [fieldname, operator] = condition as [string, string]
  const fieldData = filterableFields.find((field) => field.fieldname === fieldname)
  const operators = fieldData ? getOperatorsFor(fieldData.fieldtype, fieldData.fieldname) : []
  const effectiveOperator = fieldData ? resolveOperator(operators, operator) : ''

  function set(index: number, value: unknown) {
    const next = [...condition]
    next[index] = value
    onChange(next)
  }

  function updateField(field: { fieldname?: string } | null) {
    const name = field?.fieldname ?? ''
    const data = filterableFields.find((entry) => entry.fieldname === name)
    const nextOperators = data ? getOperatorsFor(data.fieldtype, data.fieldname) : []
    onChange([name, resolveOperator(nextOperators, operator), ''])
  }

  function updateOperator(next: unknown) {
    onChange([condition[0], next, ''])
  }

  function convertValue(raw: unknown): unknown {
    const value =
      raw !== null && typeof raw === 'object' && 'target' in raw
        ? (raw as { target: { value: unknown } }).target.value
        : raw
    if (operator === 'between') {
      const parts = Array.isArray(value) ? value : String(value ?? '').split(',')
      return [parts[0], parts[1]]
    }
    if (typeof value === 'string' && value !== '' && !Number.isNaN(Number(value))) return Number(value)
    return value
  }

  function valuePlaceholder(): string {
    if (['like', 'not like'].includes(operator)) return __('e.g. @gmail.com')
    if (['in', 'not in'].includes(operator)) return __('e.g. Open, Replied')
    return __('Condition')
  }

  const dropdownOptions: DropdownOption[] = [
    ...(!isGroup && level < 4
      ? [{ label: __('Turn into a Group'), icon: 'lucide-group', onClick: onTurnIntoGroup } as DropdownOption]
      : []),
    ...(isGroup
      ? [{ label: __('Ungroup Conditions'), icon: 'lucide-ungroup', onClick: onUnGroupConditions } as DropdownOption]
      : []),
    { label: __('Remove'), icon: 'lucide-trash-2', theme: 'red', onClick: onRemove, condition: () => !isGroup },
    { label: __('Remove Group'), icon: 'lucide-trash-2', theme: 'red', onClick: onRemove, condition: () => isGroup },
  ]

  const nestedGroup = (
    <CFConditions
      conditions={condition as ConditionList}
      onChange={(next) => onChange(next)}
      isChild
      level={level}
      disableAddCondition={disableAddCondition}
      doctype={doctype}
      variant={variant}
    />
  )

  return (
    <>
      <div className={cn('condition-row flex gap-2', !isGroup && 'items-center')}>
        <div className={cn('condition-main flex w-full gap-2', !isGroup && 'items-center justify-between')}>
          <div className="condition-conjunction text-end text-base text-ink-gray-5">
            {itemIndex === 0 ? (
              <div className="min-w-[66px] text-start">{__('Where')}</div>
            ) : (
              <div className="flex min-w-[66px] items-start">
                <Button
                  variant="subtle"
                  className="w-max"
                  iconRight="lucide-refresh-cw"
                  disabled={itemIndex > 2}
                  label={conjunction}
                  onClick={() => onToggleConjunction(conjunction)}
                />
              </div>
            )}
          </div>
          {!isGroup && (
            <div className="condition-fields flex w-full items-center gap-2">
              <div className="condition-field w-full">
                <Combobox
                  trigger="button"
                  variant={variant}
                  options={filterableFields}
                  value={fieldname || null}
                  placeholder={__('Field')}
                  onSelectedOptionChange={(option) => {
                    if (option && option.type !== 'custom') updateField(option as unknown as { fieldname?: string })
                  }}
                />
              </div>
              <div className="condition-operator">
                {!fieldname ? (
                  <FormControl
                    disabled
                    type="text"
                    variant={variant}
                    placeholder={__('Operator')}
                    className="w-[100px]"
                  />
                ) : (
                  <FormControl
                    type="select"
                    variant={variant}
                    value={effectiveOperator}
                    options={operators}
                    className="w-max min-w-[100px] text-ink-gray-8"
                    onChange={updateOperator}
                  />
                )}
              </div>
              <div className="condition-value w-full">
                {!fieldname ? (
                  <FormControl
                    disabled
                    type="text"
                    variant={variant}
                    placeholder={__('Condition')}
                    className="w-full"
                  />
                ) : (
                  <ValueControl
                    condition={[fieldname, effectiveOperator, condition[2]]}
                    fieldData={fieldData}
                    variant={variant}
                    placeholder={valuePlaceholder()}
                    onChange={(value) => set(2, value)}
                    onValue={(value) => set(2, convertValue(value))}
                    onCommit={() => set(2, convertValue(condition[2]))}
                  />
                )}
              </div>
            </div>
          )}
          {isGroup && !(level === 2 || level === 4) && nestedGroup}
          {isGroup && (level === 2 || level === 4) && (
            <Button variant="outline" label={__('Open Nested Conditions')} onClick={() => setShow(true)} />
          )}
        </div>
        <div className="condition-actions w-max">
          <Dropdown placement="right" options={dropdownOptions}>
            <Button variant="ghost" icon="lucide-more-horizontal" />
          </Dropdown>
        </div>
      </div>
      <Dialog open={show} onOpenChange={setShow} size="3xl" title={__('Nested Conditions')}>
        {show && nestedGroup}
      </Dialog>
    </>
  )
}
