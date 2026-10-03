import { act, render, renderHook, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  CircularProgressBar,
  Duration,
  FileUploader,
  HoverCard,
  IconPicker,
  MultiSelect,
  Rating,
  ScrollArea,
  Sidebar,
  SidebarCollapseToggle,
  SidebarHeader,
  SidebarItem,
  SidebarLabel,
  configureUpload,
  formatDuration,
  parseDuration,
  setMaxFileSize,
  useMediaQuery,
} from '..'

afterEach(() => {
  vi.unstubAllGlobals()
  setMaxFileSize(null)
})

describe('duration utilities', () => {
  it('formats presets with zero omission and pluralization', () => {
    expect(formatDuration(5445)).toBe('1h 30m 45s')
    expect(formatDuration(90)).toBe('1m 30s')
    expect(formatDuration(0)).toBe('0s')
    expect(formatDuration(5445, 'long')).toBe('1 hour 30 minutes 45 seconds')
    expect(formatDuration(3661, 'long')).toBe('1 hour 1 minute 1 second')
    expect(formatDuration(5445, 'colon')).toBe('1:30:45')
    expect(formatDuration(90, 'colon')).toBe('1:30')
    expect(formatDuration(null)).toBe('')
  })

  it('renders token templates literally', () => {
    expect(formatDuration(5445, "h'h' m'm' s's'")).toBe('1h 30m 45s')
    expect(formatDuration(90, "h'h' m'm' s's'")).toBe('0h 1m 30s')
    expect(formatDuration(7323, 'hh:mm:ss')).toBe('02:02:03')
  })

  it('parses units, colon notation and bare seconds', () => {
    expect(parseDuration('1h 30m 45s')).toBe(5445)
    expect(parseDuration('1 hour 30 minutes')).toBe(5400)
    expect(parseDuration('1:30:45')).toBe(5445)
    expect(parseDuration('1:30')).toBe(90)
    expect(parseDuration(':45')).toBe(45)
    expect(parseDuration('90')).toBe(90)
    expect(parseDuration('90s')).toBe(90)
  })

  it('rejects malformed or duplicated input', () => {
    expect(parseDuration('')).toBeNull()
    expect(parseDuration('abc')).toBeNull()
    expect(parseDuration('1h 2h')).toBeNull()
    expect(parseDuration('5 xyz')).toBeNull()
  })
})

describe('Duration', () => {
  function Harness({ initial = 5445 as number | null }) {
    const [value, setValue] = useState<number | null>(initial)
    return (
      <>
        <Duration value={value} onChange={setValue} />
        <output data-testid="seconds">{String(value)}</output>
      </>
    )
  }

  it('shows the formatted value and edits it in canonical notation', async () => {
    render(<Harness />)
    const input = screen.getByRole('textbox')
    expect(input).toHaveValue('1h 30m 45s')
    await userEvent.click(input)
    expect(input).toHaveValue('1h 30m 45s')
    await userEvent.clear(input)
    await userEvent.type(input, '2h')
    await userEvent.tab()
    expect(screen.getByTestId('seconds')).toHaveTextContent('7200')
    expect(input).toHaveValue('2h')
  })

  it('reports invalid input without changing the value', async () => {
    render(<Harness />)
    const input = screen.getByRole('textbox')
    await userEvent.click(input)
    await userEvent.clear(input)
    await userEvent.type(input, 'nonsense')
    await userEvent.tab()
    expect(await screen.findByText(/Invalid format/)).toBeInTheDocument()
    expect(screen.getByTestId('seconds')).toHaveTextContent('5445')
  })

  it('clears to null and cancels with Escape', async () => {
    render(<Harness />)
    const input = screen.getByRole('textbox')
    await userEvent.click(input)
    await userEvent.type(input, '{Escape}')
    expect(screen.getByTestId('seconds')).toHaveTextContent('5445')
    await userEvent.click(input)
    await userEvent.clear(input)
    await userEvent.tab()
    expect(screen.getByTestId('seconds')).toHaveTextContent('null')
  })
})

