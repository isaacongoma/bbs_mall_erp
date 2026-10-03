import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { generateWeeks } from '../components/DatePicker'
import { DatePicker, DateRangePicker, DateTimePicker, type DateRangeValue } from '../components/DatePicker'
import { TimePicker } from '../components/TimePicker'
import { formatTime, generateTimeOptions, normalize24, parseFlexibleTime } from '../utils/time'

describe('time helpers', () => {
  it('parses flexible human input', () => {
    expect(parseFlexibleTime('3pm')).toMatchObject({ valid: true, hh24: '15', mm: '00' })
    expect(parseFlexibleTime('3.30pm')).toMatchObject({ valid: true, hh24: '15', mm: '30' })
    expect(parseFlexibleTime('930')).toMatchObject({ valid: true, hh24: '09', mm: '30' })
    expect(parseFlexibleTime('1500')).toMatchObject({ valid: true, hh24: '15', mm: '00' })
    expect(parseFlexibleTime('12am')).toMatchObject({ valid: true, hh24: '00' })
    expect(parseFlexibleTime('12pm')).toMatchObject({ valid: true, hh24: '12' })
    expect(parseFlexibleTime('9:30:15 am')).toMatchObject({ valid: true, hh24: '09', mm: '30', ss: '15' })
    expect(parseFlexibleTime('25:00').valid).toBe(false)
    expect(parseFlexibleTime('nonsense').valid).toBe(false)
  })

  it('normalizes and formats times', () => {
    expect(normalize24('3pm')).toBe('15:00')
    expect(normalize24('09:05')).toBe('09:05')
    expect(normalize24('')).toBe('')
    expect(formatTime('15:30', 'h:mm A')).toBe('3:30 PM')
    expect(formatTime('00:00')).toBe('00:00')
  })

  it('generates interval options bounded by min and max', () => {
    const options = generateTimeOptions({ interval: 60, minMinutes: 9 * 60, maxMinutes: 11 * 60 })
    expect(options.map((option) => option.value)).toEqual(['09:00', '10:00', '11:00'])
  })
})

describe('calendar grid', () => {
  it('always yields six weeks of seven days and marks the selected day', () => {
    const weeks = generateWeeks(2025, 2, '2025-03-14')
    expect(weeks).toHaveLength(6)
    expect(weeks.every((week) => week.length === 7)).toBe(true)
    const selected = weeks.flat().filter((cell) => cell.isSelected)
    expect(selected).toHaveLength(1)
    expect(selected[0]?.key).toBe('2025-03-14')
    expect(weeks.flat().filter((cell) => cell.inMonth)).toHaveLength(31)
  })
})

