import { useEffect, useEffectEvent, useRef } from 'react'
import { cn } from '../../utils/cn'
import { debounce } from '../../utils/debounce'
import { echarts, type EChartsInstance } from '../../utils/echartsCore'

export interface EChartsProps {
  options: Record<string, any>
  onClick?: (params: unknown) => void
  error?: string
  className?: string
}

const defaultClassName = 'h-full w-full min-w-[300px] md:min-w-[400px] min-h-[300px] px-4 py-2'

export function ECharts({ options, onClick, error, className }: EChartsProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<EChartsInstance | null>(null)
  const emitClick = useEffectEvent((params: unknown) => onClick?.(params))
  const applyOptions = useEffectEvent(() => chartRef.current?.setOption({ ...options }, true))

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const chart = echarts.init(container, undefined, { renderer: 'svg' })
    chartRef.current = chart
    applyOptions()
    chart.on('click', (params) => emitClick(params))

    const resize = debounce(() => chart.resize({ animation: { duration: 300 } }), 250)
    const observer = new ResizeObserver(() => resize())
    const timer = setTimeout(() => observer.observe(container), 500)

    return () => {
      clearTimeout(timer)
      resize.cancel()
      observer.disconnect()
      chart.dispose()
      chartRef.current = null
    }
  }, [])

  useEffect(() => {
    applyOptions()
  }, [options])

  return (
    <>
      <div ref={containerRef} hidden={Boolean(error)} dir="ltr" className={cn(defaultClassName, className)} />
      {error && (
        <div className="flex h-full w-full items-center justify-center text-center text-ink-red-6">Error: {error}</div>
      )}
    </>
  )
}
