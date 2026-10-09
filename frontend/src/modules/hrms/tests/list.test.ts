import { describe, expect, it } from 'vitest'
import { filterHrmsDocuments } from '../utils/list'

describe('HRMS list filtering', () => {
  it('combines search and select filters', () => {
    const documents = [
      { name: 'EC-1', purpose: 'Travel', status: 'Draft' },
      { name: 'EC-2', purpose: 'Supplies', status: 'Approved' },
    ]
    expect(filterHrmsDocuments(documents, ['name', 'purpose'], 'travel', { status: 'Draft' })).toHaveLength(1)
    expect(filterHrmsDocuments(documents, ['name', 'purpose'], '', { status: 'Rejected' })).toHaveLength(0)
  })
})
