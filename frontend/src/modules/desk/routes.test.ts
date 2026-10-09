import { beforeAll, describe, expect, it } from 'vitest'
import { matchLocation } from '@/core/navigation'
import { registerRoutes } from '@/core/navigation/routeTable'
import { deskRoutes } from './routes'

beforeAll(() => {
  registerRoutes(deskRoutes.map(({ name, path, aliases, meta }) => ({ name, path, aliases, meta })))
})

describe('desk routes', () => {
  it('resolves a generic list route', () => {
    expect(matchLocation('/app/Employee')).toMatchObject({ name: 'Desk List', params: { doctype: 'Employee' } })
  })

  it('resolves the shared notification inbox before the doctype alias', () => {
    expect(matchLocation('/app/notifications')).toMatchObject({ name: 'Desk Notifications' })
  })

  it('resolves query reports', () => {
    expect(matchLocation('/app/query-report/General%20Ledger')).toMatchObject({ name: 'Desk Report' })
  })

  it('resolves dashboard views', () => {
    expect(matchLocation('/app/dashboard-view/HR')).toMatchObject({ name: 'Desk Dashboard View', params: { name: 'HR' } })
  })

  it('resolves generic data import routes before doctype aliases', () => {
    expect(matchLocation('/app/data-import')).toMatchObject({ name: 'Desk Data Import List' })
    expect(matchLocation('/app/data-import/doctype/Employee')).toMatchObject({
      name: 'Desk New Data Import',
      params: { doctype: 'Employee' },
    })
    expect(matchLocation('/app/data-import/IMPORT-1')).toMatchObject({
      name: 'Desk Data Import',
      params: { importName: 'IMPORT-1' },
    })
  })

  it('resolves new and existing generic documents', () => {
    expect(matchLocation('/app/Leave%20Application/new')).toMatchObject({ name: 'Desk New Document' })
    expect(matchLocation('/app/Sales%20Invoice/SINV-1')).toMatchObject({
      name: 'Desk Document',
      params: { doctype: 'Sales%20Invoice', name: 'SINV-1' },
    })
  })

  it('resolves the optional list view type', () => {
    expect(matchLocation('/app/Sales%20Invoice/view/kanban')).toMatchObject({
      name: 'Desk List',
      params: { doctype: 'Sales%20Invoice', viewType: 'kanban' },
    })
    expect(matchLocation('/app/Employee/view/calendar')).toMatchObject({
      name: 'Desk List',
      params: { doctype: 'Employee', viewType: 'calendar' },
    })
  })
})
