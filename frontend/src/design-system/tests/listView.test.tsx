import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef, useState } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import {
  ListFooter,
  ListHeader,
  ListHeaderItem,
  ListRow,
  ListRowItem,
  ListRows,
  ListView,
  type ListViewHandle,
} from '../components/ListView'
import type { ListColumn, ListRowData } from '../types/listView'
import { getGridTemplateColumns } from '../utils/listView'

const columns: ListColumn[] = [
  { key: 'name', label: 'Name', width: 2 },
  { key: 'status', label: 'Status', width: '120px', align: 'right' },
]

const rows: ListRowData[] = [
  { name: 'a', status: 'Open' },
  { name: 'b', status: 'Closed' },
  { name: 'c', status: 'Open' },
  { name: 'd', status: 'Hold', disabled: true },
]

function renderList(props: Partial<React.ComponentProps<typeof ListView>> = {}) {
  return render(
    <MemoryRouter>
      <ListView columns={columns} rows={rows} rowKey="name" {...props} />
    </MemoryRouter>,
  )
}

describe('list helpers', () => {
  it('builds grid templates for numeric and string widths with an optional checkbox column', () => {
    expect(getGridTemplateColumns(columns, true)).toBe('14px 2fr 120px')
    expect(getGridTemplateColumns(columns, false)).toBe('2fr 120px')
    expect(getGridTemplateColumns([{ key: 'x' }], false)).toBe('1fr')
  })
})

describe('ListView', () => {
  it('renders a header, rows and cell values', () => {
    renderList()
    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Status')).toBeInTheDocument()
    expect(screen.getAllByText('Open')).toHaveLength(2)
    expect(screen.getByText('Closed')).toBeInTheDocument()
  })

  it('shows the empty state with a title, description and button', () => {
    renderList({
      rows: [],
      options: { emptyState: { title: 'Nothing yet', description: 'Create a record', button: { label: 'Create' } } },
    })
    expect(screen.getByText('Nothing yet')).toBeInTheDocument()
    expect(screen.getByText('Create a record')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument()
  })

  it('selects rows with checkboxes and shows the selection banner', async () => {
    const onSelectionsChange = vi.fn()
    renderList({ onSelectionsChange })
    const boxes = screen.getAllByRole('checkbox')
    await userEvent.click(boxes[1] as HTMLElement)
    expect(onSelectionsChange).toHaveBeenLastCalledWith(new Set(['a']))
    expect(await screen.findByText('1 row selected')).toBeInTheDocument()
    await userEvent.click(boxes[2] as HTMLElement)
    expect(await screen.findByText('2 rows selected')).toBeInTheDocument()
  })

  it('selects a range with shift click and skips disabled rows', async () => {
    const onSelectionsChange = vi.fn()
    renderList({ onSelectionsChange })
    const user = userEvent.setup()
    const boxes = screen.getAllByRole('checkbox')
    await user.click(boxes[1] as HTMLElement)
    await user.keyboard('{Shift>}')
    await user.click(boxes[3] as HTMLElement)
    await user.keyboard('{/Shift}')
    const last = onSelectionsChange.mock.calls[onSelectionsChange.mock.calls.length - 1]?.[0] as Set<string>
    expect([...last].sort()).toEqual(['a', 'b', 'c'])
    expect(boxes[4]).toBeDisabled()
  })

  it('toggles all enabled rows from the header and clears from the banner', async () => {
    const handle = createRef<ListViewHandle>()
    renderList({ handleRef: handle })
    await userEvent.click(screen.getAllByRole('checkbox')[0] as HTMLElement)
    expect(await screen.findByText('3 rows selected')).toBeInTheDocument()
    expect(handle.current?.allRowsSelected).toBe(true)
    await userEvent.click(screen.getByRole('button', { name: 'Select all' }))
    expect(screen.getByText('3 rows selected')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Clear selection' }))
    await waitFor(() => expect(screen.queryByText('3 rows selected')).toBeNull())
  })

  it('hides checkboxes when not selectable', () => {
    renderList({ options: { selectable: false } })
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
  })

  it('supports custom selection text and banner actions', async () => {
    render(
      <MemoryRouter>
        <ListView columns={columns} rows={rows} rowKey="name" options={{ selectionText: (count) => `${count} picked` }}>
          <ListHeader />
          <ListRows />
        </ListView>
      </MemoryRouter>,
    )
    await userEvent.click(screen.getAllByRole('checkbox')[1] as HTMLElement)
    expect(screen.queryByText('1 picked')).toBeNull()
  })

  it('calls onRowClick and tracks the active row', async () => {
    const onRowClick = vi.fn()
    const onActiveRowChange = vi.fn()
    renderList({ options: { onRowClick, enableActive: true }, onActiveRowChange })
    await userEvent.click(screen.getByText('Closed'))
    expect(onRowClick).toHaveBeenCalledWith(expect.objectContaining({ name: 'b' }), expect.anything())
    expect(onActiveRowChange).toHaveBeenCalledWith('b')
    await userEvent.click(screen.getByText('Closed'))
    expect(onActiveRowChange).toHaveBeenLastCalledWith(null)
  })

  it('renders router links for rows and external anchors for http routes', () => {
    renderList({
      options: { getRowRoute: (row) => (row.name === 'a' ? 'https://example.com/a' : `/rows/${row.name}`) },
    })
    const links = screen.getAllByRole('link')
    expect(links[0]).toHaveAttribute('href', 'https://example.com/a')
    expect(links[1]).toHaveAttribute('href', '/rows/b')
    expect(links).toHaveLength(3)
  })

  it('applies row height and uses a custom cell renderer', () => {
    renderList({ options: { rowHeight: 56 }, cell: ({ item }) => <b>{`cell:${String(item)}`}</b> })
    expect(screen.getAllByText(/cell:/).length).toBe(8)
    const grid = screen.getAllByText('cell:a')[0]?.closest('div[style]') as HTMLElement
    expect(grid.style.height).toBe('56px')
  })

  it('renders a ListRow child function with column context', () => {
    render(
      <MemoryRouter>
        <ListView columns={columns} rows={rows} rowKey="name">
          <ListHeader>
            {columns.map((column) => (
              <ListHeaderItem key={column.key} item={column} />
            ))}
          </ListHeader>
          <ListRows>
            {rows.map((row) => (
              <ListRow key={row.name} row={row}>
                {({ idx, column, item }) => <span>{`${idx}:${column.key}:${String(item)}`}</span>}
              </ListRow>
            ))}
          </ListRows>
        </ListView>
      </MemoryRouter>,
    )
    expect(screen.getByText('0:name:a')).toBeInTheDocument()
    expect(screen.getByText('1:status:Closed')).toBeInTheDocument()
  })

  it('shows tooltips from the column definition', async () => {
    const getTooltip = vi.fn(() => 'Full status text')
    renderList({
      columns: [
        { key: 'name', label: 'Name' },
        { key: 'status', label: 'Status', getTooltip },
      ],
    })
    await userEvent.hover(screen.getAllByText('Open')[0] as HTMLElement)
    await waitFor(() => expect(getTooltip).toHaveBeenCalled())
  })

  it('renders groups, collapses and expands them', async () => {
    const grouped = [
      { group: 'Open', rows: [{ name: 'a' }, { name: 'c' }] },
      { group: 'Closed', rows: [{ name: 'b' }] },
    ]
    renderList({
      rows: grouped as ListRowData[],
      groupHeader: ({ group }) => <strong>{`Group ${group.group}`}</strong>,
    })
    expect(screen.getByText('Group Open')).toBeInTheDocument()
    expect(screen.getAllByRole('checkbox')).toHaveLength(4)
    const toggles = screen.getAllByRole('button', { name: /Collapse group/ })
    await userEvent.click(toggles[0] as HTMLElement)
    expect(screen.getAllByRole('checkbox')).toHaveLength(2)
    await userEvent.click(screen.getByRole('button', { name: 'Expand group' }))
    expect(screen.getAllByRole('checkbox')).toHaveLength(4)
  })

  it('selects every row across groups', async () => {
    const grouped = [
      { group: 'One', rows: [{ name: 'a' }, { name: 'b' }] },
      { group: 'Two', rows: [{ name: 'c' }] },
    ]
    renderList({ rows: grouped as ListRowData[] })
    await userEvent.click(screen.getAllByRole('checkbox')[0] as HTMLElement)
    expect(await screen.findByText('3 rows selected')).toBeInTheDocument()
  })

  it('reports column width changes while resizing, then saves after the debounce', () => {
    vi.useFakeTimers()
    const onUpdate = vi.fn()
    render(
      <MemoryRouter>
        <ListView columns={columns} rows={rows} rowKey="name" options={{ resizeColumn: true }}>
          <ListHeader onColumnWidthUpdated={onUpdate} />
        </ListView>
      </MemoryRouter>,
    )
    const handle = document.querySelector('.cursor-col-resize') as HTMLElement
    fireEvent.mouseDown(handle, { clientX: 100 })
    fireEvent.mouseMove(window, { clientX: 160 })
    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ key: 'name', save: false }))
    vi.advanceTimersByTime(1100)
    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ key: 'name', save: true }))
    fireEvent.mouseUp(window)
    vi.useRealTimers()
  })

  it('keeps controlled selections in sync', async () => {
    function Harness() {
      const [selections, setSelections] = useState<Set<string | number>>(new Set(['b']))
      return (
        <MemoryRouter>
          <ListView
            columns={columns}
            rows={rows}
            rowKey="name"
            selections={selections}
            onSelectionsChange={setSelections}
          />
        </MemoryRouter>
      )
    }
    render(<Harness />)
    expect(screen.getByText('1 row selected')).toBeInTheDocument()
    expect(within(screen.getByText('Closed').closest('div[style]') as HTMLElement).getByRole('checkbox')).toBeChecked()
  })
})

