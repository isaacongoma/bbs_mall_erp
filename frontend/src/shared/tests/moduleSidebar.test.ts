import { describe, expect, it } from 'vitest'
import { nestSidebarItems, sidebarRoute, type SidebarItemData } from '../utils/moduleSidebar'

function item(extra: Partial<SidebarItemData>): SidebarItemData {
  return { key: extra.label ?? 'k', label: 'x', type: 'Link', ...extra }
}

describe('module sidebar tree', () => {
  it('nests children under their section break and drops empty sections', () => {
    const tree = nestSidebarItems([
      item({ label: 'Home' }),
      item({ label: 'Setup', type: 'Section Break' }),
      item({ label: 'Supplier', child: 1 }),
      item({ label: 'Empty', type: 'Section Break' }),
      item({ label: 'Settings' }),
    ])
    expect(tree.map((entry) => entry.label)).toEqual(['Home', 'Setup', 'Settings'])
    expect(tree[1]!.nested_items!.map((entry) => entry.label)).toEqual(['Supplier'])
  })

  it('resolves routes by link type', () => {
    expect(sidebarRoute(item({ link_type: 'DocType', link_to: 'Item' }))).toBe('/app/Item')
    expect(sidebarRoute(item({ link_type: 'Workspace', link_to: 'Buying' }))).toBe('/app/Buying')
    expect(sidebarRoute(item({ link_type: 'Dashboard', link_to: 'Asset' }))).toBe('/app/dashboard-view/Asset')
    expect(
      sidebarRoute(
        item({
          link_type: 'Report',
          link_to: 'Gross Profit',
          report: { report_type: 'Script Report', ref_doctype: 'Sales Invoice' },
        }),
      ),
    ).toBe('/app/query-report/Gross%20Profit')
    expect(
      sidebarRoute(
        item({
          link_type: 'Report',
          link_to: 'Item Prices',
          report: { report_type: 'Report Builder', ref_doctype: 'Item Price' },
        }),
      ),
    ).toBe('/app/Item%20Price/view/report/Item%20Prices')
    expect(sidebarRoute(item({ link_type: 'Report', link_to: 'Missing' }))).toBeUndefined()
    expect(
      sidebarRoute(item({ link_type: 'DocType', link_to: 'Task', filters: '[["Task","status","=","Open"]]' })),
    ).toBe('/app/Task?status=Open')
  })
})
