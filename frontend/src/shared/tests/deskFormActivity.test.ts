import { describe, expect, it } from 'vitest'
import { dashboardTransactions } from '../utils/dashboardTransactions'

describe('dashboardTransactions', () => {
  it('maps transaction groups to deduplicated create targets', () => {
    const transactions = dashboardTransactions(
      {
        __dashboard: {
          fieldname: 'customer',
          non_standard_fieldnames: { 'Payment Entry': 'party' },
          transactions: [
            { label: 'Orders', items: ['Sales Order', 'Payment Entry'] },
            { label: 'Other', items: ['Sales Order'] },
          ],
        },
      },
    )

    expect(transactions).toEqual([
      { label: 'Orders', doctype: 'Sales Order', fieldname: 'customer' },
      { label: 'Orders', doctype: 'Payment Entry', fieldname: 'party' },
    ])
  })

  it('infers related creation targets from link fields when dashboard metadata is absent', () => {
    expect(dashboardTransactions({ name: 'Employee', fields: [{ fieldtype: 'Link', options: 'Department' }] })).toEqual([
      { label: 'Related', doctype: 'Department', fieldname: 'department' },
    ])
  })
})
