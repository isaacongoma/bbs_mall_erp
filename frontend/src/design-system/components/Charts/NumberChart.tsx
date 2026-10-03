import DOMPurify from 'dompurify'
import { useMemo, type ReactNode } from 'react'
import type { NumberChartConfig } from '../../types/charts'
import { cn } from '../../utils/cn'
import { formatValue } from '../../utils/chartHelpers'

export interface NumberChartProps {
  config: NumberChartConfig
  className?: string
  body?: ReactNode
  title?: ReactNode
  subtitle?: (props: { formatValue: typeof formatValue }) => ReactNode
  delta?: (props: { formatValue: typeof formatValue }) => ReactNode
}

export function NumberChart({ config, className, body, title, subtitle, delta }: NumberChartProps) {
  const prefixHtml = useMemo(() => (config.prefix ? DOMPurify.sanitize(config.prefix) : ''), [config.prefix])
  const positive = (config.delta ?? 0) >= 0
  const deltaGood = config.negativeIsBetter ? !positive : positive

  return (
    <div
      className={cn(
        'flex max-h-[140px] items-center gap-2 overflow-hidden bg-surface-base text-ink-gray-8 px-6 pt-5',
        config.delta ? 'pb-6' : 'pb-3',
        className,
      )}
    >
      {body ?? (
        <div className="flex w-full flex-col">
          {title ?? <span className="truncate text-sm-medium text-ink-gray-5">{config.title}</span>}
          {subtitle ? (
            subtitle({ formatValue })
          ) : (
            <div className="flex flex-1 items-center gap-0.5 flex-shrink-0 truncate text-[24px] text-ink-gray-6 font-semibold leading-10">
              {prefixHtml && <div className="size-4 table" dangerouslySetInnerHTML={{ __html: prefixHtml }} />}
              {formatValue(config.value, 1, true)}
              {config.suffix}
            </div>
          )}
          {delta ? (
            delta({ formatValue })
          ) : config.delta ? (
            <div
              className={cn(
                'flex items-center gap-0.5 text-xs-medium',
                deltaGood ? 'text-ink-green-6' : 'text-ink-red-8',
              )}
            >
              <span>{positive ? '↑' : '↓'}</span>
              <span>
                {config.deltaPrefix}
                {formatValue(config.delta, 1, true)}
                {config.deltaSuffix}
              </span>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
