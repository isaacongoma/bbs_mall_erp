import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Combobox } from '../components/Combobox'
import type { ComboboxOption, ComboboxOptionValue } from '../types/combobox'
import { Password } from '../components/Password'
import { Select, type SelectOptionValue } from '../components/Select'
import { Textarea } from '../components/Textarea'
import { TextInput } from '../components/TextInput'

describe('TextInput', () => {
  it('reports typed values and reflects the controlled value', async () => {
    function Harness() {
      const [value, setValue] = useState('')
      return <TextInput aria-label="Name" value={value} onChange={setValue} />
    }
    render(<Harness />)
    const input = screen.getByRole('textbox', { name: 'Name' })
    await userEvent.type(input, 'Ada')
    expect(input).toHaveValue('Ada')
  })

  it('renders label, description, error and required marker with ARIA wiring', () => {
    const { rerender } = render(<TextInput label="Email" description="Work email" required />)
    const input = screen.getByLabelText(/Email/)
    expect(input).toBeRequired()
    expect(screen.getByText('Work email')).toBeInTheDocument()
    expect(input).toHaveAttribute('aria-describedby')
    rerender(<TextInput label="Email" description="Work email" error="Invalid email" />)
    expect(screen.queryByText('Work email')).toBeNull()
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid email')
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true')
  })

  it('debounces change notifications', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const onChange = vi.fn()
    render(<TextInput aria-label="Search" debounce={300} onChange={onChange} />)
    const input = screen.getByRole('textbox')
    await userEvent.type(input, 'abc', { advanceTimers: vi.advanceTimersByTime })
    expect(onChange).not.toHaveBeenCalled()
    await act(async () => {
      vi.advanceTimersByTime(350)
    })
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith('abc')
    vi.useRealTimers()
  })

  it('applies size, variant and disabled styling', () => {
    const { rerender } = render(<TextInput aria-label="X" size="md" variant="outline" />)
    expect(screen.getByRole('textbox').className).toContain('h-8')
    expect(screen.getByRole('textbox').className).toContain('bg-surface-base')
    rerender(<TextInput aria-label="X" disabled />)
    expect(screen.getByRole('textbox')).toBeDisabled()
    expect(screen.getByRole('textbox').className).toContain('bg-surface-gray-1')
  })

  it('renders prefix and suffix with matching padding', () => {
    render(<TextInput aria-label="Amount" prefix={<i data-testid="pre" />} suffix={<i data-testid="suf" />} />)
    expect(screen.getByTestId('pre')).toBeInTheDocument()
    expect(screen.getByTestId('suf')).toBeInTheDocument()
    expect(screen.getByRole('textbox').className).toContain('ps-8')
    expect(screen.getByRole('textbox').className).toContain('pe-8')
  })
})

describe('Textarea', () => {
  it('is controlled, honours rows and shows errors', async () => {
    function Harness() {
      const [value, setValue] = useState('')
      return <Textarea label="Notes" rows={5} value={value} onChange={setValue} error="Too short" />
    }
    render(<Harness />)
    const field = screen.getByLabelText('Notes')
    expect(field).toHaveAttribute('rows', '5')
    await userEvent.type(field, 'hello')
    expect(field).toHaveValue('hello')
    expect(screen.getByRole('alert')).toHaveTextContent('Too short')
  })
})

describe('Password', () => {
  it('toggles visibility from the eye button and the keyboard shortcut', async () => {
    render(<Password aria-label="Secret" value="hunter2" onChange={() => undefined} />)
    const input = screen.getByLabelText('Secret')
    expect(input).toHaveAttribute('type', 'password')
    await userEvent.click(screen.getByRole('button', { name: 'Show password' }))
    expect(input).toHaveAttribute('type', 'text')
    await userEvent.click(input)
    await userEvent.keyboard('{Control>}i{/Control}')
    expect(input).toHaveAttribute('type', 'password')
  })

  it('hides the toggle for masked values', () => {
    render(<Password aria-label="Secret" value="****" onChange={() => undefined} />)
    expect(screen.getByRole('button', { name: 'Show password', hidden: true }).className).toContain('hidden')
  })
})

