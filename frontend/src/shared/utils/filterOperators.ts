import { __ } from '@/core/i18n'
import type { FilterableField } from '../types/conditions'
import {
  TYPE_CHECK,
  TYPE_DATE,
  TYPE_LINK,
  TYPE_NUMBER,
  TYPE_RATING,
  TYPE_SELECT,
  TYPE_STRING,
} from './conditionOperators'

export interface FilterOperatorOption {
  label: string
  value: string
  [key: string]: unknown
}

export interface ActiveFilter {
  field: Pick<FilterableField, 'label' | 'fieldname' | 'fieldtype' | 'options'>
  fieldname: string
  operator: string
  value: any
}

export type FilterMap = Record<string, unknown>

export const TYPE_DURATION = ['Duration']

export const OPERATOR_MAP: Record<string, unknown> = {
  is: 'is',
  'is not': 'is not',
  in: 'in',
  'not in': 'not in',
  equals: '=',
  'not equals': '!=',
  yes: true,
  no: false,
  like: 'LIKE',
  'not like': 'NOT LIKE',
  '>': '>',
  '<': '<',
  '>=': '>=',
  '<=': '<=',
  between: 'between',
  timespan: 'timespan',
}

export const OPPOSITE_OPERATOR_MAP: Record<string, string> = {
  is: 'is',
  '=': 'equals',
  '!=': 'not equals',
  equals: 'equals',
  'is not': 'is not',
  true: 'yes',
  false: 'no',
  LIKE: 'like',
  'NOT LIKE': 'not like',
  in: 'in',
  'not in': 'not in',
  '>': '>',
  '<': '<',
  '>=': '>=',
  '<=': '<=',
  between: 'between',
  timespan: 'timespan',
}

const op = (label: string, value: string): FilterOperatorOption => ({ label: __(label), value })

export function getFilterOperators(fieldtype: string, fieldname: string): FilterOperatorOption[] {
  let options: FilterOperatorOption[] = []
  const equals = [op('Equals', 'equals'), op('Not equals', 'not equals')]
  const patterns = [
    op('Like', 'like'),
    op('Not like', 'not like'),
    op('In', 'in'),
    op('Not in', 'not in'),
    op('Is', 'is'),
  ]

  if (TYPE_STRING.includes(fieldtype)) options.push(...equals, ...patterns)
  if (fieldname === '_assign') options = [op('Like', 'like'), op('Not like', 'not like'), op('Is', 'is')]
  if (TYPE_NUMBER.includes(fieldtype)) {
    options.push(...equals, ...patterns, op('<', '<'), op('>', '>'), op('<=', '<='), op('>=', '>='))
  }
  if (TYPE_SELECT.includes(fieldtype)) options.push(...equals, op('In', 'in'), op('Not in', 'not in'), op('Is', 'is'))
  if (TYPE_LINK.includes(fieldtype)) options.push(...equals, ...patterns)
  if (TYPE_CHECK.includes(fieldtype)) options.push(op('Equals', 'equals'))
  if (TYPE_DURATION.includes(fieldtype)) options.push(...patterns)
  if (TYPE_DATE.includes(fieldtype)) {
    options.push(
      ...equals,
      op('Is', 'is'),
      op('>', '>'),
      op('<', '<'),
      op('>=', '>='),
      op('<=', '<='),
      op('Between', 'between'),
      op('Timespan', 'timespan'),
    )
  }
  if (TYPE_RATING.includes(fieldtype)) {
    options.push(
      ...equals,
      op('Greater than', '>'),
      op('Less than', '<'),
      op('Greater than or equal to', '>='),
      op('Less than or equal to', '<='),
      op('Is', 'is'),
    )
  }
  return options
}

export function getFilterSelectOptions(options: string | undefined): string[] {
  return (options ?? '').split('\n')
}

export function getFilterDefaultValue(field: Pick<FilterableField, 'fieldtype' | 'options'>): unknown {
  if (TYPE_SELECT.includes(field.fieldtype)) return getFilterSelectOptions(field.options)[0]
  if (TYPE_CHECK.includes(field.fieldtype)) return 'Yes'
  if (TYPE_DATE.includes(field.fieldtype)) return null
  return ''
}

