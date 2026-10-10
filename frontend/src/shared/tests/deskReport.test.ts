import { describe, expect, it, vi } from 'vitest'
import { downloadCsv } from '../utils/csv'

vi.mock('@/core/api/rpc', () => ({ rpc: vi.fn() }))

describe('Desk report export', () => {
  it('exports report rows using the report columns', () => {
    const anchor = document.createElement('a')
    const click = vi.fn()
    anchor.click = click
    vi.spyOn(document, 'createElement').mockReturnValue(anchor)
    vi.spyOn(document.body, 'appendChild')
    vi.spyOn(document.body, 'removeChild')
    downloadCsv(
      'Employee.csv',
      [{ name: 'EMP-0001', status: 'Active' }],
      [
        { key: 'name', label: 'Name' },
        { key: 'status', label: 'Status' },
      ],
    )
    expect(click).toHaveBeenCalled()
  })
})