describe('Rating', () => {
  function Harness({ step = 1 as 1 | 0.5, initial = 0 }) {
    const [value, setValue] = useState(initial)
    return (
      <>
        <Rating value={value} onChange={setValue} step={step} label="Score" />
        <output data-testid="value">{value}</output>
      </>
    )
  }

  it('selects a star on click and clears when the same star is clicked again', async () => {
    render(<Harness />)
    await userEvent.click(screen.getByRole('radio', { name: '3 of 5' }))
    expect(screen.getByTestId('value')).toHaveTextContent('3')
    expect(screen.getByRole('radio', { name: '3 of 5' })).toHaveAttribute('aria-checked', 'true')
    await userEvent.click(screen.getByRole('radio', { name: '3 of 5' }))
    expect(screen.getByTestId('value')).toHaveTextContent('0')
  })

  it('moves selection with arrow keys, Home and End', async () => {
    render(<Harness initial={2} />)
    screen.getByRole('radio', { name: '2 of 5' }).focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(screen.getByTestId('value')).toHaveTextContent('3')
    await userEvent.keyboard('{End}')
    expect(screen.getByTestId('value')).toHaveTextContent('5')
    await userEvent.keyboard('{Home}')
    expect(screen.getByTestId('value')).toHaveTextContent('1')
    await userEvent.keyboard('0')
    expect(screen.getByTestId('value')).toHaveTextContent('0')
  })

  it('supports half steps through slider semantics', async () => {
    render(<Harness step={0.5} initial={2} />)
    const slider = screen.getByRole('slider')
    expect(slider).toHaveAttribute('aria-valuenow', '2')
    slider.focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(screen.getByTestId('value')).toHaveTextContent('2.5')
    expect(slider).toHaveAttribute('aria-valuetext', '2.5 of 5 stars')
  })

  it('ignores interaction when disabled', async () => {
    const onChange = vi.fn()
    render(<Rating value={1} onChange={onChange} disabled />)
    await userEvent.click(screen.getByRole('radio', { name: '4 of 5' }))
    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getByRole('radiogroup')).toHaveAttribute('aria-disabled', 'true')
  })
})

describe('CircularProgressBar', () => {
  it('shows the step and exposes progressbar semantics', () => {
    render(<CircularProgressBar step={2} totalSteps={4} />)
    const bar = screen.getByRole('progressbar')
    expect(bar).toHaveAttribute('aria-valuenow', '2')
    expect(bar).toHaveAttribute('aria-valuemax', '4')
    expect(bar).toHaveTextContent('2')
    expect(bar.style.getPropertyValue('--progress')).toBe('50%')
  })

  it('shows a percentage or a check on completion', () => {
    const { rerender } = render(<CircularProgressBar step={1} totalSteps={4} showPercentage />)
    expect(screen.getByRole('progressbar')).toHaveTextContent('25%')
    rerender(<CircularProgressBar step={4} totalSteps={4} />)
    const bar = screen.getByRole('progressbar')
    expect(bar.className).toContain('completed')
    expect(bar.querySelector('svg')).not.toBeNull()
  })

  it('accepts custom colours and sizes', () => {
    render(<CircularProgressBar step={1} totalSteps={2} theme={{ primary: '#111', secondary: '#eee' }} size="xl" />)
    const bar = screen.getByRole('progressbar')
    expect(bar.style.getPropertyValue('--color-progress')).toBe('#111')
    expect(bar.style.getPropertyValue('--size')).toBe('108px')
  })
})

