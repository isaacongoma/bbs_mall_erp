import { describe, expect, it } from 'vitest'
import type { FilterableField } from '../types/conditions'
import { getOperatorsFor, resolveOperator } from '../utils/conditionOperators'
import {
  convertFilters,
  getFilterDefaultOperator,
  getFilterOperators,
  parseFilters,
  removeCommonFilters,
} from '../utils/filterOperators'
import {
  buildExportUrl,
  buildQuickFilterList,
  buildViewParams,
  dirtySignature,
  resolveMePlaceholders,
} from '../utils/viewController'

const fields: FilterableField[] = [
  { label: 'Status', value: 'status', fieldname: 'status', fieldtype: 'Select', options: 'Open\nClosed' },
  { label: 'First Name', value: 'first_name', fieldname: 'first_name', fieldtype: 'Data' },
  { label: 'Qualified', value: 'qualified', fieldname: 'qualified', fieldtype: 'Check' },
]

describe('filter conversion', () => {
  it('converts stored filters into editable rows', () => {
    const rows = convertFilters(fields, {
      status: ['!=', 'Open'],
      first_name: ['LIKE', '%jo%'],
      qualified: true,
    })
    expect(rows.map((row) => [row.fieldname, row.operator, row.value])).toEqual([
      ['status', 'not equals', 'Open'],
      ['first_name', 'like', '%jo%'],
      ['qualified', 'equals', 'Yes'],
    ])
  })

  it('round-trips rows back into the stored filter map', () => {
    const rows = convertFilters(fields, { status: ['!=', 'Open'], qualified: false })
    const map = parseFilters(
      rows.map((row) => ({ fieldname: row.fieldname, operator: row.operator, value: row.value })),
    )
    expect(map).toEqual({ status: ['!=', 'Open'], qualified: false })
  })

  it('wraps like values and splits in values', () => {
    expect(
      parseFilters([
        { fieldname: 'first_name', operator: 'like', value: 'jo' },
        { fieldname: 'status', operator: 'in', value: 'Open, Closed' },
      ]),
    ).toEqual({ first_name: ['LIKE', '%jo%'], status: ['in', ['Open', 'Closed']] })
  })

  it('drops filters identical to the defaults', () => {
    expect(removeCommonFilters({ owner: 'a' }, { owner: 'a', status: 'x' })).toEqual({ status: 'x' })
  })

  it('picks sensible default operators', () => {
    expect(getFilterDefaultOperator('Select')).toBe('equals')
    expect(getFilterDefaultOperator('Date')).toBe('between')
    expect(getFilterDefaultOperator('Data')).toBe('like')
    expect(getFilterOperators('Check', 'x').map((operator) => operator.value)).toEqual(['equals'])
  })
})

describe('condition operators', () => {
  it('keeps a valid operator and falls back to the first option', () => {
    const operators = getOperatorsFor('Data', 'name')
    expect(resolveOperator(operators, 'like')).toBe('like')
    expect(resolveOperator(operators, 'nonsense')).toBe('==')
  })

  it('restricts assignment fields', () => {
    expect(getOperatorsFor('Data', '_assign').map((operator) => operator.value)).toEqual(['like', 'not like', 'is'])
  })
})

describe('view controller helpers', () => {
  it('builds list params and a view draft', () => {
    const { params, viewDraft } = buildViewParams({
      doctype: 'CRM Lead',
      defaultFilters: {},
      view: null,
      viewType: 'kanban',
      routeName: 'Leads',
      pageLength: 20,
      pageLengthCount: 20,
    })
    expect(params.order_by).toBe('modified desc')
    expect(params.view).toEqual({ custom_view_name: '', view_type: 'kanban', group_by_field: 'owner' })
    expect(viewDraft.type).toBe('kanban')
    expect(viewDraft.route_name).toBe('Leads')
  })

  it('treats kanban column edits as non-dirty but filter edits as dirty', () => {
    const base = { filters: { a: 1 }, order_by: 'modified desc' } as never
    expect(dirtySignature(base)).toBe(dirtySignature({ ...(base as object), kanban_columns: 'x' } as never))
    expect(dirtySignature(base)).not.toBe(dirtySignature({ ...(base as object), filters: { a: 2 } } as never))
  })

  it('derives quick filter values from list params', () => {
    const list = buildQuickFilterList(
      [
        { label: 'Name', fieldname: 'first_name', fieldtype: 'Data' },
        { label: 'Status', fieldname: 'status', fieldtype: 'Select' },
        { label: 'Qualified', fieldname: 'qualified', fieldtype: 'Check' },
      ],
      { first_name: ['LIKE', '%jo%'], status: 'Open', qualified: true },
    )
    expect(list.map((filter) => filter.value)).toEqual(['jo', 'Open', true])
  })

  it('resolves @me placeholders only when the user is known', () => {
    expect(resolveMePlaceholders({ owner: '@me', _assign: ['LIKE', '%@me%'] }, '7')).toEqual({
      owner: '7',
      _assign: ['LIKE', '%7%'],
    })
    expect(resolveMePlaceholders({ owner: '@me' }, undefined)).toEqual({ owner: '@me' })
  })

  it('builds the export url', () => {
    const url = buildExportUrl({
      doctype: 'CRM Lead',
      fileFormat: 'CSV',
      fields: ['name'],
      filters: {},
      orderBy: 'modified desc',
      pageLength: 20,
      selectedItems: ['L-1'],
    })
    expect(url.startsWith('/api/crm/doc/export/?')).toBe(true)
    expect(url).toContain('file_format_type=CSV')
    expect(url).toContain('selected_items=')
  })
})
