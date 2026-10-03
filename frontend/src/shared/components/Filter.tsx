import { useMemo } from 'react'
import { __ } from '@/core/i18n'
import { useObservable } from '@/core/resources'
import {
  Button,
  Combobox,
  DatePicker,
  DateRangePicker,
  DateTimePicker,
  Popover,
  type ComboboxOption,
} from '@/design-system'
import { useFilterableFields } from '../hooks/useFilterableFields'
import { useIsMobileView } from '../hooks/useIsMobileView'
import type { FilterableField } from '../types/conditions'
import type { ViewListResource } from '../types/view'
import { TYPE_CHECK, TYPE_DATE, TYPE_LINK, TYPE_NUMBER, TYPE_RATING, TYPE_SELECT } from '../utils/conditionOperators'
import { getFormat } from '../utils/date'
import {
  TYPE_DURATION,
  convertFilters,
  filterPlaceholder,
  getFilterDefaultOperator,
  getFilterDefaultValue,
  getFilterOperators,
  getFilterSelectOptions,
  getTimespanOptions,
  parseFilters,
  removeCommonFilters,
  type ActiveFilter,
  type FilterMap,
} from '../utils/filterOperators'
import { CommitInput } from './Controls/CommitInput'
import { DurationInput } from './Controls/DurationInput'
import { Link } from './Controls/Link'
import { RatingInput } from './Controls/RatingInput'
import { FilterIcon } from './Icons'

const ID_FIELD_DOCTYPES = ['CRM Lead', 'CRM Deal']

export interface FilterProps {
  list: ViewListResource
  doctype: string
  defaultFilters?: FilterMap | null
  onUpdate: (filters: FilterMap) => void
}

interface FilterValueProps {
  filter: ActiveFilter
  onValue: (value: unknown) => void
}

function FilterValue({ filter, onValue }: FilterValueProps) {
  const { operator, value } = filter
  const { fieldtype, options } = filter.field
  const placeholder = filterPlaceholder(filter)

  if (operator === 'is') {
    return (
      <Combobox
        trigger="button"
        options={[
          { label: __('Set'), value: 'set' },
          { label: __('Not Set'), value: 'not set' },
        ]}
        value={value ?? null}
        onChange={(next) => onValue(next)}
      />
    )
  }
  if (operator === 'timespan') {
    return (
      <Combobox
        trigger="button"
        options={getTimespanOptions()}
        value={value ?? null}
        onChange={(next) => onValue(next)}
      />
    )
  }
  if (['like', 'not like', 'in', 'not in'].includes(operator)) {
    return <CommitInput type="text" placeholder={placeholder} value={value} onCommit={onValue} />
  }
  if (TYPE_SELECT.includes(fieldtype) || TYPE_CHECK.includes(fieldtype)) {
    const choices = fieldtype === 'Check' ? ['Yes', 'No'] : getFilterSelectOptions(options)
    return (
      <Combobox
        trigger="button"
        options={choices.map((choice) => ({ label: choice, value: choice }))}
        value={value ?? null}
        onChange={(next) => onValue(next)}
      />
    )
  }
  if (TYPE_LINK.includes(fieldtype)) {
    if (fieldtype === 'Dynamic Link') {
      return <CommitInput type="text" placeholder={placeholder} value={value} onCommit={onValue} />
    }
    return <Link className="form-control" doctype={options ?? ''} value={value} onChange={onValue} />
  }
  if (TYPE_NUMBER.includes(fieldtype)) {
    return <CommitInput type="number" placeholder={placeholder} value={value} onCommit={onValue} />
  }
  if (TYPE_DATE.includes(fieldtype) && operator === 'between') {
    return (
      <DateRangePicker
        value={Array.isArray(value) ? value : String(value ?? '').split(',')}
        format={getFormat('', '', true, false, false)}
        placeholder={placeholder}
        onChange={(next) => onValue(next)}
      />
    )
  }
  if (TYPE_DURATION.includes(fieldtype)) {
    return <DurationInput value={value} onChange={(next) => onValue(next)} />
  }
  if (TYPE_RATING.includes(fieldtype)) {
    return <RatingInput className="!flex" value={value} max={options || 5} onChange={(next) => onValue(next)} />
  }
  if (TYPE_DATE.includes(fieldtype)) {
    const Picker = fieldtype === 'Date' ? DatePicker : DateTimePicker
    return (
      <Picker
        value={value ?? ''}
        placeholder={placeholder}
        format={fieldtype === 'Date' ? getFormat('', '', true, false, false) : getFormat('', '', true, true, false)}
        onChange={(next) => onValue(next)}
      />
    )
  }
  return <CommitInput type="text" placeholder={placeholder} value={value} onCommit={onValue} />
}

