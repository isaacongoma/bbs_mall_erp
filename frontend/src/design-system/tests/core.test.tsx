import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { Alert } from '../components/Alert'
import { Avatar } from '../components/Avatar'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
import { Divider } from '../components/Divider'
import { ErrorMessage } from '../components/ErrorMessage'
import { Spinner } from '../components/Spinner'
import { Tooltip } from '../components/Tooltip'

describe('Button', () => {
  it('renders a labelled button and fires onClick', async () => {
    const onClick = vi.fn()
    render(<Button label="Save" onClick={onClick} />)
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('defaults to type button and supports submit', () => {
    const { rerender } = render(<Button label="Go" />)
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button')
    rerender(<Button label="Go" type="submit" />)
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit')
  })

  it('applies theme and variant classes', () => {
    render(<Button label="Delete" theme="red" variant="solid" />)
    const button = screen.getByRole('button')
    expect(button.className).toContain('bg-surface-red-7')
    expect(button.className).toContain('text-ink-base')
  })

  it('uses disabled styling and blocks clicks when disabled', async () => {
    const onClick = vi.fn()
    render(<Button label="Nope" disabled onClick={onClick} />)
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    expect(button.className).toContain('text-ink-gray-4')
    await userEvent.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('shows a spinner and loading text while loading, without dimming', () => {
    render(<Button label="Save" loading loadingText="Saving..." />)
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByText('Saving...')).toBeInTheDocument()
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(button.className).toContain('pointer-events-none')
    expect(button.className).not.toContain('bg-surface-gray-2 text-ink-gray-4')
  })

  it('renders an icon-only button with a screen-reader label', () => {
    render(<Button label="Add" icon="plus" size="md" />)
    const button = screen.getByRole('button', { name: 'Add' })
    expect(button.className).toContain('h-8 w-8')
    expect(button.querySelector('svg')).not.toBeNull()
  })

  it('renders a lucide icon on the left', () => {
    render(<Button label="Search" iconLeft="lucide-search" />)
    expect(screen.getByRole('button').querySelectorAll('svg').length).toBe(1)
  })

  it('renders a router link when given a destination', () => {
    render(
      <MemoryRouter>
        <Button label="Leads" to="/leads" />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: 'Leads' })).toHaveAttribute('href', '/leads')
  })

  it('renders an external link in a new tab', () => {
    render(<Button label="Docs" link="https://example.com" />)
    const anchor = screen.getByRole('link', { name: 'Docs' })
    expect(anchor).toHaveAttribute('target', '_blank')
    expect(anchor).toHaveAttribute('rel', 'noreferrer noopener')
  })

  it('falls back to a button when a link is disabled', () => {
    render(<Button label="Docs" link="https://example.com" disabled />)
    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('lets a consumer class override a conflicting built-in utility', () => {
    render(<Button label="Wide" className="h-10" />)
    expect(screen.getByRole('button').className).toContain('h-10')
    expect(screen.getByRole('button').className).not.toContain('h-7')
  })

  it('shows a tooltip on keyboard focus', async () => {
    render(<Button label="Info" tooltip="More detail" />)
    await userEvent.tab()
    expect((await screen.findAllByText('More detail')).length).toBeGreaterThan(0)
  })
})

describe('Badge', () => {
  it('renders the label and themed classes', () => {
    render(<Badge label="Won" theme="green" variant="subtle" />)
    const badge = screen.getByText('Won')
    expect(badge.className).toContain('bg-surface-green-2')
    expect(badge.className).toContain('h-5')
  })

  it('treats orange as an alias for amber', () => {
    render(<Badge label="Hold" theme="orange" />)
    expect(screen.getByText('Hold').className).toContain('bg-surface-amber-2')
  })

  it('renders prefix and suffix slots', () => {
    render(<Badge label="Tag" prefix={<i data-testid="p" />} suffix={<i data-testid="s" />} />)
    expect(screen.getByTestId('p')).toBeInTheDocument()
    expect(screen.getByTestId('s')).toBeInTheDocument()
  })
})

describe('Avatar', () => {
  it('shows the first letter when there is no image', () => {
    render(<Avatar label="isaac" />)
    expect(screen.getByText('i')).toBeInTheDocument()
  })

  it('falls back to the letter when the image fails to load', () => {
    render(<Avatar label="Mary" image="/missing.png" />)
    fireEvent.error(screen.getByRole('img'))
    expect(screen.getByText('M')).toBeInTheDocument()
    expect(screen.queryByRole('img')).toBeNull()
  })

  it('drops the size enum classes when a sizing utility is supplied', () => {
    const { container } = render(<Avatar label="A" size="xl" className="size-16" />)
    const root = container.firstElementChild as HTMLElement
    expect(root.className).toContain('size-16')
    expect(root.className).not.toContain('w-8')
  })

  it('supports square shape and an indicator', () => {
    const { container } = render(<Avatar label="A" shape="square" size="2xl" indicator={<span data-testid="dot" />} />)
    expect((container.firstElementChild as HTMLElement).className).toContain('rounded-[8px]')
    expect(screen.getByTestId('dot')).toBeInTheDocument()
  })
})

describe('Alert', () => {
  it('renders title, description and the themed icon', () => {
    render(<Alert title="Heads up" description="Check this" theme="blue" />)
    expect(screen.getByRole('alert')).toHaveClass('bg-surface-blue-2')
    expect(screen.getByText('Heads up')).toBeInTheDocument()
    expect(screen.getByText('Check this')).toBeInTheDocument()
  })

  it('hides itself and notifies when dismissed', async () => {
    const onDismiss = vi.fn()
    render(<Alert title="Bye" onDismiss={onDismiss} />)
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(onDismiss).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('can be non-dismissible and controlled', () => {
    const { rerender } = render(<Alert title="Fixed" dismissible={false} visible />)
    expect(screen.queryByRole('button', { name: 'Dismiss' })).toBeNull()
    rerender(<Alert title="Fixed" dismissible={false} visible={false} />)
    expect(screen.queryByRole('alert')).toBeNull()
  })
})

describe('ErrorMessage', () => {
  it('renders nothing without a message', () => {
    const { container } = render(<ErrorMessage message="" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows a string message as an alert', () => {
    render(<ErrorMessage message="Something failed" />)
    expect(screen.getByRole('alert')).toHaveTextContent('Something failed')
  })

  it('prefers server messages on an Error and sanitizes markup', () => {
    const error = Object.assign(new Error('generic'), { messages: '<b>Invalid</b><script>alert(1)</script>' })
    render(<ErrorMessage message={error} />)
    const alert = screen.getByRole('alert')
    expect(alert.innerHTML).toContain('<b>Invalid</b>')
    expect(alert.innerHTML).not.toContain('script')
  })
})

describe('Divider', () => {
  it('renders a horizontal rule by default', () => {
    const { container } = render(<Divider />)
    expect(container.querySelector('hr')?.className).toContain('border-t-[1px]')
  })

  it('renders an action button over the line and fires it', async () => {
    const onClick = vi.fn()
    render(<Divider action={{ label: 'Add', onClick }} />)
    expect(screen.getByRole('separator')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Add' }))
    expect(onClick).toHaveBeenCalled()
  })
})

describe('Spinner', () => {
  it('exposes a status role and applies fixed size metrics', () => {
    render(<Spinner size="lg" />)
    const spinner = screen.getByRole('status', { name: 'Loading' })
    expect(spinner).toHaveStyle({ width: '20px', height: '20px' })
  })

  it('applies a theme colour and track', () => {
    render(<Spinner theme="red" track />)
    const spinner = screen.getByRole('status')
    expect(spinner.getAttribute('class')).toContain('text-ink-red-8')
    expect(spinner.getAttribute('class')).toContain('fui-spinner--track')
  })
})

describe('Tooltip', () => {
  it('renders children untouched when disabled', () => {
    render(
      <Tooltip text="Hidden" disabled>
        <button>Trigger</button>
      </Tooltip>,
    )
    expect(screen.getByRole('button', { name: 'Trigger' })).toBeInTheDocument()
  })

  it('opens on focus with the given text', async () => {
    render(
      <Tooltip text="Helpful hint">
        <button>Trigger</button>
      </Tooltip>,
    )
    await userEvent.tab()
    expect((await screen.findAllByText('Helpful hint')).length).toBeGreaterThan(0)
  })
})