describe('MultiSelect', () => {
  const options = [
    { label: 'Alpha', value: 'a' },
    { label: 'Bravo', value: 'b' },
    { label: 'Charlie', value: 'c', disabled: true },
  ]

  function Harness({ initial = [] as string[] }) {
    const [value, setValue] = useState<Array<string | number>>(initial)
    return (
      <>
        <MultiSelect value={value} onChange={setValue} options={options} placeholder="Pick" label="Letters" />
        <output data-testid="value">{value.join(',')}</output>
      </>
    )
  }

  it('summarises the selection and toggles options', async () => {
    render(<Harness />)
    const trigger = screen.getByLabelText('Letters')
    await userEvent.click(trigger)
    await userEvent.click(await screen.findByText('Alpha'))
    expect(screen.getByTestId('value')).toHaveTextContent('a')
    await userEvent.click(screen.getByText('Bravo'))
    expect(screen.getByTestId('value')).toHaveTextContent('a,b')
    expect(screen.getByLabelText('Letters')).toHaveTextContent('2 selected')
    await userEvent.click(screen.getByText('Alpha'))
    expect(screen.getByTestId('value')).toHaveTextContent('b')
    expect(screen.getByLabelText('Letters')).toHaveTextContent('Bravo')
  })

  it('filters by the search query and shows an empty state', async () => {
    render(<Harness />)
    await userEvent.click(screen.getByLabelText('Letters'))
    const search = await screen.findByPlaceholderText('Pick')
    await userEvent.type(search, 'bra')
    expect(screen.queryByText('Alpha')).toBeNull()
    expect(screen.getByText('Bravo')).toBeInTheDocument()
    await userEvent.clear(search)
    await userEvent.type(search, 'zzz')
    expect(await screen.findByText('No results')).toBeInTheDocument()
  })

  it('selects all enabled options and clears them from the footer', async () => {
    render(<Harness />)
    await userEvent.click(screen.getByLabelText('Letters'))
    await userEvent.click(await screen.findByRole('button', { name: 'Select All' }))
    expect(screen.getByTestId('value')).toHaveTextContent('a,b')
    await userEvent.click(await screen.findByRole('button', { name: 'Clear All' }))
    expect(screen.getByTestId('value')).toBeEmptyDOMElement()
  })

  it('does not toggle disabled options', async () => {
    render(<Harness />)
    await userEvent.click(screen.getByLabelText('Letters'))
    await userEvent.click(await screen.findByText('Charlie'))
    expect(screen.getByTestId('value')).toBeEmptyDOMElement()
  })
})