describe('DatePicker', () => {
  function Harness(
    props: Partial<React.ComponentProps<typeof DatePicker>> & { spy?: (v: string) => void; initial?: string },
  ) {
    const { spy, initial = '2025-03-14', ...rest } = props
    const [value, setValue] = useState(initial)
    return (
      <DatePicker
        {...rest}
        value={value}
        onChange={(next) => {
          spy?.(next)
          setValue(next)
        }}
      />
    )
  }

  it('shows the formatted value and opens a calendar on click', async () => {
    render(<Harness format="DD/MM/YYYY" />)
    const input = screen.getByRole('textbox')
    expect(input).toHaveValue('14/03/2025')
    await userEvent.click(input)
    expect(await screen.findByRole('grid', { name: 'Calendar dates' })).toBeInTheDocument()
    expect(screen.getByRole('gridcell', { name: '2025-03-14' })).toHaveAttribute('aria-selected', 'true')
  })

  it('selects a date from the calendar, reports it, and closes', async () => {
    const spy = vi.fn()
    render(<Harness spy={spy} />)
    await userEvent.click(screen.getByRole('textbox'))
    await userEvent.click(await screen.findByRole('gridcell', { name: '2025-03-20' }))
    expect(spy).toHaveBeenCalledWith('2025-03-20')
    await waitFor(() => expect(screen.queryByRole('grid')).toBeNull())
    expect(screen.getByRole('textbox')).toHaveValue('2025-03-20')
  })

  it('navigates months with the previous and next buttons', async () => {
    render(<Harness />)
    await userEvent.click(screen.getByRole('textbox'))
    await screen.findByRole('grid')
    await userEvent.click(screen.getByRole('button', { name: 'next' }))
    expect(screen.getByRole('button', { name: 'cycle-calendar-view' })).toHaveTextContent('Apr 2025')
    await userEvent.click(screen.getByRole('button', { name: 'previous' }))
    await userEvent.click(screen.getByRole('button', { name: 'previous' }))
    expect(screen.getByRole('button', { name: 'cycle-calendar-view' })).toHaveTextContent('Feb 2025')
  })

  it('switches to the month/year view and picks a month', async () => {
    render(<Harness />)
    await userEvent.click(screen.getByRole('textbox'))
    await userEvent.click(await screen.findByRole('button', { name: 'cycle-calendar-view' }))
    expect(await screen.findByRole('listbox', { name: 'Select year' })).toBeInTheDocument()
    await userEvent.click(
      within(screen.getByRole('listbox', { name: 'Select month' })).getByRole('option', { name: 'Aug' }),
    )
    expect(screen.getByRole('button', { name: 'cycle-calendar-view' })).toHaveTextContent('Aug 2025')
    expect(screen.getByRole('grid')).toBeInTheDocument()
  })

  it('commits typed dates on blur and rejects invalid text', async () => {
    const spy = vi.fn()
    render(
      <div>
        <Harness spy={spy} />
        <button>elsewhere</button>
      </div>,
    )
    const input = screen.getByRole('textbox')
    await userEvent.clear(input)
    await userEvent.type(input, '2025-04-02')
    await userEvent.click(screen.getByRole('button', { name: 'elsewhere' }))
    await waitFor(() => expect(spy).toHaveBeenCalledWith('2025-04-02'))

    await userEvent.clear(input)
    await userEvent.type(input, 'garbage')
    await userEvent.click(screen.getByRole('button', { name: 'elsewhere' }))
    await waitFor(() => expect(input).toHaveValue('2025-04-02'))
  })

  it('clears when the input is emptied', async () => {
    const spy = vi.fn()
    render(
      <div>
        <Harness spy={spy} />
        <button>elsewhere</button>
      </div>,
    )
    await userEvent.clear(screen.getByRole('textbox'))
    await userEvent.click(screen.getByRole('button', { name: 'elsewhere' }))
    await waitFor(() => expect(spy).toHaveBeenCalledWith(''))
  })

  it('disables dates outside min/max and via isDateUnavailable', async () => {
    const spy = vi.fn()
    render(<Harness spy={spy} min="2025-03-10" max="2025-03-25" isDateUnavailable={(date) => date.date() === 18} />)
    await userEvent.click(screen.getByRole('textbox'))
    expect(await screen.findByRole('gridcell', { name: '2025-03-05' })).toBeDisabled()
    expect(screen.getByRole('gridcell', { name: '2025-03-28' })).toBeDisabled()
    expect(screen.getByRole('gridcell', { name: '2025-03-18' })).toBeDisabled()
    await userEvent.click(screen.getByRole('gridcell', { name: '2025-03-05' }))
    expect(spy).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('gridcell', { name: '2025-03-12' }))
    expect(spy).toHaveBeenCalledWith('2025-03-12')
  })

  it('supports arrow key navigation inside the grid', async () => {
    render(<Harness />)
    await userEvent.click(screen.getByRole('textbox'))
    await userEvent.keyboard('{ArrowDown}')
    const start = await screen.findByRole('gridcell', { name: '2025-03-14' })
    await waitFor(() => expect(start).toHaveFocus())
    await userEvent.keyboard('{ArrowRight}')
    await waitFor(() => expect(screen.getByRole('gridcell', { name: '2025-03-15' })).toHaveFocus())
    await userEvent.keyboard('{Enter}')
    await waitFor(() => expect(screen.getByRole('textbox')).toHaveValue('2025-03-15'))
  })

  it('does not accept typing when typeable is false and stays read only', () => {
    render(<Harness typeable={false} />)
    expect(screen.getByRole('textbox')).toHaveAttribute('readonly')
  })

  it('renders shortcut actions and lets them set a date', async () => {
    const spy = vi.fn()
    render(
      <Harness
        spy={spy}
        actions={({ setDate, clear }) => (
          <>
            <button onClick={() => setDate('2025-01-01')}>New year</button>
            <button onClick={clear}>Reset</button>
          </>
        )}
      />,
    )
    await userEvent.click(screen.getByRole('textbox'))
    await userEvent.click(await screen.findByRole('button', { name: 'New year' }))
    expect(spy).toHaveBeenCalledWith('2025-01-01')
  })

  it('stays controlled by an external value change', async () => {
    const { rerender } = render(<DatePicker value="2025-03-14" />)
    expect(screen.getByRole('textbox')).toHaveValue('2025-03-14')
    rerender(<DatePicker value="2026-01-05" />)
    expect(screen.getByRole('textbox')).toHaveValue('2026-01-05')
  })
})

