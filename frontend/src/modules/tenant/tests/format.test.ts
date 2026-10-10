import { describe, expect, it } from 'vitest'
import { firstName, formatMoney, invoiceState, statusTheme } from '../utils/format'

describe('tenant formatting', () => {
  it('formats shillings', () => {
    expect(formatMoney(1234.5)).toBe('KSh 1,234.50')
    expect(formatMoney(null)).toBe('KSh 0.00')
  })

  it('names the invoice state', () => {
    const base = { due_date: '2020-01-01', status: 'Unpaid', grand_total: 100 }
    expect(invoiceState({ ...base, outstanding_amount: 0 })).toBe('Paid')
    expect(invoiceState({ ...base, outstanding_amount: 100 })).toBe('Overdue')
    expect(invoiceState({ ...base, due_date: '2999-01-01', outstanding_amount: 40 })).toBe('Partly Paid')
    expect(invoiceState({ ...base, due_date: '2999-01-01', outstanding_amount: 100 })).toBe('Unpaid')
  })

  it('maps statuses to badge themes', () => {
    expect(statusTheme('Paid')).toBe('green')
    expect(statusTheme('Overdue')).toBe('red')
    expect(statusTheme('Something else')).toBe('gray')
  })

  it('takes the first name', () => {
    expect(firstName('Jane Wanjiku Doe')).toBe('Jane')
    expect(firstName(undefined)).toBe('')
  })
})