describe('FileUploader', () => {
  function stubXhr(response: { status: number; body: unknown }) {
    const sent: FormData[] = []
    class Xhr {
      static DONE = 4
      readyState = 0
      status = 0
      responseText = ''
      upload = { addEventListener: vi.fn() }
      onreadystatechange: (() => void) | null = null
      addEventListener = vi.fn()
      open() {}
      setRequestHeader() {}
      send(form: FormData) {
        sent.push(form)
        this.readyState = 4
        this.status = response.status
        this.responseText = JSON.stringify(response.body)
        this.onreadystatechange?.()
      }
    }
    vi.stubGlobal('XMLHttpRequest', Xhr)
    configureUpload({ endpoint: '/api/method/upload_file', getHeaders: () => ({}) })
    return sent
  }

  it('uploads private by default and reports success', async () => {
    const sent = stubXhr({ status: 200, body: { message: { file_url: '/files/a.txt' } } })
    const onSuccess = vi.fn()
    const { container } = render(<FileUploader onSuccess={onSuccess} />)
    const input = container.querySelector('input[type=file]') as HTMLInputElement
    await userEvent.upload(input, new File(['hi'], 'a.txt', { type: 'text/plain' }))
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(expect.objectContaining({ file_url: '/files/a.txt' })))
    expect(sent[0]?.get('is_private')).toBe('1')
  })

  it('lets uploadArgs override privacy', async () => {
    const sent = stubXhr({ status: 200, body: { message: { file_url: '/files/a.txt' } } })
    const { container } = render(<FileUploader uploadArgs={{ private: false }} />)
    await userEvent.upload(container.querySelector('input[type=file]') as HTMLInputElement, new File(['hi'], 'a.txt'))
    await waitFor(() => expect(sent).toHaveLength(1))
    expect(sent[0]?.get('is_private')).toBe('0')
  })

  it('blocks the upload when validation fails and exposes the error to the slot', async () => {
    const sent = stubXhr({ status: 200, body: {} })
    const { container } = render(
      <FileUploader validateFile={() => 'Only PDFs are allowed'}>
        {({ error, openFileSelector }) => (
          <>
            <button onClick={openFileSelector}>Upload</button>
            {error ? <p data-testid="error">{String(error)}</p> : null}
          </>
        )}
      </FileUploader>,
    )
    await userEvent.upload(container.querySelector('input[type=file]') as HTMLInputElement, new File(['hi'], 'a.txt'))
    expect(await screen.findByTestId('error')).toHaveTextContent('Only PDFs are allowed')
    expect(sent).toHaveLength(0)
  })

  it('reports failures from the server', async () => {
    stubXhr({ status: 417, body: { message: 'Quota exceeded' } })
    const onFailure = vi.fn()
    const { container } = render(
      <FileUploader onFailure={onFailure}>
        {({ error }) => <span data-testid="error">{String(error ?? '')}</span>}
      </FileUploader>,
    )
    await userEvent.upload(container.querySelector('input[type=file]') as HTMLInputElement, new File(['hi'], 'a.txt'))
    await waitFor(() => expect(onFailure).toHaveBeenCalled())
    expect(screen.getByTestId('error')).toHaveTextContent('Quota exceeded')
  })

  it('maps a 413 response to the size limit message', async () => {
    stubXhr({ status: 413, body: {} })
    setMaxFileSize(2 * 1024 * 1024)
    const { container } = render(
      <FileUploader>{({ error }) => <span data-testid="error">{String(error ?? '')}</span>}</FileUploader>,
    )
    await userEvent.upload(container.querySelector('input[type=file]') as HTMLInputElement, new File(['hi'], 'a.txt'))
    await waitFor(() => expect(screen.getByTestId('error')).toHaveTextContent('maximum allowed size of 2 MB'))
  })

  it('accepts a file-type filter', () => {
    const { container } = render(<FileUploader fileTypes={['image/png', '.pdf']} />)
    expect(container.querySelector('input[type=file]')).toHaveAttribute('accept', 'image/png,.pdf')
  })
})