describe('DateTimePicker', () => {
  it('shows the combined value and keeps the popover open after choosing a date', async () => {
    const spy = vi.fn()
    function Harness() {
      const [value, setValue] = useState('2025-03-14 09:30:00')
      return (
        <DateTimePicker
          value={value}
          onChange={(next) => {
            spy(next)
            setValue(next)
          }}
        />
      )
    }
    render(<Harness />)
    const input = screen.getAllByRole('textbox')[0] as HTMLElement
    expect(input).toHaveValue('2025-03-14 09:30:00')
    await userEvent.click(input)
    await userEvent.click(await screen.findByRole('gridcell', { name: '2025-03-20' }))
    expect(spy).toHaveBeenCalledWith('2025-03-20 09:30:00')
    expect(screen.getByRole('grid')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Select time')).toHaveValue('09:30')
  })

  it('updates the time via the embedded time picker', async () => {
    const spy = vi.fn()
    function Harness() {
      const [value, setValue] = useState('2025-03-14 09:30:00')
      return (
        <DateTimePicker
          value={value}
          onChange={(next) => {
            spy(next)
            setValue(next)
          }}
        />
      )
    }
    render(<Harness />)
    await userEvent.click(screen.getAllByRole('textbox')[0] as HTMLElement)
    const time = await screen.findByPlaceholderText('Select time')
    await userEvent.clear(time)
    await userEvent.type(time, '3pm{Enter}')
    await waitFor(() => expect(spy).toHaveBeenCalledWith('2025-03-14 15:00:00'))
  })

  it('clears via an empty input', async () => {
    const spy = vi.fn()
    render(
      <div>
        <DateTimePicker value="2025-03-14 09:30:00" onChange={spy} />
        <button>elsewhere</button>
      </div>,
    )
    await userEvent.clear(screen.getAllByRole('textbox')[0] as HTMLElement)
    await userEvent.click(screen.getByRole('button', { name: 'elsewhere' }))
    await waitFor(() => expect(spy).toHaveBeenCalledWith(''))
  })
})

describe('DateRangePicker', () => {
  function Harness({ spy, dualPane }: { spy?: (value: DateRangeValue) => void; dualPane?: boolean }) {
    const [value, setValue] = useState<string[]>(['2025-03-10', '2025-03-12'])
    return (
      <DateRangePicker
        value={value}
        dualPane={dualPane}
        onChange={(next) => {
          spy?.(next)
          setValue(next)
        }}
      />
    )
  }

  it('shows the range and picks a new range with two clicks', async () => {
    const spy = vi.fn()
    render(<Harness spy={spy} />)
    expect(screen.getByRole('textbox')).toHaveValue('2025-03-10 to 2025-03-12')
    await userEvent.click(screen.getByRole('textbox'))
    await userEvent.click(await screen.findByRole('gridcell', { name: '2025-03-18' }))
    expect(spy).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('gridcell', { name: '2025-03-25' }))
    expect(spy).toHaveBeenCalledWith(['2025-03-18', '2025-03-25'])
    await waitFor(() => expect(screen.queryByRole('grid')).toBeNull())
  })

  it('orders endpoints when the second click is earlier', async () => {
    const spy = vi.fn()
    render(<Harness spy={spy} />)
    await userEvent.click(screen.getByRole('textbox'))
    await userEvent.click(await screen.findByRole('gridcell', { name: '2025-03-25' }))
    await userEvent.click(screen.getByRole('gridcell', { name: '2025-03-18' }))
    expect(spy).toHaveBeenCalledWith(['2025-03-18', '2025-03-25'])
  })

  it('renders two panes in dual-pane mode', async () => {
    render(<Harness dualPane />)
    await userEvent.click(screen.getByRole('textbox'))
    await screen.findAllByRole('grid')
    expect(screen.getAllByRole('grid')).toHaveLength(2)
  })

  it('parses typed ranges on blur', async () => {
    const spy = vi.fn()
    render(
      <div>
        <Harness spy={spy} />
        <button>elsewhere</button>
      </div>,
    )
    const input = screen.getByRole('textbox')
    await userEvent.clear(input)
    await userEvent.type(input, '2025-05-01 to 2025-05-09')
    await userEvent.click(screen.getByRole('button', { name: 'elsewhere' }))
    await waitFor(() => expect(spy).toHaveBeenCalledWith(['2025-05-01', '2025-05-09']))
  })
})