export function getFilterDefaultOperator(fieldtype: string): string {
  if (TYPE_SELECT.includes(fieldtype)) return 'equals'
  if (TYPE_CHECK.includes(fieldtype) || TYPE_NUMBER.includes(fieldtype)) return 'equals'
  if (TYPE_DATE.includes(fieldtype)) return 'between'
  return 'like'
}

export function filterPlaceholder(filter: ActiveFilter): string {
  const { operator } = filter
  const { fieldtype } = filter.field
  if (operator === 'between') return __('01/01/2022 to 01/31/2022')
  if (operator === 'in' || operator === 'not in') {
    return TYPE_NUMBER.includes(fieldtype) ? __('100, 200, 300') : __('John, Jane, Doe')
  }
  if (operator === 'like' || operator === 'not like') {
    return TYPE_NUMBER.includes(fieldtype) ? __('%100%') : __('%John%')
  }
  if (operator === 'is' || operator === 'is not') return __('Set')
  if (operator === 'timespan') return __('Last Week')
  if (TYPE_NUMBER.includes(fieldtype)) return __('1000')
  if (TYPE_DATE.includes(fieldtype)) return __('01/01/2022')
  if (TYPE_CHECK.includes(fieldtype)) return __('Yes')
  if (TYPE_LINK.includes(fieldtype)) return __('Select a Value')
  if (TYPE_SELECT.includes(fieldtype)) return __('Select an Option')
  if (TYPE_STRING.includes(fieldtype)) return __('John Doe')
  return __('Enter Value')
}

export function getTimespanOptions(): Array<{ label: string; value: string }> {
  return [
    ['Last Week', 'last week'],
    ['Last Month', 'last month'],
    ['Last Quarter', 'last quarter'],
    ['Last 6 Months', 'last 6 months'],
    ['Last Year', 'last year'],
    ['Yesterday', 'yesterday'],
    ['Today', 'today'],
    ['Tomorrow', 'tomorrow'],
    ['This Week', 'this week'],
    ['This Month', 'this month'],
    ['This Quarter', 'this quarter'],
    ['This Year', 'this year'],
    ['Next Week', 'next week'],
    ['Next Month', 'next month'],
    ['Next Quarter', 'next quarter'],
    ['Next 6 Months', 'next 6 months'],
    ['Next Year', 'next year'],
  ].map(([label, value]) => ({ label: __(label!), value: value! }))
}

export function removeCommonFilters(commonFilters: FilterMap | null | undefined, allFilters: FilterMap): FilterMap {
  if (!commonFilters) return allFilters
  const result = { ...allFilters }
  for (const key of Object.keys(commonFilters)) {
    if (Object.hasOwn(result, key) && commonFilters[key] === result[key]) delete result[key]
  }
  return result
}

export function convertFilters(fields: FilterableField[], allFilters: FilterMap): ActiveFilter[] {
  const result: ActiveFilter[] = []
  for (const [key, rawValue] of Object.entries(allFilters)) {
    const field = fields.find((candidate) => candidate.fieldname === key)
    let value: any = rawValue
    if (typeof value !== 'object' || !value) {
      value = ['=', value]
      if (field?.fieldtype === 'Check') value = ['equals', value[1] ? 'Yes' : 'No']
    }
    if (field) {
      result.push({
        field: { label: field.label, fieldname: field.fieldname, fieldtype: field.fieldtype, options: field.options },
        fieldname: key,
        operator: OPPOSITE_OPERATOR_MAP[value[0]] ?? value[0],
        value: value[1],
      })
    }
  }
  return result
}

function transformIn(filter: { fieldname: string; operator: string; value: any }) {
  const value = { ...filter }
  if (value.operator.includes('like') && !String(value.value).includes('%')) value.value = `%${value.value}%`
  if (['in', 'not in'].includes(value.operator) && typeof value.value === 'string') {
    value.value = value.value.split(',').map((entry: string) => entry.trim())
  }
  return value
}

export function parseFilters(filters: Array<{ fieldname: string; operator: string; value: any }>): FilterMap {
  const result: FilterMap = {}
  for (const filter of filters.map(transformIn)) {
    if (['equals', '='].includes(filter.operator)) {
      result[filter.fieldname] = filter.value === 'Yes' ? true : filter.value === 'No' ? false : filter.value
    } else {
      result[filter.fieldname] = [OPERATOR_MAP[filter.operator.toLowerCase()], filter.value]
    }
  }
  return result
}