describe('Sidebar', () => {
  function Layout({ initialPath = '/leads' }: { initialPath?: string }) {
    return (
      <MemoryRouter initialEntries={[initialPath]}>
        <Sidebar>
          <SidebarHeader title="Acme CRM" subtitle="Sales" />
          <SidebarLabel>Views</SidebarLabel>
          <SidebarItem label="Leads" to="/leads" icon="lucide-users" />
          <SidebarItem label="Deals" to="/deals" icon="lucide-handshake" />
          <SidebarItem label="Settings" icon="lucide-settings" suffix="3" onClick={() => undefined} />
          <SidebarCollapseToggle />
        </Sidebar>
      </MemoryRouter>
    )
  }

  it('marks the item matching the current route as active', () => {
    render(<Layout initialPath="/deals" />)
    const items = Array.from(document.querySelectorAll('[data-slot="sidebar-item"]'))
    const states = items.map((item) => item.getAttribute('data-state'))
    expect(states.slice(0, 2)).toEqual(['inactive', 'active'])
    expect(screen.getByRole('link', { name: 'Deals' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Leads' })).not.toHaveAttribute('aria-current')
  })

  it('renders action items as buttons with a suffix and runs their handler', async () => {
    const onClick = vi.fn()
    render(
      <Sidebar>
        <SidebarItem label="Settings" suffix="3" onClick={onClick} />
      </Sidebar>,
    )
    expect(screen.getByText('3')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Settings' }))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('collapses and expands, hiding labels and exposing tooltips', async () => {
    render(<Layout />)
    const sidebar = document.querySelector('[data-slot="sidebar"]') as HTMLElement
    expect(sidebar).toHaveAttribute('data-state', 'expanded')
    expect(sidebar.style.width).toBe('15rem')
    await userEvent.click(screen.getByRole('button', { name: 'Collapse' }))
    expect(sidebar).toHaveAttribute('data-state', 'collapsed')
    expect(sidebar.style.width).toBe('3rem')
    expect(screen.getByRole('button', { name: 'Expand' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Expand' }))
    expect(sidebar).toHaveAttribute('data-state', 'expanded')
  })

  it('honours a controlled collapsed state and the disableCollapse pin', () => {
    const { rerender } = render(
      <Sidebar collapsed width="20rem" collapsedWidth="4rem">
        <SidebarItem label="Home" />
      </Sidebar>,
    )
    const sidebar = document.querySelector('[data-slot="sidebar"]') as HTMLElement
    expect(sidebar.style.width).toBe('4rem')
    rerender(
      <Sidebar collapsed disableCollapse width="20rem">
        <SidebarItem label="Home" />
      </Sidebar>,
    )
    expect(sidebar.style.width).toBe('20rem')
  })

  it('works outside a router with plain anchors', () => {
    render(
      <Sidebar>
        <SidebarItem label="Docs" to="/docs" />
      </Sidebar>,
    )
    expect(screen.getByRole('link', { name: 'Docs' })).toHaveAttribute('href', '/docs')
  })
})

describe('HoverCard', () => {
  it('opens on hover and shows its content', async () => {
    render(
      <HoverCard hoverDelay={0} trigger={<button>Profile</button>}>
        <div>Card body</div>
      </HoverCard>,
    )
    expect(screen.queryByText('Card body')).toBeNull()
    await userEvent.hover(screen.getByText('Profile'))
    expect(await screen.findByText('Card body')).toBeInTheDocument()
  })

  it('supports a controlled open state', async () => {
    const onOpenChange = vi.fn()
    render(
      <HoverCard open onOpenChange={onOpenChange} trigger={<button>Profile</button>}>
        <div>Pinned</div>
      </HoverCard>,
    )
    expect(await screen.findByText('Pinned')).toBeInTheDocument()
  })
})

describe('IconPicker', () => {
  it('filters icons by search term and selects one', async () => {
    const onChange = vi.fn()
    render(<IconPicker value={null} onChange={onChange} />)
    const input = screen.getByPlaceholderText('Select an icon...')
    await userEvent.click(input)
    await userEvent.type(input, 'arrow big up')
    const choice = await screen.findByTitle('Arrow Big Up')
    await userEvent.click(choice)
    expect(onChange).toHaveBeenCalledWith('arrow-big-up')
  })

  it('shows a humanised label for the current value and clears on empty input', async () => {
    const onChange = vi.fn()
    render(<IconPicker value="arrow-big-up" onChange={onChange} />)
    const input = screen.getByDisplayValue('Arrow Big Up')
    await userEvent.clear(input)
    expect(onChange).toHaveBeenCalledWith(null)
  })

  it('reports when nothing matches', async () => {
    render(<IconPicker value={null} />)
    await userEvent.type(screen.getByPlaceholderText('Select an icon...'), 'qqqqqqqqq')
    expect(await screen.findByText(/No icons found/)).toBeInTheDocument()
  })
})

describe('ScrollArea', () => {
  it('renders content and exposes the viewport element', () => {
    let viewport: HTMLDivElement | null = null
    render(
      <ScrollArea handleRef={(handle) => void (viewport = handle?.viewportElement ?? null)} className="h-20">
        <p>Scrollable</p>
      </ScrollArea>,
    )
    expect(screen.getByText('Scrollable')).toBeInTheDocument()
    expect(viewport).not.toBeNull()
  })
})

describe('useMediaQuery', () => {
  it('tracks matchMedia changes', () => {
    let listener: (() => void) | null = null
    let matches = false
    vi.stubGlobal('matchMedia', () => ({
      get matches() {
        return matches
      },
      addEventListener: (_event: string, handler: () => void) => {
        listener = handler
      },
      removeEventListener: () => {
        listener = null
      },
    }))
    const { result } = renderHook(() => useMediaQuery('(max-width: 639px)'))
    expect(result.current).toBe(false)
    matches = true
    act(() => listener?.())
    expect(result.current).toBe(true)
  })
})