describe('Select', () => {
  const options = [
    { label: 'Open', value: 'open' },
    { label: 'Closed', value: 'closed', description: 'Finished work' },
    { label: 'Locked', value: 'locked', disabled: true },
  ]

  it('shows the placeholder, opens, and selects an option', async () => {
    const onChange = vi.fn()
    function Harness() {
      const [value, setValue] = useState<SelectOptionValue | undefined>(undefined)
      return (
        <Select
          options={options}
          value={value}
          onChange={(next) => {
            onChange(next)
            setValue(next)
          }}
        />
      )
    }
    render(<Harness />)
    const trigger = screen.getByRole('combobox')
    expect(trigger).toHaveTextContent('Select option')
    await userEvent.click(trigger)
    await userEvent.click(await screen.findByRole('option', { name: /Closed/ }))
    expect(onChange).toHaveBeenCalledWith('closed')
    await waitFor(() => expect(screen.getByRole('combobox')).toHaveTextContent('Closed'))
  })

  it('does not allow selecting disabled options', async () => {
    const onChange = vi.fn()
    render(<Select options={options} onChange={onChange} />)
    await userEvent.click(screen.getByRole('combobox'))
    const locked = await screen.findByRole('option', { name: 'Locked' })
    expect(locked).toHaveAttribute('aria-disabled', 'true')
    await userEvent.click(locked)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('accepts plain string options and numeric values', async () => {
    const onChange = vi.fn()
    render(<Select options={['One', 'Two']} onChange={onChange} />)
    await userEvent.click(screen.getByRole('combobox'))
    await userEvent.click(await screen.findByRole('option', { name: 'Two' }))
    expect(onChange).toHaveBeenCalledWith('Two')

    const numeric = vi.fn()
    render(<Select options={[{ label: 'Five', value: 5 }]} onChange={numeric} />)
    await userEvent.click(screen.getAllByRole('combobox')[1] as HTMLElement)
    await userEvent.click(await screen.findByRole('option', { name: 'Five' }))
    expect(numeric).toHaveBeenCalledWith(5)
  })

  it('supports an empty-string option as a reset row', async () => {
    const onChange = vi.fn()
    render(
      <Select
        value="a"
        options={[
          { label: 'None', value: '' },
          { label: 'A', value: 'a' },
        ]}
        onChange={onChange}
      />,
    )
    await userEvent.click(screen.getByRole('combobox'))
    await userEvent.click(await screen.findByRole('option', { name: 'None' }))
    expect(onChange).toHaveBeenCalledWith('')
  })

  it('shows the empty message when there are no options', async () => {
    render(<Select options={[]} emptyText="Nothing here" />)
    await userEvent.click(screen.getByRole('combobox'))
    expect(await screen.findByText('Nothing here')).toBeInTheDocument()
  })

  it('renders a label, required marker and error', () => {
    render(<Select label="Status" required error="Pick one" options={options} />)
    expect(screen.getByText('Status')).toBeInTheDocument()
    expect(screen.getByText('(required)')).toBeInTheDocument()
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-invalid', 'true')
  })

  it('is disabled when asked', () => {
    render(<Select options={options} disabled />)
    expect(screen.getByRole('combobox')).toBeDisabled()
  })
})

describe('Combobox', () => {
  const people: ComboboxOption[] = [
    { label: 'Alex Rivera', value: 'alex' },
    { label: 'Blake Chen', value: 'blake', description: 'Sales' },
    { label: 'Casey Dunn', value: 'casey', disabled: true },
  ]

  function Harness(
    props: Partial<React.ComponentProps<typeof Combobox>> & {
      initial?: ComboboxOptionValue | null
      spy?: (v: ComboboxOptionValue | null) => void
    },
  ) {
    const { initial = null, spy, ...rest } = props
    const [value, setValue] = useState<ComboboxOptionValue | null>(initial)
    return (
      <MemoryRouter>
        <Combobox
          options={people}
          {...rest}
          value={value}
          onChange={(next) => {
            spy?.(next)
            setValue(next)
          }}
        />
      </MemoryRouter>
    )
  }

  beforeEach(() => {
    vi.useRealTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('opens on click, filters while typing, and selects with the mouse', async () => {
    const spy = vi.fn()
    render(<Harness spy={spy} />)
    const input = screen.getByRole('combobox')
    await userEvent.click(input)
    expect(await screen.findAllByRole('option')).toHaveLength(3)
    await userEvent.type(input, 'bla')
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(1))
    await userEvent.click(screen.getByRole('option', { name: /Blake Chen/ }))
    expect(spy).toHaveBeenCalledWith('blake')
    await waitFor(() => expect(screen.getByRole('combobox')).toHaveValue('Blake Chen'))
  })

  it('selects with the keyboard', async () => {
    const spy = vi.fn()
    render(<Harness spy={spy} />)
    await userEvent.click(screen.getByRole('combobox'))
    await screen.findAllByRole('option')
    await userEvent.keyboard('{ArrowDown}{Enter}')
    expect(spy).toHaveBeenCalled()
  })

  it('shows the committed label and does not filter the list to itself on reopen', async () => {
    render(<Harness initial="alex" />)
    expect(screen.getByRole('combobox')).toHaveValue('Alex Rivera')
    await userEvent.click(screen.getByRole('combobox'))
    expect(await screen.findAllByRole('option')).toHaveLength(3)
  })

  it('clears the model when the input is emptied in input mode', async () => {
    const spy = vi.fn()
    render(<Harness initial="alex" spy={spy} />)
    const input = screen.getByRole('combobox')
    await userEvent.clear(input)
    expect(spy).toHaveBeenCalledWith(null)
  })

  it('does not select disabled options', async () => {
    const spy = vi.fn()
    render(<Harness spy={spy} />)
    await userEvent.click(screen.getByRole('combobox'))
    await userEvent.click(await screen.findByRole('option', { name: /Casey Dunn/ }))
    expect(spy).not.toHaveBeenCalled()
  })

  it('shows empty text, loading state and group labels', async () => {
    const { unmount } = render(<Harness options={[]} emptyText="No matches" />)
    await userEvent.click(screen.getByRole('combobox'))
    expect(await screen.findByText('No matches')).toBeInTheDocument()
    unmount()

    const loading = render(<Harness loading />)
    await userEvent.click(screen.getByRole('combobox'))
    expect(await screen.findByText('Loading...')).toBeInTheDocument()
    loading.unmount()

    render(<Harness options={[{ group: 'Team', options: [{ label: 'Dana', value: 'dana' }] }]} />)
    await userEvent.click(screen.getByRole('combobox'))
    expect(await screen.findByText('Team')).toBeInTheDocument()
  })

  it('runs custom option actions and closes unless keepOpen', async () => {
    const onClick = vi.fn()
    render(<Harness options={[...people, { type: 'custom', key: 'create', label: 'Create new person', onClick }]} />)
    await userEvent.click(screen.getByRole('combobox'))
    await userEvent.click(await screen.findByRole('option', { name: 'Create new person' }))
    expect(onClick).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(screen.queryByRole('option')).toBeNull())
  })

  it('hides custom options whose condition is false', async () => {
    render(
      <Harness
        options={[
          ...people,
          { type: 'custom', key: 'x', label: 'Hidden action', onClick: vi.fn(), condition: () => false },
        ]}
      />,
    )
    await userEvent.click(screen.getByRole('combobox'))
    await screen.findAllByRole('option')
    expect(screen.queryByRole('option', { name: 'Hidden action' })).toBeNull()
  })

  it('skips client filtering when filterable is false', async () => {
    render(<Harness filterable={false} />)
    const input = screen.getByRole('combobox')
    await userEvent.click(input)
    await userEvent.type(input, 'zzz')
    expect(await screen.findAllByRole('option')).toHaveLength(3)
  })

  it('supports button mode with an in-popover search', async () => {
    const spy = vi.fn()
    render(<Harness trigger="button" placeholder="Pick a person" spy={spy} />)
    const button = screen.getByRole('button', { name: /Pick a person/ })
    await userEvent.click(button)
    const popover = await screen.findByRole('listbox')
    const search = within(popover.parentElement as HTMLElement).getByPlaceholderText('Pick a person')
    await userEvent.type(search, 'alex')
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(1))
    await userEvent.click(screen.getByRole('option', { name: /Alex Rivera/ }))
    expect(spy).toHaveBeenCalledWith('alex')
    await waitFor(() => expect(screen.getByRole('button', { name: /Alex Rivera/ })).toBeInTheDocument())
  })

  it('renders label and error', () => {
    render(<Harness label="Owner" error="Required field" />)
    expect(screen.getByText('Owner')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Required field')
  })

  it('does not open while disabled', async () => {
    render(<Harness disabled />)
    await userEvent.click(screen.getByRole('combobox'))
    expect(screen.queryByRole('option')).toBeNull()
  })
})
