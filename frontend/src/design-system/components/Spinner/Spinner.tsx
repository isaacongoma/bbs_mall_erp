import type { CSSProperties, SVGAttributes } from 'react'
import { cn } from '../../utils/cn'
import '../../styles/spinner.css'

export type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg'
export type SpinnerTheme = 'gray' | 'red'

const sizeMap: Record<SpinnerSize, { px: number; thickness: number; inset: number }> = {
  xs: { px: 12, thickness: 1.5, inset: 0.9 },
  sm: { px: 14, thickness: 2, inset: 1.05 },
  md: { px: 16, thickness: 2, inset: 1.2 },
  lg: { px: 20, thickness: 2, inset: 1.5 },
}

const themeClasses: Record<SpinnerTheme, string> = {
  gray: 'text-ink-gray-8',
  red: 'text-ink-red-8',
}

export interface SpinnerProps extends Omit<SVGAttributes<SVGSVGElement>, 'size'> {
  size?: SpinnerSize
  theme?: SpinnerTheme
  track?: boolean
}

export function Spinner({ size, theme, track = false, className, style, ...rest }: SpinnerProps) {
  const metrics = size ? sizeMap[size] : undefined
  const sizing = metrics
    ? ({
        width: `${metrics.px}px`,
        height: `${metrics.px}px`,
        '--fui-spinner-thickness': `${metrics.thickness}px`,
        '--fui-spinner-mask-thickness': `${metrics.thickness}px`,
        '--fui-spinner-inset': `${metrics.inset}px`,
      } as CSSProperties)
    : undefined

  return (
    <svg
      width="16"
      height="16"
      role="status"
      aria-label="Loading"
      className={cn(
        'fui-spinner inline-block shrink-0',
        theme && themeClasses[theme],
        track && 'fui-spinner--track',
        className,
      )}
      style={{ ...sizing, ...style }}
      {...rest}
    />
  )
}
