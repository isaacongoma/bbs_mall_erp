export type TimeGrain = 'second' | 'minute' | 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year'

export type EChartsOptionBag = Record<string, any>

export interface AxisConfig {
  title?: string
  yMin?: number
  yMax?: number
  echartOptions?: EChartsOptionBag
}

export interface SeriesConfigBase {
  name: string
  type: 'bar' | 'line' | 'area'
  color?: string
  axis?: 'y' | 'y2'
  showDataLabels?: boolean
  echartOptions?: EChartsOptionBag
}

export interface BarSeriesConfig extends SeriesConfigBase {
  type: 'bar'
  stackName?: string
}

export interface LineSeriesConfig extends SeriesConfigBase {
  type: 'line'
  lineType?: 'solid' | 'dashed' | 'dotted'
  lineWidth?: number
  showDataPoints?: boolean
}

export interface AreaSeriesConfig extends SeriesConfigBase {
  type: 'area'
  showDataPoints?: boolean
  fillOpacity?: number
}

export type AxisSeriesConfig = BarSeriesConfig | LineSeriesConfig | AreaSeriesConfig

export interface AxisChartConfig {
  data: Record<string, any>[]
  title: string
  subtitle?: string
  colors?: string[]
  dir?: 'rtl' | 'ltr'
  xAxis: {
    key: string
    type: 'category' | 'time' | 'value'
    timeGrain?: TimeGrain
    title?: string
    echartOptions?: EChartsOptionBag
  }
  yAxis: AxisConfig
  y2Axis?: AxisConfig
  swapXY?: boolean
  stacked?: boolean
  series: AxisSeriesConfig[]
  echartOptions?: EChartsOptionBag
}

export interface DonutChartConfig {
  data: Record<string, any>[]
  title: string
  subtitle?: string
  colors?: string[]
  dir?: 'rtl' | 'ltr'
  categoryColumn: string
  valueColumn: string
  maxSliceCount?: number
  showInlineLabels?: boolean
  echartOptions?: EChartsOptionBag
}

export interface NumberChartConfig {
  title: string
  value: number
  prefix?: string
  suffix?: string
  delta?: number
  deltaPrefix?: string
  deltaSuffix?: string
  negativeIsBetter?: boolean
}
