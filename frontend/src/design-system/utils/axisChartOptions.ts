import type {
  AreaSeriesConfig,
  AxisChartConfig,
  AxisSeriesConfig,
  BarSeriesConfig,
  LineSeriesConfig,
} from '../types/charts'
import { buildBaseChartOptions } from './baseChartOptions'
import { formatValue, mergeDeep } from './chartHelpers'

function barSeriesOptions(config: AxisChartConfig, series: BarSeriesConfig) {
  const isRTL = config.dir === 'rtl'
  let roundedCorners = config.swapXY ? [0, 2, 2, 0] : [2, 2, 0, 0]
  if (config.swapXY && isRTL) roundedCorners = [2, 0, 0, 2]
  const index = config.series.findIndex((candidate) => candidate.name === series.name)
  const lastBarIndex = config.series
    .slice()
    .reverse()
    .findIndex((candidate) => candidate.type === 'bar')
  const isLastBar = lastBarIndex === index

  return {
    stack: config.stacked ? 'stack' : undefined,
    barMaxWidth: 60,
    itemStyle: { borderRadius: config.stacked ? (isLastBar ? roundedCorners : 0) : roundedCorners },
  }
}

function lineSeriesOptions(_config: AxisChartConfig, series: LineSeriesConfig) {
  return {
    connectNulls: true,
    symbol: 'circle',
    symbolSize: 7,
    showSymbol: series.showDataPoints || series.showDataLabels,
    emphasis: {},
    lineStyle: { width: series.lineWidth || 2, type: series.lineType },
  }
}

function areaSeriesOptions(_config: AxisChartConfig, series: AreaSeriesConfig) {
  return {
    type: 'line',
    showSymbol: series.showDataPoints,
    areaStyle: { color: series.color, opacity: series.fillOpacity || 0.5 },
  }
}

function typeOptions(config: AxisChartConfig, series: AxisSeriesConfig) {
  if (series.type === 'bar') return barSeriesOptions(config, series)
  if (series.type === 'line') return lineSeriesOptions(config, series)
  return areaSeriesOptions(config, series)
}

export function buildAxisChartOptions(config: AxisChartConfig): Record<string, any> {
  const data = config.data || []
  const base = buildBaseChartOptions(config)

  if (config.xAxis.type === 'time' && config.swapXY) throw new Error('Swap axes is not supported for time series data')
  if (config.series.find((series) => series.axis === 'y2' || series.type !== 'bar') && config.swapXY) {
    throw new Error('Swap axes is not supported for non-bar series or y2 axis')
  }

  const isRTL = config.dir === 'rtl'
  const swapXY = config.swapXY
  const lastBarSeriesIndex = config.series
    .slice()
    .reverse()
    .findIndex((series) => series.type === 'bar')
  if (config.series.some((series) => series.axis === 'y2')) base.yAxis[1].show = true

  base.series = config.series.map((series, index) => {
    let labelPosition = 'top'
    if (series.type === 'bar' && config.stacked) labelPosition = index === lastBarSeriesIndex ? 'top' : 'inside'
    if (series.type === 'bar' && swapXY) labelPosition = isRTL ? 'left' : 'right'

    const standard = {
      type: series.type,
      name: series.name,
      data: data.map((row: any) =>
        swapXY ? [row[series.name], row[config.xAxis.key]] : [row[config.xAxis.key], row[series.name]],
      ),
      yAxisIndex: series.axis === 'y2' ? 1 : 0,
      label: {
        show: series.showDataLabels,
        position: labelPosition,
        formatter: (params: any) => formatValue(swapXY ? params.value?.[0] : params.value?.[1], 1, true),
        fontSize: 11,
      },
      labelLayout: { hideOverlap: true },
      itemStyle: { color: series.color },
    }

    return mergeDeep(standard, typeOptions(config, series), series.echartOptions)
  })

  return mergeDeep(base, config.echartOptions)
}
