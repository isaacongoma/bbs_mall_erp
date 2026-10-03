import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../utils/cn'

export type BadgeTheme = 'gray' | 'blue' | 'green' | 'amber' | 'orange' | 'red' | 'violet'
export type BadgeSize = 'sm' | 'md' | 'lg'
export type BadgeVariant = 'solid' | 'subtle' | 'outline' | 'ghost'

const themeClasses: Record<Exclude<BadgeTheme, 'orange'>, Record<BadgeVariant, string>> = {
  gray: {
    solid: 'text-ink-base bg-surface-gray-10',
    subtle: 'text-ink-gray-6 bg-surface-gray-2',
    outline: 'text-ink-gray-6 border border-outline-gray-2',
    ghost: 'text-ink-gray-6',
  },
  blue: {
    solid: 'text-ink-blue-1 bg-surface-blue-7',
    subtle: 'text-ink-blue-8 bg-surface-blue-2',
    outline: 'text-ink-blue-8 border border-outline-blue-3',
    ghost: 'text-ink-blue-8',
  },
  green: {
    solid: 'text-ink-green-1 bg-surface-green-7',
    subtle: 'text-ink-green-8 bg-surface-green-2',
    outline: 'text-ink-green-8 border border-outline-green-3',
    ghost: 'text-ink-green-8',
  },
  amber: {
    solid: 'text-ink-amber-1 bg-surface-amber-7',
    subtle: 'text-ink-amber-8 bg-surface-amber-2',
    outline: 'text-ink-amber-8 border border-outline-amber-3',
    ghost: 'text-ink-amber-8',
  },
  red: {
    solid: 'text-ink-red-1 bg-surface-red-7',
    subtle: 'text-ink-red-8 bg-surface-red-2',
    outline: 'text-ink-red-8 border border-outline-red-3',
    ghost: 'text-ink-red-8',
  },
  violet: {
    solid: 'text-ink-violet-1 bg-surface-violet-7',
    subtle: 'text-ink-violet-8 bg-surface-violet-2',
    outline: 'text-ink-violet-8 border border-outline-violet-3',
    ghost: 'text-ink-violet-8',
  },
}

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'h-4 px-1.5 text-xs',
  md: 'h-5 px-1.5 text-xs',
  lg: 'h-6 px-2 text-[13px] tracking-[0.02em]',
}

export interface BadgeProps extends Omit<HTMLAttributes<HTMLDivElement>, 'prefix'> {
  theme?: BadgeTheme
  size?: BadgeSize
  variant?: BadgeVariant
  label?: string | number
  prefix?: ReactNode
  suffix?: ReactNode
}

export function Badge({
  theme = 'gray',
  size = 'md',
  variant = 'subtle',
  label,
  prefix,
  suffix,
  className,
  children,
  ...rest
}: BadgeProps) {
  const resolvedTheme = theme === 'orange' ? 'amber' : theme
  const iconSize = size === 'lg' ? 'size-3' : 'size-2.5'

  return (
    <div
      className={cn(
        'inline-flex select-none items-center gap-1 overflow-clip rounded-full whitespace-nowrap',
        themeClasses[resolvedTheme][variant],
        sizeClasses[size],
        className,
      )}
      {...rest}
    >
      {prefix && <div className={cn('inline-flex shrink-0 items-center justify-center', iconSize)}>{prefix}</div>}
      {children ?? label?.toString()}
      {suffix && <div className={cn('inline-flex shrink-0 items-center justify-center', iconSize)}>{suffix}</div>}
    </div>
  )
}
