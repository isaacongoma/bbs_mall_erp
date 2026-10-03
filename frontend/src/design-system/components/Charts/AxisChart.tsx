import { useMemo } from 'react'
import type { AxisChartConfig } from '../../types/charts'
import { buildAxisChartOptions } from '../../utils/axisChartOptions'
import { ECharts } from './ECharts'

export interface AxisChartProps {
  config: AxisChartConfig
  onClick?: (params: unknown) => void
  className?: string
}

function documentDirection(): 'rtl' | 'ltr' {
  return typeof document !== 'undefined' && document.documentElement.dir === 'rtl' ? 'rtl' : 'ltr'
}

export function AxisChart({ config, onClick, className }: AxisChartProps) {
  const { options, error } = useMemo(() => {
    try {
      return { options: buildAxisChartOptions({ ...config, dir: config.dir ?? documentDirection() }), error: '' }
    } catch (failure) {
      return { options: {}, error: failure instanceof Error ? failure.message : String(failure) }
    }
  }, [config])

  return <ECharts options={options} error={error} onClick={onClick} className={className} />
}