export function Filter({ list, doctype, defaultFilters, onUpdate }: FilterProps) {
  useObservable(list)
  const isMobileView = useIsMobileView()
  const filterableFields = useFilterableFields(doctype)

  const filters = useMemo<ActiveFilter[]>(() => {
    if (!list.data) return []
    let allFilters = list.params?.filters || list.data?.params?.filters
    if (!allFilters || Object.keys(allFilters).length === 0 || !filterableFields.length) return []
    if (defaultFilters) allFilters = removeCommonFilters(defaultFilters, allFilters)
    return convertFilters(filterableFields, allFilters)
  }, [list.data, list.params, filterableFields, defaultFilters])

  const markIdField = ID_FIELD_DOCTYPES.includes(doctype)

  const filterFieldOptions: ComboboxOption[] = filterableFields.map((field) => {
    const option: Record<string, unknown> = { ...field }
    if (markIdField && field.fieldname === 'name') {
      option.slots = {
        suffix: () => (
          <span
            className="lucide-id-card size-4 shrink-0 text-ink-gray-5"
            title={__('Document ID, not the full name')}
          />
        ),
      }
    }
    return option as unknown as ComboboxOption
  })

  const selectedFieldNames = new Set(filters.map((filter) => filter.fieldname))
  const availableFilters = filterFieldOptions.filter(
    (option) => !selectedFieldNames.has((option as unknown as FilterableField).fieldname),
  )

  function apply(next: ActiveFilter[]) {
    onUpdate(
      parseFilters(
        next.map((filter) => ({ fieldname: filter.fieldname, operator: filter.operator, value: filter.value })),
      ),
    )
  }

  function buildFilter(data: FilterableField): ActiveFilter {
    return {
      field: { label: data.label, fieldname: data.fieldname, fieldtype: data.fieldtype, options: data.options },
      fieldname: data.fieldname,
      operator: getFilterDefaultOperator(data.fieldtype),
      value: getFilterDefaultValue(data),
    }
  }

  function setFilter(data: FilterableField | null) {
    if (!data) return
    apply([...filters, buildFilter(data)])
  }

  function updateFilter(data: FilterableField | null, index: number) {
    if (!data?.fieldname) return
    apply([...filters.filter((_, i) => i !== index), buildFilter(data)])
  }

  function removeFilter(index: number) {
    apply(filters.filter((_, i) => i !== index))
  }

  function clearFilter(close: () => void) {
    apply([])
    close()
  }

  function updateValue(raw: unknown, index: number) {
    let value =
      raw !== null && typeof raw === 'object' && 'target' in raw
        ? (raw as { target: { value: unknown } }).target.value
        : raw
    const filter = filters[index]!
    if (filter.operator === 'between' && typeof value === 'string') {
      value = value.split(',').map((entry) => entry.trim())
    }
    apply(filters.map((entry, i) => (i === index ? { ...entry, value } : entry)))
  }

  function updateOperator(operator: string, index: number) {
    const current = filters[index]!
    let value: unknown = getFilterDefaultValue(current.field)
    if (operator === 'is' || operator === 'is not') value = 'set'
    apply(filters.map((entry, i) => (i === index ? { ...entry, operator, value } : entry)))
  }

  const operatorsFor = (filter: ActiveFilter) => getFilterOperators(filter.field.fieldtype, filter.field.fieldname)

  return (
    <Popover
      placement="bottom-end"
      target={({ togglePopover, close }) => (
        <div className="flex items-center">
          <Button
            label={__('Filter')}
            className={filters.length ? 'rounded-r-none' : ''}
            iconLeft={FilterIcon}
            onClick={() => togglePopover()}
            suffix={
              filters.length ? (
                <div className="flex h-5 w-5 items-center justify-center rounded-[5px] bg-surface-base pt-px text-xs-medium text-ink-gray-8 shadow-sm">
                  {filters.length}
                </div>
              ) : undefined
            }
          />
          {filters.length > 0 && (
            <Button
              tooltip={__('Clear All Filters')}
              className="rounded-l-none border-l"
              icon="lucide-x"
              onClick={(event) => {
                event.stopPropagation()
                clearFilter(close)
              }}
            />
          )}
        </div>
      )}
      body={({ close }) => (
        <div className="my-2 min-w-40 rounded-lg bg-surface-elevation-2 shadow-2xl ring-1 ring-black/5 focus:outline-none">
          <div className="min-w-72 p-2 sm:min-w-[400px]">
            {filters.length > 0 ? (
              filters.map((filter, index) => {
                const fieldCombobox = (
                  <Combobox
                    trigger="button"
                    value={filter.field.fieldname}
                    options={filterFieldOptions}
                    placeholder={__('First Name')}
                    onSelectedOptionChange={(option) => {
                      if (option && option.type !== 'custom') updateFilter(option as unknown as FilterableField, index)
                    }}
                  />
                )
                const operatorCombobox = (
                  <Combobox
                    trigger="button"
                    value={filter.operator}
                    options={operatorsFor(filter)}
                    placeholder={__('Equals')}
                    onChange={(next) => updateOperator(String(next), index)}
                  />
                )
                const label = index === 0 ? __('Where') : __('And')
                return (
                  <div key={`${filter.fieldname}-${index}`} id="filter-list" className="mb-4 sm:mb-3">
                    {isMobileView ? (
                      <div className="flex flex-col gap-2">
                        <div className="-mb-2 flex w-full items-center justify-between">
                          <div className="text-base text-ink-gray-5">{label}</div>
                          <Button
                            className="flex"
                            variant="ghost"
                            icon="lucide-x"
                            onClick={() => removeFilter(index)}
                          />
                        </div>
                        <div id="fieldname" className="w-full">
                          {fieldCombobox}
                        </div>
                        <div id="operator">{operatorCombobox}</div>
                        <div id="value" className="w-full">
                          <FilterValue filter={filter} onValue={(value) => updateValue(value, index)} />
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-13 pl-2 text-end text-base text-ink-gray-5">{label}</div>
                          <div id="fieldname" className="!min-w-[140px]">
                            {fieldCombobox}
                          </div>
                          <div id="operator">{operatorCombobox}</div>
                          <div id="value" className="!min-w-[140px]">
                            <FilterValue filter={filter} onValue={(value) => updateValue(value, index)} />
                          </div>
                        </div>
                        <Button className="flex" variant="ghost" icon="lucide-x" onClick={() => removeFilter(index)} />
                      </div>
                    )}
                  </div>
                )
              })
            ) : (
              <div className="mb-3 flex h-7 items-center px-3 text-sm text-ink-gray-5">
                {__('Empty - Choose a field to filter by')}
              </div>
            )}
            <div className="flex items-center justify-between gap-2">
              <Combobox
                value={null}
                options={availableFilters}
                placeholder={__('First Name')}
                onSelectedOptionChange={(option) => {
                  if (option && option.type !== 'custom') setFilter(option as unknown as FilterableField)
                }}
                trigger={({ open, setOpen }) => (
                  <Button
                    className="!text-ink-gray-5"
                    variant="ghost"
                    label={__('Add Filter')}
                    iconLeft="lucide-plus"
                    onClick={() => setOpen(!open)}
                  />
                )}
              />
              {filters.length > 0 && (
                <Button
                  className="!text-ink-gray-5"
                  variant="ghost"
                  label={__('Clear All Filters')}
                  onClick={() => clearFilter(close)}
                />
              )}
            </div>
          </div>
        </div>
      )}
    />
  )
}
