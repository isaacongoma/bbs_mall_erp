import { useMemo } from 'react'
import type { DonutChartConfig } from '../../types/charts'
import { buildDonutChartOptions } from '../../utils/donutChartOptions'
import { ECharts } from './ECharts'

export interface DonutChartProps {
  config: DonutChartConfig
  onClick?: (params: unknown) => void
  className?: string
}

function documentDirection(): 'rtl' | 'ltr' {
  return typeof document !== 'undefined' && document.documentElement.dir === 'rtl' ? 'rtl' : 'ltr'
}

export function DonutChart({ config, onClick, className }: DonutChartProps) {
  const { options, error } = useMemo(() => {
    try {
      return { options: buildDonutChartOptions({ ...config, dir: config.dir ?? documentDirection() }), error: '' }
    } catch (failure) {
      return { options: {}, error: failure instanceof Error ? failure.message : String(failure) }
    }
  }, [config])

  return <ECharts options={options} error={error} onClick={onClick} className={className} />
}
