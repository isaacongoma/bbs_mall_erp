import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { createResource } from '@/core/resources'
import { registerRoutes } from '@/core/navigation'
import type { ListBulkActions } from '../hooks/useListBulkActions'
import { DocListView } from '../components/ListViews'
import { genericListConfig } from '../components/ListViews/genericListConfig'

vi.mock('../hooks/useVisitedRecords', () => ({
  useVisitedRecords: () => ({ isVisited: (seen?: unknown) => Boolean(seen), markVisited: () => undefined }),
}))

registerRoutes([{ name: 'CRM Lead', path: '/leads/:id' }])

const bulk: ListBulkActions = {
  bulkActions: () => [{ label: 'Delete', onClick: () => undefined }],
  customListActions: [],
  modals: <></>,
}

const columns = [
  { key: 'title', label: 'Title', width: '12rem' },
  { key: 'modified', label: 'Last Modified', width: '8rem' },
  { key: 'qualified', label: 'Qualified', type: 'Check', width: '6rem' },
]

const rows = [
  {
    name: 'L-1',
    title: { label: 'First lead' },
    modified: { label: 'Mon, 1 Jan', timeAgo: '2 hours ago' },
    qualified: 1,
    _seen: '["a"]',
  },
  {
    name: 'L-2',
    title: { label: 'Second lead' },
    modified: { label: 'Tue, 2 Jan', timeAgo: '1 hour ago' },
    qualified: 0,
  },
]

function renderList(extra: Partial<React.ComponentProps<typeof DocListView>> = {}) {
  const list = createResource({ url: 'crm.api.doc.get_data' }, { defer: true })
  list.setData({ columns })
  return render(
    <MemoryRouter>
      <DocListView
        config={genericListConfig('CRM Lead')}
        rows={rows}
        columns={columns}
        list={list}
        bulk={bulk}
        {...extra}
      />
    </MemoryRouter>,
  )
}

describe('DocListView', () => {
  it('renders header labels and cells with time-ago and links', () => {
    renderList()
    expect(screen.getByText('Title')).toBeInTheDocument()
    expect(screen.getByText('2 hours ago')).toBeInTheDocument()
    expect(screen.getByText('First lead').closest('a')?.getAttribute('href')).toBe('/leads/L-1')
  })

  it('marks unseen rows as bold and seen rows as muted', () => {
    renderList()
    expect(screen.getByText('First lead')).toHaveClass('text-ink-gray-6')
    expect(screen.getByText('Second lead')).toHaveClass('font-medium')
  })

  it('shows the selection banner with bulk actions after selecting a row', async () => {
    renderList()
    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[1]!)
    expect(await screen.findByText(/1 row selected/i)).toBeInTheDocument()
  })

  it('reports filter clicks on cell values', () => {
    const onApplyFilter = vi.fn()
    renderList({ onApplyFilter })
    fireEvent.click(screen.getByText('Second lead'))
    expect(onApplyFilter).toHaveBeenCalledTimes(1)
    expect(onApplyFilter.mock.calls[0]![0].column.key).toBe('title')
  })
})