describe('TimePicker', () => {
  function Harness({ spy, initial = '' }: { spy?: (v: string) => void; initial?: string }) {
    const [value, setValue] = useState(initial)
    return (
      <TimePicker
        value={value}
        interval={30}
        onChange={(next) => {
          spy?.(next)
          setValue(next)
        }}
      />
    )
  }

  it('lists options and selects one', async () => {
    const spy = vi.fn()
    render(<Harness spy={spy} />)
    await userEvent.click(screen.getByRole('textbox'))
    expect((await screen.findAllByRole('option')).length).toBe(48)
    await userEvent.click(screen.getByRole('option', { name: '09:30' }))
    expect(spy).toHaveBeenCalledWith('09:30')
    await waitFor(() => expect(screen.getByRole('textbox')).toHaveValue('09:30'))
  })

  it('parses typed shorthand on Enter', async () => {
    const spy = vi.fn()
    render(<Harness spy={spy} />)
    await userEvent.type(screen.getByRole('textbox'), '3.30pm{Enter}')
    await waitFor(() => expect(spy).toHaveBeenCalledWith('15:30'))
  })

  it('reverts and reports invalid input', async () => {
    const onInvalid = vi.fn()
    render(<TimePicker value="10:00" onInputInvalid={onInvalid} />)
    const input = screen.getByRole('textbox')
    await userEvent.clear(input)
    await userEvent.type(input, 'abc{Enter}')
    await waitFor(() => expect(onInvalid).toHaveBeenCalledWith('abc'))
    expect(input).toHaveValue('10:00')
  })

  it('respects min and max', async () => {
    render(<TimePicker value="" interval={60} min="09:00" max="11:00" />)
    await userEvent.click(screen.getByRole('textbox'))
    expect((await screen.findAllByRole('option')).map((option) => option.textContent)).toEqual([
      '09:00',
      '10:00',
      '11:00',
    ])
  })

  it('moves the highlight with arrow keys and selects with Enter', async () => {
    const spy = vi.fn()
    render(<Harness spy={spy} />)
    await userEvent.click(screen.getByRole('textbox'))
    await screen.findAllByRole('option')
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{Enter}')
    await waitFor(() => expect(spy).toHaveBeenCalled())
  })

  it('formats with a 12-hour display format', () => {
    render(<TimePicker value="15:00" format="h:mm A" />)
    expect(screen.getByRole('textbox')).toHaveValue('3:00 PM')
  })
})
