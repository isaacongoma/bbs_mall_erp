import { describe, expect, it } from 'vitest'
import { buildHierarchy } from '../utils/organizationalChart'

describe('organizational chart', () => {
  it('builds roots and child relationships from upstream hierarchy groups', () => {
    const result = buildHierarchy([
      { parent: '', data: [{ id: 'EMP-1', name: 'Chief' }] },
      { parent: 'EMP-1', data: [{ id: 'EMP-2', name: 'Manager', reports_to: 'EMP-1' }] },
      { parent: 'EMP-2', data: [{ id: 'EMP-3', name: 'Staff', reports_to: 'EMP-2' }] },
    ])
    expect(result.roots.map((node) => node.id)).toEqual(['EMP-1'])
    expect(result.children.get('EMP-1')?.[0]?.id).toBe('EMP-2')
    expect(result.children.get('EMP-2')?.[0]?.id).toBe('EMP-3')
  })
})
