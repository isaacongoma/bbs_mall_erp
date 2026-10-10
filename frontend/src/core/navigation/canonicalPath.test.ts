import { beforeAll, describe, expect, it } from 'vitest'
import { canonicalPath, setRouteKnowledge, toInternal } from './canonicalPath'

beforeAll(() => {
  setRouteKnowledge({
    doctypes: ['Journal Entry', 'POS Invoice', 'Item', 'Sales Invoice'],
    shellOfDoctype: { 'Journal Entry': 'Accounts', 'Sales Invoice': 'Accounts' },
    shells: ['Accounts', 'Stock'],
  })
})

describe('canonicalPath', () => {
  it('rewrites legacy app paths to the desk scheme with the module segment', () => {
    expect(canonicalPath('/app/Sales%20Invoice/ACC-SINV-1')).toBe('/desk/accounts/sales-invoice/ACC-SINV-1')
  })

  it('gives new documents a stable generated name', () => {
    const first = canonicalPath('/app/Journal%20Entry/new')
    expect(first).toMatch(/^\/desk\/accounts\/journal-entry\/new-journal-entry-[a-z]{10}$/)
    expect(canonicalPath(first)).toBe(first)
  })

  it('leaves doctypes outside a module without a module segment', () => {
    expect(canonicalPath('/app/Item/ITEM-1')).toBe('/desk/item/ITEM-1')
  })

  it('keeps reserved routes and query strings', () => {
    expect(canonicalPath('/app/query-report/Trial%20Balance?company=X')).toBe('/desk/query-report/Trial%20Balance?company=X')
  })

  it('does not touch other paths', () => {
    expect(canonicalPath('/tenant/invoices')).toBe('/tenant/invoices')
  })
})

describe('toInternal', () => {
  it('maps the module segment and slugs back to doctype names', () => {
    expect(toInternal('/desk/accounts/journal-entry/new-journal-entry-abcdefghij')).toBe('/app/Journal%20Entry/new')
    expect(toInternal('/desk/pos-invoice/POS-1')).toBe('/app/POS%20Invoice/POS-1')
  })

  it('treats a single segment as a workspace or doctype list', () => {
    expect(toInternal('/desk/accounting')).toBe('/app/accounting')
    expect(toInternal('/desk')).toBe('/app')
  })
})
