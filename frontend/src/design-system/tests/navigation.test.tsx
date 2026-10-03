import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Breadcrumbs } from '../components/Breadcrumbs'
import { confirmDialog, createDialog, Dialog, Dialogs, useDialogStore } from '../components/Dialog'
import { TabButtons, type TabButtonValue } from '../components/TabButtons'
import { Tabs } from '../components/Tabs'
import { toast, ToastProvider } from '../components/Toast'

afterEach(() => {
  act(() => {
    useDialogStore.setState({ dialogs: [] })
  })
})

describe('Dialog', () => {
  it('renders title, message and closes through the header button', async () => {
    const onOpenChange = vi.fn()
    render(<Dialog open title="Delete lead" message="This cannot be undone" onOpenChange={onOpenChange} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Delete lead')).toBeInTheDocument()
    expect(screen.getByText('This cannot be undone')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('renders actions and shows loading while an async action runs', async () => {
    let release: () => void = () => undefined
    const onClick = vi.fn(() => new Promise<void>((resolve) => (release = resolve)))
    render(<Dialog open title="Save" actions={[{ label: 'Confirm', variant: 'solid', onClick }]} />)
    const button = screen.getByRole('button', { name: 'Confirm' })
    await userEvent.click(button)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Confirm' })).toHaveAttribute('aria-busy', 'true'))
    await act(async () => release())
    await waitFor(() => expect(screen.getByRole('button', { name: 'Confirm' })).not.toHaveAttribute('aria-busy'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('an action without a handler closes the dialog', async () => {
    const onOpenChange = vi.fn()
    render(<Dialog open title="Hi" actions={[{ label: 'OK' }]} onOpenChange={onOpenChange} />)
    await userEvent.click(screen.getByRole('button', { name: 'OK' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('passes a close function to action handlers', async () => {
    const onOpenChange = vi.fn()
    render(
      <Dialog
        open
        title="Hi"
        actions={[{ label: 'Cancel', onClick: ({ close }) => close() }]}
        onOpenChange={onOpenChange}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('stays open on Escape when not dismissible', async () => {
    const onOpenChange = vi.fn()
    render(<Dialog open title="Locked" dismissible={false} onOpenChange={onOpenChange} />)
    await userEvent.keyboard('{Escape}')
    expect(onOpenChange).not.toHaveBeenCalled()
  })

  it('closes on Escape when dismissible', async () => {
    const onOpenChange = vi.fn()
    render(<Dialog open title="Open" onOpenChange={onOpenChange} />)
    await userEvent.keyboard('{Escape}')
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('applies size and a themed icon', () => {
    render(<Dialog open title="Warn" size="sm" icon={{ name: 'lucide-triangle-alert', theme: 'yellow' }} />)
    expect(screen.getByRole('dialog').className).toContain('max-w-sm')
    expect(document.querySelector('.bg-surface-amber-2')).not.toBeNull()
  })

  it('accepts the legacy options object', () => {
    render(<Dialog open options={{ title: 'Legacy title', size: 'xl' }} />)
    expect(screen.getByText('Legacy title')).toBeInTheDocument()
    expect(screen.getByRole('dialog').className).toContain('max-w-xl')
  })

  it('renders bare content without chrome', () => {
    render(
      <Dialog open bare>
        {({ close }) => <button onClick={close}>Bare content</button>}
      </Dialog>,
    )
    expect(screen.getByText('Bare content')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull()
  })

  it('focuses a marked element on open', async () => {
    render(
      <Dialog open title="Form">
        <input data-autofocus aria-label="Name" />
        <input aria-label="Other" />
      </Dialog>,
    )
    await waitFor(() => expect(screen.getByLabelText('Name')).toHaveFocus())
  })

  it('works uncontrolled through a trigger-driven wrapper', async () => {
    function Harness() {
      const [open, setOpen] = useState(false)
      return (
        <>
          <button onClick={() => setOpen(true)}>Show</button>
          <Dialog open={open} onOpenChange={setOpen} title="Hello" />
        </>
      )
    }
    render(<Harness />)
    expect(screen.queryByRole('dialog')).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Show' }))
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })
})

describe('imperative dialogs', () => {
  it('createDialog shows a dialog with message and sanitized html', async () => {
    render(<Dialogs />)
    act(() => {
      createDialog({ title: 'Heads up', message: 'Plain message', html: '<b>Bold</b><script>x()</script>' })
    })
    expect(await screen.findByText('Plain message')).toBeInTheDocument()
    const bold = screen.getByText('Bold')
    expect(bold.tagName).toBe('B')
    expect(document.querySelector('script')).toBeNull()
  })

  it('createDialog actions can update the dialog error and close it', async () => {
    render(<Dialogs />)
    let handle: ReturnType<typeof createDialog> | undefined
    act(() => {
      handle = createDialog({
        title: 'Retry',
        actions: [
          {
            label: 'Try',
            onClick: () => handle?.update({ error: 'Failed to save' }),
          },
        ],
      })
    })
    await userEvent.click(await screen.findByRole('button', { name: 'Try' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to save')
    act(() => handle?.close())
    await waitFor(() => expect(useDialogStore.getState().dialogs.every((dialog) => !dialog.show)).toBe(true))
  })

  it('confirmDialog calls onConfirm and does not report a cancel', async () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    render(<Dialogs />)
    act(() => {
      confirmDialog({ title: 'Sure?', message: 'Really delete?', onConfirm, onCancel })
    })
    await userEvent.click(await screen.findByRole('button', { name: 'Confirm' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onCancel).not.toHaveBeenCalled()
  })

  it('confirmDialog reports a cancel when dismissed', async () => {
    const onCancel = vi.fn()
    render(<Dialogs />)
    act(() => {
      confirmDialog({ title: 'Sure?', message: 'Really?', onConfirm: vi.fn(), onCancel })
    })
    await screen.findByRole('dialog')
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(onCancel).toHaveBeenCalled())
  })
})

describe('Tabs', () => {
  const tabs = [{ label: 'Activity' }, { label: 'Emails' }, { label: 'Comments' }]

  it('shows the first panel and switches on click', async () => {
    const onChange = vi.fn()
    render(
      <MemoryRouter>
        <Tabs tabs={tabs} onChange={onChange} tabPanel={({ tab }) => <div>{tab.label} panel</div>} />
      </MemoryRouter>,
    )
    expect(screen.getByText('Activity panel')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('tab', { name: 'Emails' }))
    expect(onChange).toHaveBeenCalledWith(1)
    expect(await screen.findByText('Emails panel')).toBeInTheDocument()
  })

  it('is controlled by value', () => {
    render(
      <MemoryRouter>
        <Tabs tabs={tabs} value={2} tabPanel={({ tab }) => <div>{tab.label} panel</div>} />
      </MemoryRouter>,
    )
    expect(screen.getByText('Comments panel')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Comments' })).toHaveAttribute('data-state', 'active')
  })

  it('renders router links for routed tabs and custom tab items', () => {
    render(
      <MemoryRouter>
        <Tabs
          tabs={[{ label: 'Leads', route: '/leads' }, { label: 'Deals' }]}
          tabItem={({ tab }) => <button>{`Custom ${tab.label}`}</button>}
        />
      </MemoryRouter>,
    )
    expect(screen.getByRole('tab', { name: 'Custom Leads' })).toBeInTheDocument()
  })

  it('renders links for tabs with a route', () => {
    render(
      <MemoryRouter>
        <Tabs tabs={[{ label: 'Leads', route: '/leads' }]} />
      </MemoryRouter>,
    )
    expect(screen.getByRole('tab', { name: 'Leads' })).toHaveAttribute('href', '/leads')
  })
})

describe('TabButtons', () => {
  const options = [
    { label: 'Open', value: 'open' },
    { label: 'Closed', value: 'closed' },
    { label: 'Hold', value: 'hold', disabled: true },
  ]

  it('selects an option and reports the value', async () => {
    const onChange = vi.fn()
    function Harness() {
      const [value, setValue] = useState<TabButtonValue | undefined>('open')
      return (
        <MemoryRouter>
          <TabButtons
            options={options}
            value={value}
            onChange={(next) => {
              onChange(next)
              setValue(next)
            }}
          />
        </MemoryRouter>
      )
    }
    render(<Harness />)
    expect(screen.getByRole('radio', { name: 'Open' })).toBeChecked()
    await userEvent.click(screen.getByRole('radio', { name: 'Closed' }))
    expect(onChange).toHaveBeenCalledWith('closed')
    expect(screen.getByRole('radio', { name: 'Closed' })).toBeChecked()
  })

  it('does not select disabled options', async () => {
    const onChange = vi.fn()
    render(
      <MemoryRouter>
        <TabButtons options={options} value="open" onChange={onChange} />
      </MemoryRouter>,
    )
    await userEvent.click(screen.getByRole('radio', { name: 'Hold' }))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('falls back to the active option when the value is unknown', async () => {
    const onChange = vi.fn()
    render(
      <MemoryRouter>
        <TabButtons
          options={[
            { label: 'A', value: 'a' },
            { label: 'B', value: 'b', active: true },
          ]}
          value="zzz"
          onChange={onChange}
        />
      </MemoryRouter>,
    )
    await waitFor(() => expect(onChange).toHaveBeenCalledWith('b'))
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('renders icon-only options with an accessible label', () => {
    render(
      <MemoryRouter>
        <TabButtons options={[{ label: 'Grid', value: 'grid', icon: 'lucide-layout-grid' }]} value="grid" />
      </MemoryRouter>,
    )
    expect(screen.getByRole('radio', { name: 'Grid' })).toBeInTheDocument()
  })
})

describe('Breadcrumbs', () => {
  it('renders route, link and button crumbs and marks the last one', async () => {
    const onClick = vi.fn()
    render(
      <MemoryRouter>
        <Breadcrumbs
          items={[
            { label: 'Home', route: '/' },
            { label: 'Docs', href: 'https://example.com/docs' },
            { label: 'Action', onClick },
            { label: 'Current' },
          ]}
        />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'Docs' })).toHaveAttribute('href', 'https://example.com/docs')
    await userEvent.click(screen.getByRole('button', { name: 'Action' }))
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Current' }).className).toContain('text-ink-gray-9')
    expect(screen.getAllByText('/').length).toBe(3)
  })

  it('ignores falsy items', () => {
    render(
      <MemoryRouter>
        <Breadcrumbs items={[{ label: 'One' }, null, false, { label: 'Two' }]} />
      </MemoryRouter>,
    )
    expect(screen.getAllByRole('button')).toHaveLength(2)
  })

  it('renders prefix and suffix slots', () => {
    render(
      <MemoryRouter>
        <Breadcrumbs
          items={[{ label: 'One' }]}
          prefix={() => <i data-testid="pre" />}
          suffix={() => <i data-testid="suf" />}
        />
      </MemoryRouter>,
    )
    expect(screen.getByTestId('pre')).toBeInTheDocument()
    expect(screen.getByTestId('suf')).toBeInTheDocument()
  })
})

describe('toast', () => {
  it('shows success, error and legacy-object toasts with sanitized html', async () => {
    render(<ToastProvider />)
    act(() => {
      toast.success('Saved <b>lead</b><script>x()</script>')
    })
    expect(await screen.findByText('lead')).toBeInTheDocument()
    expect(document.querySelector('script')).toBeNull()
    act(() => {
      toast.error('Something failed')
      toast({ title: 'Legacy title', text: 'Legacy text', type: 'info' })
    })
    expect(await screen.findByText('Something failed')).toBeInTheDocument()
    expect(await screen.findByText('Legacy title')).toBeInTheDocument()
    expect(await screen.findByText('Legacy text')).toBeInTheDocument()
  })
})
