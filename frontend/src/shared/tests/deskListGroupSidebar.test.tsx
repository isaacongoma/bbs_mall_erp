import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DeskListGroupSidebar } from '../components/DeskListGroupSidebar'

describe('DeskListGroupSidebar', () => {
  it('renders group counts and selects a group', () => {
    const onSelect = vi.fn()
    render(
      <DeskListGroupSidebar
        fieldLabel="Status"
        groups={[{ value: 'Open', count: 3 }, { value: 'Closed', count: 2 }]}
        selected=""
        onSelect={onSelect}
      />,
    )

    expect(screen.getByRole('button', { name: 'All5' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open3' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Open3' }))
    expect(onSelect).toHaveBeenCalledWith('Open')
  })

  it('clears a selected group', () => {
    const onSelect = vi.fn()
    render(
      <DeskListGroupSidebar
        fieldLabel="Status"
        groups={[{ value: 'Open', count: 3 }]}
        selected="Open"
        onSelect={onSelect}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'All3' }))
    expect(onSelect).toHaveBeenCalledWith('')
  })
})
