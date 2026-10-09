import { describe, expect, it } from 'vitest'
import { hrmsNavigation } from '../navigation'

describe('HR manager navigation', () => {
  it('uses generic Desk routes for manager doctypes', () => {
    const payroll = hrmsNavigation.find((item) => item.id === 'HRMS Payroll Entries')
    const recruitment = hrmsNavigation.find((item) => item.id === 'HRMS Recruitment Openings')
    expect(payroll?.to).toMatchObject({ name: 'Desk List', params: { doctype: 'Payroll Entry' } })
    expect(recruitment?.to).toMatchObject({ name: 'Desk List', params: { doctype: 'Job Opening' } })
  })

  it('exposes setup and performance sections in the same navigation', () => {
    expect(hrmsNavigation.some((item) => item.section === 'HR Setup')).toBe(true)
    expect(hrmsNavigation.some((item) => item.section === 'Performance')).toBe(true)
  })
})
