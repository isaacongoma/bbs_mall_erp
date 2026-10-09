export interface ExpenseTotals {
  total_claimed_amount: number
  total_sanctioned_amount: number
  total_taxes_and_charges: number
  total_advance_amount: number
  grand_total: number
}

function numberValue(value: unknown): number {
  const result = Number(value)
  return Number.isFinite(result) ? result : 0
}

export function calculateExpenseClaimTotals(
  expenses: Array<Record<string, unknown>>,
  taxes: Array<Record<string, unknown>>,
  advances: Array<Record<string, unknown>>,
): ExpenseTotals {
  const total_claimed_amount = expenses.reduce((total, row) => total + numberValue(row.amount), 0)
  const total_sanctioned_amount = expenses.reduce((total, row) => total + numberValue(row.sanctioned_amount), 0)
  const total_taxes_and_charges = taxes.reduce((total, row) => total + numberValue(row.tax_amount), 0)
  const total_advance_amount = advances.reduce(
    (total, row) => total + (row.selected === false ? 0 : numberValue(row.allocated_amount)),
    0,
  )
  return {
    total_claimed_amount,
    total_sanctioned_amount,
    total_taxes_and_charges,
    total_advance_amount,
    grand_total: total_sanctioned_amount + total_taxes_and_charges - total_advance_amount,
  }
}
