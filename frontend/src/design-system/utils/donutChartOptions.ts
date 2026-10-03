import type { DonutChartConfig } from '../types/charts'
import { getTitleOptions, legendPageIcons } from './baseChartOptions'
import { formatValue } from './chartHelpers'

export function buildDonutChartOptions(config: DonutChartConfig): Record<string, any> {
  const isRTL = config.dir === 'rtl'
  const data = [...(config.data || [])].sort((a, b) => {
    const left = a[config.valueColumn]
    const right = b[config.valueColumn]
    if (left === right) return 0
    return left > right ? -1 : 1
  })

  const labels = data.map((row) => row[config.categoryColumn])
  const values = data.map((row) => row[config.valueColumn])
  const total = values.reduce((sum, value) => (isNaN(value) ? sum : sum + value), 0)

  const radius = ['40%', '70%']
  let center = ['50%', '48%']
  if (config.subtitle) center = ['50%', '50%']
  if (config.showInlineLabels) center = ['50%', '50%']

  const percentageOf = (value: number) => (total > 0 ? (value / total) * 100 : 0)

  return {
    animation: true,
    animationDuration: 700,
    color: config.colors,
    textStyle: { fontFamily: ['InterVar', 'sans-serif'] },
    title: getTitleOptions(config.title, config.subtitle, isRTL),
    dataset: {
      source: [
        [config.categoryColumn, config.valueColumn],
        ...data.map((row) => [row[config.categoryColumn], row[config.valueColumn]]),
      ],
    },
    series: [
      {
        type: 'pie',
        name: config.categoryColumn,
        center,
        radius,
        labelLine: { show: config.showInlineLabels, lineStyle: { width: 2 }, length: 10, length2: 20, smooth: true },
        label: {
          show: config.showInlineLabels,
          formatter: ({ value, name }: any) => `${name} (${percentageOf(value[1]).toFixed(0)}%)`,
        },
        emphasis: { scaleSize: 5 },
      },
    ],
    legend: !config.showInlineLabels
      ? {
          left: 'center',
          bottom: 0,
          padding: [0, 10, 10, 10],
          orient: 'horizontal',
          show: true,
          type: 'scroll',
          itemGap: 12,
          formatter: (name: string) => `${name} (${percentageOf(values[labels.indexOf(name)]).toFixed(0)}%)`,
          textStyle: { padding: [0, 0, 0, -5], color: 'var(--ink-gray-8)' },
          icon: 'circle',
          pageIcons: legendPageIcons,
          pageIconColor: 'var(--ink-gray-6)',
          pageInactiveColor: 'var(--ink-gray-4)',
          pageIconSize: 10,
          pageTextStyle: { color: 'var(--ink-gray-6)' },
          animationDurationUpdate: 300,
        }
      : null,
    tooltip: {
      trigger: 'item',
      confine: true,
      appendToBody: false,
      formatter: (params: any) => {
        const dirAttr = isRTL ? ' dir="rtl"' : ''
        const value = params.value[1]
        const formatted = isNaN(value) ? value : formatValue(value, 1, true)
        return `
          <div${dirAttr} class="flex items-center justify-between gap-5">
            <div>${params.name}</div>
            <div class="font-bold">
              ${formatted} (${percentageOf(value).toFixed(0)}%)
            </div>
          </div>
        `
      },
    },
  }
}
