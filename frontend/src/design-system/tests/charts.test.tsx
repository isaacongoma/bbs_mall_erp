import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AxisChart, DonutChart, NumberChart } from '../components/Charts'
import type { AxisChartConfig, DonutChartConfig } from '../types/charts'
import { buildAxisChartOptions } from '../utils/axisChartOptions'
import { formatDate, formatLabel, formatValue, mergeDeep } from '../utils/chartHelpers'
import { buildDonutChartOptions } from '../utils/donutChartOptions'

const axisConfig: AxisChartConfig = {
  title: 'Deals by month',
  data: [
    { month: 'Jan', won: 10, lost: 4 },
    { month: 'Feb', won: 20, lost: 6 },
  ],
  xAxis: { key: 'month', type: 'category' },
  yAxis: { title: 'Count' },
  series: [
    { name: 'won', type: 'bar' },
    { name: 'lost', type: 'line' },
  ],
}

describe('chart helpers', () => {
  it('formats labels, values and dates', () => {
    expect(formatLabel('lead_source_name')).toBe('Lead Source Name')
    expect(formatValue(1234567, 1, true)).toBe('1.2M')
    expect(formatValue(1234.5)).toBe('1,234.5')
    expect(formatValue(NaN)).toBe('NaN')
    expect(formatDate('2025-03-14', undefined, 'month')).toBe('March, 2025')
    expect(formatDate('2025-03-14', undefined, 'year')).toBe('2025')
    expect(formatDate('')).toBe('')
  })

  it('deep merges nested objects without mutating the target', () => {
    const target = { a: { b: 1, c: 2 }, keep: true }
    const merged = mergeDeep(target, { a: { b: 9 } }, { extra: 1 })
    expect(merged).toEqual({ a: { b: 9, c: 2 }, keep: true, extra: 1 })
    expect(target.a.b).toBe(1)
  })
})

describe('axis chart options', () => {
  it('builds a series per config with [x, y] data pairs', () => {
    const options = buildAxisChartOptions(axisConfig)
    expect(options.series).toHaveLength(2)
    expect(options.series[0].type).toBe('bar')
    expect(options.series[0].data).toEqual([
      ['Jan', 10],
      ['Feb', 20],
    ])
    expect(options.series[1].data).toEqual([
      ['Jan', 4],
      ['Feb', 6],
    ])
    expect(options.legend.show).toBe(1)
    expect(options.title.text).toBe('Deals by month')
  })

  it('swaps coordinates for horizontal bars', () => {
    const options = buildAxisChartOptions({ ...axisConfig, series: [{ name: 'won', type: 'bar' }], swapXY: true })
    expect(options.series[0].data).toEqual([
      [10, 'Jan'],
      [20, 'Feb'],
    ])
    expect(options.yAxis).toHaveLength(1)
  })

  it('stacks bars and rounds exactly one series, matching the original index quirk', () => {
    const options = buildAxisChartOptions({
      ...axisConfig,
      stacked: true,
      series: [
        { name: 'won', type: 'bar' },
        { name: 'lost', type: 'bar' },
      ],
    })
    expect(options.series[0].stack).toBe('stack')
    expect(options.series[0].itemStyle.borderRadius).toEqual([2, 2, 0, 0])
    expect(options.series[1].itemStyle.borderRadius).toBe(0)
  })

  it('turns area series into filled lines and enables the secondary axis', () => {
    const options = buildAxisChartOptions({
      ...axisConfig,
      series: [
        { name: 'won', type: 'area', fillOpacity: 0.3, color: '#123456' },
        { name: 'lost', type: 'line', axis: 'y2' },
      ],
    })
    expect(options.series[0].type).toBe('line')
    expect(options.series[0].areaStyle).toEqual({ color: '#123456', opacity: 0.3 })
    expect(options.yAxis[1].show).toBe(true)
    expect(options.series[1].yAxisIndex).toBe(1)
  })

  it('rejects unsupported swap combinations', () => {
    expect(() => buildAxisChartOptions({ ...axisConfig, swapXY: true })).toThrow('Swap axes is not supported')
    expect(() =>
      buildAxisChartOptions({
        ...axisConfig,
        swapXY: true,
        xAxis: { key: 'month', type: 'time' },
        series: [{ name: 'won', type: 'bar' }],
      }),
    ).toThrow('time series')
  })

  it('applies custom echart overrides last', () => {
    const options = buildAxisChartOptions({
      ...axisConfig,
      echartOptions: { animation: false },
      series: [{ name: 'won', type: 'bar', echartOptions: { barMaxWidth: 10 } }],
    })
    expect(options.animation).toBe(false)
    expect(options.series[0].barMaxWidth).toBe(10)
  })

  it('flips layout for right-to-left', () => {
    const options = buildAxisChartOptions({ ...axisConfig, dir: 'rtl' })
    expect(options.xAxis.inverse).toBe(true)
    expect(options.yAxis[0].position).toBe('right')
  })

  it('formats tooltips with sorted, non-zero entries', () => {
    const options = buildAxisChartOptions(axisConfig)
    const html = options.tooltip.formatter([
      { value: ['Jan', 0], seriesName: 'zero_val', marker: '' },
      { value: ['Jan', 5], seriesName: 'small', marker: '' },
      { value: ['Jan', 50], seriesName: 'big', marker: '' },
    ])
    expect(html).not.toContain('Zero Val')
    expect(html.indexOf('Big')).toBeLessThan(html.indexOf('Small'))
  })
})

