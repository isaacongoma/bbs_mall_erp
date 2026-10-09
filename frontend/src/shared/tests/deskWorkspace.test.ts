import { describe, expect, it } from 'vitest'
import { findWorkspace, parseWorkspaceBlocks, workspaceItems, workspacePages } from '../utils/deskWorkspace'

describe('desk workspace helpers', () => {
  it('unwraps and filters workspace pages', () => {
    const pages = workspacePages({ message: { pages: [{ name: 'HR', title: 'Human Resources' }, null] } })
    expect(pages).toHaveLength(1)
    expect(findWorkspace(pages, 'human resources')?.name).toBe('HR')
  })

  it('parses layout blocks and item collections', () => {
    expect(parseWorkspaceBlocks('[{"type":"shortcut"}]')).toEqual([{ type: 'shortcut' }])
    expect(workspaceItems({ items: [{ label: 'Employee' }] })).toEqual([{ label: 'Employee' }])
  })
})
