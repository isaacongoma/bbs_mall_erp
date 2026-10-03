import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { Checkbox } from '../components/Checkbox'
import { Dropdown } from '../components/Dropdown'
import { Popover } from '../components/Popover'
import { Switch } from '../components/Switch'

function Location() {
  return <div data-testid="location">{useLocation().pathname}</div>
}

describe('Popover', () => {
  it('opens from the legacy target slot and closes via controls', async () => {
    render(
      <Popover
        target={({ togglePopover }) => <button onClick={() => togglePopover()}>Open</button>}
        body={({ close }) => (
          <div>
            <span>Panel body</span>
            <button onClick={close}>Dismiss</button>
          </div>
        )}
      />,
    )
    expect(screen.queryByText('Panel body')).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Open' }))
    expect(await screen.findByText('Panel body')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
    await waitFor(() => expect(screen.queryByText('Panel body')).toBeNull())
  })

  it('opens from the modern trigger and wraps content in the panel shell', async () => {
    render(<Popover trigger={<button>Trigger</button>}>{() => <span>Inside</span>}</Popover>)
    await userEvent.click(screen.getByRole('button', { name: 'Trigger' }))
    const inside = await screen.findByText('Inside')
    expect(inside.closest('[data-slot="content-body"]')).not.toBeNull()
  })

  it('renders bare content without the panel shell', async () => {
    render(
      <Popover bare trigger={<button>Trigger</button>}>
        <span>Naked</span>
      </Popover>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Trigger' }))
    const naked = await screen.findByText('Naked')
    expect(naked.closest('[data-slot="content-body"]')).toBeNull()
  })

  it('supports controlled open state and reports changes', async () => {
    const onOpenChange = vi.fn()
    function Harness() {
      const [open, setOpen] = useState(false)
      return (
        <Popover
          open={open}
          onOpenChange={(next) => {
            onOpenChange(next)
            setOpen(next)
          }}
          trigger={<button>Toggle</button>}
        >
          <span>Controlled</span>
        </Popover>
      )
    }
    render(<Harness />)
    await userEvent.click(screen.getByRole('button', { name: 'Toggle' }))
    expect(await screen.findByText('Controlled')).toBeInTheDocument()
    expect(onOpenChange).toHaveBeenCalledWith(true)
  })

  it('does not close on outside interaction when not dismissible', async () => {
    render(
      <div>
        <button>Outside</button>
        <Popover dismissible={false} trigger={<button>Trigger</button>}>
          <span>Sticky</span>
        </Popover>
      </div>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Trigger' }))
    await screen.findByText('Sticky')
    await userEvent.click(screen.getByRole('button', { name: 'Outside' }))
    expect(screen.getByText('Sticky')).toBeInTheDocument()
  })
})

describe('Dropdown', () => {
  const open = async () => userEvent.click(screen.getByRole('button', { name: 'Actions' }))

  it('renders options and runs the selected item action', async () => {
    const onEdit = vi.fn()
    render(
      <MemoryRouter>
        <Dropdown
          button={{ label: 'Actions' }}
          options={[
            { label: 'Edit', onClick: onEdit },
            { label: 'Delete', theme: 'red' },
          ]}
        />
      </MemoryRouter>,
    )
    await open()
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Edit' }))
    expect(onEdit).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(screen.queryByRole('menuitem', { name: 'Edit' })).toBeNull())
  })

  it('skips options whose condition is false and hides disabled interaction', async () => {
    const onClick = vi.fn()
    render(
      <MemoryRouter>
        <Dropdown
          button={{ label: 'Actions' }}
          options={[
            { label: 'Visible', onClick },
            { label: 'Hidden', condition: () => false },
            { label: 'Locked', disabled: true, onClick },
          ]}
        />
      </MemoryRouter>,
    )
    await open()
    expect(await screen.findByRole('menuitem', { name: 'Visible' })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Hidden' })).toBeNull()
    expect(screen.getByRole('menuitem', { name: 'Locked' })).toHaveAttribute('data-disabled')
  })

  it('renders group labels and shows the empty state', async () => {
    render(
      <MemoryRouter>
        <Dropdown button={{ label: 'Actions' }} options={[{ group: 'Danger zone', items: [{ label: 'Remove' }] }]} />
      </MemoryRouter>,
    )
    await open()
    expect(await screen.findByText('Danger zone')).toBeInTheDocument()
  })

  it('shows "No options" when nothing is visible', async () => {
    render(
      <MemoryRouter>
        <Dropdown button={{ label: 'Actions' }} options={[]} />
      </MemoryRouter>,
    )
    await open()
    expect(await screen.findByText('No options')).toBeInTheDocument()
  })

  it('navigates when an item has a route', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="*" element={<Location />} />
        </Routes>
        <Dropdown button={{ label: 'Actions' }} options={[{ label: 'Go', route: '/leads' }]} />
      </MemoryRouter>,
    )
    await open()
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Go' }))
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/leads'))
  })

  it('opens submenus', async () => {
    render(
      <MemoryRouter>
        <Dropdown button={{ label: 'Actions' }} options={[{ label: 'More', submenu: [{ label: 'Nested item' }] }]} />
      </MemoryRouter>,
    )
    await open()
    const trigger = await screen.findByRole('menuitem', { name: 'More' })
    await userEvent.click(trigger)
    expect(await screen.findByRole('menuitem', { name: 'Nested item' })).toBeInTheDocument()
  })

  it('uses a custom trigger from children and exposes open state', async () => {
    render(
      <MemoryRouter>
        <Dropdown options={[{ label: 'One' }]}>
          {({ open: isOpen }) => <button>{isOpen ? 'Opened' : 'Closed'}</button>}
        </Dropdown>
      </MemoryRouter>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Closed' }))
    expect(await screen.findByRole('button', { name: 'Opened' })).toBeInTheDocument()
  })

  it('lets a switch option toggle without closing logic errors', async () => {
    const onToggle = vi.fn()
    render(
      <MemoryRouter>
        <Dropdown
          button={{ label: 'Actions' }}
          options={[{ label: 'Notifications', switch: true, switchValue: false, onClick: onToggle }]}
        />
      </MemoryRouter>,
    )
    await open()
    const menu = await screen.findByRole('menu')
    await userEvent.click(within(menu).getByRole('switch'))
    expect(onToggle).toHaveBeenCalledWith(true)
  })
})

describe('Switch', () => {
  it('toggles and reports the new value', async () => {
    const onChange = vi.fn()
    render(<Switch label="Enabled" onChange={onChange} />)
    const control = screen.getByRole('switch', { name: 'Enabled' })
    expect(control).toHaveAttribute('aria-checked', 'false')
    await userEvent.click(control)
    expect(onChange).toHaveBeenCalledWith(true)
    expect(control).toHaveAttribute('aria-checked', 'true')
  })

  it('respects controlled value and disabled', async () => {
    const onChange = vi.fn()
    const { rerender } = render(<Switch label="Locked" value onChange={onChange} disabled />)
    const control = screen.getByRole('switch')
    expect(control).toBeChecked()
    expect(control).toBeDisabled()
    await userEvent.click(control)
    expect(onChange).not.toHaveBeenCalled()
    rerender(<Switch label="Locked" value={false} onChange={onChange} />)
    expect(screen.getByRole('switch')).not.toBeChecked()
  })

  it('shows description or error, with the error taking precedence', () => {
    const { rerender } = render(<Switch label="A" description="Helpful" />)
    expect(screen.getByText('Helpful')).toBeInTheDocument()
    rerender(<Switch label="A" description="Helpful" error="Broken" />)
    expect(screen.queryByText('Helpful')).toBeNull()
    expect(screen.getByRole('alert')).toHaveTextContent('Broken')
    expect(screen.getByRole('switch')).toHaveAttribute('aria-invalid', 'true')
  })

  it('marks required fields', () => {
    render(<Switch label="Terms" required />)
    expect(screen.getByText('(required)')).toBeInTheDocument()
  })
})

describe('Checkbox', () => {
  it('reports checked state changes', async () => {
    const onChange = vi.fn()
    function Harness() {
      const [value, setValue] = useState(false)
      return (
        <Checkbox
          label="Agree"
          value={value}
          onChange={(next) => {
            onChange(next)
            setValue(next)
          }}
        />
      )
    }
    render(<Harness />)
    const box = screen.getByRole('checkbox', { name: 'Agree' })
    await userEvent.click(box)
    expect(onChange).toHaveBeenCalledWith(true)
    expect(box).toBeChecked()
  })

  it('accepts 1/0 values and indeterminate state', () => {
    const { rerender } = render(<Checkbox label="Row" value={1} />)
    expect(screen.getByRole('checkbox')).toBeChecked()
    rerender(<Checkbox label="Row" value={0} indeterminate />)
    expect((screen.getByRole('checkbox') as HTMLInputElement).indeterminate).toBe(true)
  })

  it('is disabled and describes errors', () => {
    render(<Checkbox label="Opt" disabled error="Required" />)
    const box = screen.getByRole('checkbox')
    expect(box).toBeDisabled()
    expect(box).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('alert')).toHaveTextContent('Required')
  })
})
