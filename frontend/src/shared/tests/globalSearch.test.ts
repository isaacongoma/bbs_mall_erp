import { describe, expect, it } from 'vitest'
import { addRecentSearch, readRecentSearches, searchResultPath } from '../utils/globalSearch'

describe('global search helpers', () => {
  it('preserves the doctype and scope for recent records', () => {
    const recent = addRecentSearch([], { value: 'EMP-001', label: 'Employee 001' }, 'records', 'Employee')
    expect(searchResultPath(recent[0]!)).toBe('/app/Employee/EMP-001')
    expect(searchResultPath({ value: 'General Ledger', scope: 'reports' })).toBe('/app/query-report/General%20Ledger')
  })

  it('reads legacy recent entries as record searches', () => {
    const storage = { getItem: () => JSON.stringify([{ value: 'EMP-001' }]) } as unknown as Storage
    expect(readRecentSearches(storage)).toEqual([{ value: 'EMP-001', scope: 'records' }])
  })
})