describe('donut chart options', () => {
  const donut: DonutChartConfig = {
    title: 'By source',
    data: [
      { source: 'Web', count: 10 },
      { source: 'Email', count: 30 },
      { source: 'Phone', count: 60 },
    ],
    categoryColumn: 'source',
    valueColumn: 'count',
  }

  it('sorts slices by value and builds the dataset', () => {
    const options = buildDonutChartOptions(donut)
    expect(options.dataset.source).toEqual([
      ['source', 'count'],
      ['Phone', 60],
      ['Email', 30],
      ['Web', 10],
    ])
    expect(options.series[0].type).toBe('pie')
    expect(options.legend.formatter('Phone')).toBe('Phone (60%)')
  })

  it('moves labels inline and drops the legend when requested', () => {
    const options = buildDonutChartOptions({ ...donut, showInlineLabels: true })
    expect(options.legend).toBeNull()
    expect(options.series[0].label.formatter({ name: 'Email', value: ['Email', 30] })).toBe('Email (30%)')
  })

  it('handles an empty total without dividing by zero', () => {
    const options = buildDonutChartOptions({ ...donut, data: [{ source: 'None', count: 0 }] })
    expect(options.legend.formatter('None')).toBe('None (0%)')
  })

  it('does not mutate the input data order', () => {
    const copy = donut.data.map((row) => ({ ...row }))
    buildDonutChartOptions(donut)
    expect(donut.data).toEqual(copy)
  })
})

describe('NumberChart', () => {
  it('shows the compact value with prefix and suffix', () => {
    render(<NumberChart config={{ title: 'Revenue', value: 1500000, suffix: '%' }} />)
    expect(screen.getByText('Revenue')).toBeInTheDocument()
    expect(screen.getByText(/1\.5M%/)).toBeInTheDocument()
  })

  it('colours a positive delta green and a negative one red', () => {
    const { rerender } = render(<NumberChart config={{ title: 'A', value: 10, delta: 5 }} />)
    expect(screen.getByText('↑').parentElement?.className).toContain('text-ink-green-6')
    rerender(<NumberChart config={{ title: 'A', value: 10, delta: -5 }} />)
    expect(screen.getByText('↓').parentElement?.className).toContain('text-ink-red-8')
  })

  it('inverts delta colours when negative is better', () => {
    render(<NumberChart config={{ title: 'Response time', value: 10, delta: -5, negativeIsBetter: true }} />)
    expect(screen.getByText('↓').parentElement?.className).toContain('text-ink-green-6')
  })

  it('sanitizes an HTML prefix', () => {
    const { container } = render(
      <NumberChart config={{ title: 'A', value: 1, prefix: '<b>$</b><script>x()</script>' }} />,
    )
    expect(container.querySelector('b')?.textContent).toBe('$')
    expect(container.querySelector('script')).toBeNull()
  })

  it('allows replacing the body slots', () => {
    render(
      <NumberChart
        config={{ title: 'A', value: 1 }}
        title={<span>Custom title</span>}
        subtitle={({ formatValue: format }) => <b>{format(2000, 0, true)}</b>}
      />,
    )
    expect(screen.getByText('Custom title')).toBeInTheDocument()
    expect(screen.getByText('2K')).toBeInTheDocument()
  })
})

describe('chart components', () => {
  it('renders an svg for a valid axis chart', async () => {
    const { container } = render(<AxisChart config={axisConfig} />)
    await waitFor(() => expect(container.querySelector('svg')).not.toBeNull())
  })

  it('shows an error message for an invalid axis configuration', () => {
    render(<AxisChart config={{ ...axisConfig, swapXY: true }} />)
    expect(screen.getByText(/Error: Swap axes is not supported/)).toBeInTheDocument()
  })

  it('renders an svg for a donut chart', async () => {
    const { container } = render(
      <DonutChart config={{ title: 'T', data: [{ k: 'a', v: 1 }], categoryColumn: 'k', valueColumn: 'v' }} />,
    )
    await waitFor(() => expect(container.querySelector('svg')).not.toBeNull())
  })
})
