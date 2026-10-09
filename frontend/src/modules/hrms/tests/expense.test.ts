import { describe, expect, it } from 'vitest'
import { calculateExpenseClaimTotals } from '../utils/expense'

describe('HRMS expense totals', () => {
  it('calculates claimed, taxes, advances, and grand total', () => {
    expect(
      calculateExpenseClaimTotals(
        [
          { amount: 100, sanctioned_amount: 90 },
          { amount: 50, sanctioned_amount: 40 },
        ],
        [{ tax_amount: 13.5 }],
        [
          { selected: true, allocated_amount: 20 },
          { selected: false, allocated_amount: 50 },
        ],
      ),
    ).toEqual({
      total_claimed_amount: 150,
      total_sanctioned_amount: 130,
      total_taxes_and_charges: 13.5,
      total_advance_amount: 20,
      grand_total: 123.5,
    })
  })
})