describe('ListFooter', () => {
  it('shows counts, load more, and page length tabs', async () => {
    const onChange = vi.fn()
    const onLoadMore = vi.fn()
    render(
      <MemoryRouter>
        <ListFooter value={20} onChange={onChange} onLoadMore={onLoadMore} options={{ rowCount: 20, totalCount: 85 }} />
      </MemoryRouter>,
    )
    expect(screen.getByText('85')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Load More' }))
    expect(onLoadMore).toHaveBeenCalled()
    await userEvent.click(screen.getByRole('radio', { name: '50' }))
    expect(onChange).toHaveBeenCalledWith(50)
  })

  it('hides load more when everything is loaded', () => {
    render(
      <MemoryRouter>
        <ListFooter options={{ rowCount: 5, totalCount: 5 }} />
      </MemoryRouter>,
    )
    expect(screen.queryByRole('button', { name: 'Load More' })).toBeNull()
  })
})

describe('ListRowItem', () => {
  it('renders prefix, suffix and falls back to object labels', () => {
    render(
      <MemoryRouter>
        <ListView columns={columns} rows={rows} rowKey="name">
          <ListRowItem
            item={{ label: 'Object label' }}
            prefix={<i data-testid="pre" />}
            suffix={<i data-testid="suf" />}
          />
        </ListView>
      </MemoryRouter>,
    )
    expect(screen.getByText('Object label')).toBeInTheDocument()
    expect(screen.getByTestId('pre')).toBeInTheDocument()
    expect(screen.getByTestId('suf')).toBeInTheDocument()
  })
})
