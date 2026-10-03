import type { ReactNode } from 'react'
import { Icon, type IconSource } from '../../icons'
import { cn } from '../../utils/cn'

export type PillSize = 'sm' | 'md'
export type PillVariant = 'default' | 'outline' | 'underline' | 'browser-tab'
export type BrowserTabBase = 'none' | 'default' | 'left' | 'right'
export type PillOrientation = 'horizontal' | 'vertical'
export type PillActiveStyle = 'raised' | 'subtle'

export interface PillProps {
  label?: string | number
  variant?: PillVariant
  size?: PillSize
  active?: boolean
  icon?: IconSource
  iconLeft?: IconSource
  iconRight?: IconSource
  browserTabBase?: BrowserTabBase
  orientation?: PillOrientation
  activeStyle?: PillActiveStyle
  prefix?: ReactNode
  suffix?: ReactNode
  className?: string
  children?: ReactNode
}

function hasLabel(label: PillProps['label']) {
  return label !== undefined && label !== null && label !== ''
}

function radiusClass(variant: PillVariant, size: PillSize, base: BrowserTabBase) {
  if (variant === 'underline') return ''
  const small = size === 'sm'
  if (variant === 'browser-tab') {
    if (base === 'left') return small ? 'rounded-r-[7px]' : 'rounded-r-[9px]'
    if (base === 'right') return small ? 'rounded-l-[7px]' : 'rounded-l-[9px]'
    if (base === 'default') return small ? 'rounded-t-[7px]' : 'rounded-t-[9px]'
  }
  return small ? 'rounded-[7px]' : 'rounded-[9px]'
}

function variantClass(
  variant: PillVariant,
  active: boolean,
  base: BrowserTabBase,
  orientation: PillOrientation,
  activeStyle: PillActiveStyle,
) {
  if (variant === 'underline') {
    const vertical = orientation === 'vertical'
    const rail = vertical ? 'border-r border-transparent' : 'border-b border-transparent'
    if (active) {
      const indicator = vertical
        ? 'after:absolute after:inset-y-1.5 after:-right-0.5 after:w-px after:bg-[var(--ink-gray-8)]'
        : 'after:absolute after:inset-x-0 after:-bottom-px after:h-px after:bg-[var(--ink-gray-8)]'
      return ['relative', rail, indicator].join(' ')
    }
    return [rail, 'hover:text-ink-gray-7'].join(' ')
  }

  if (variant === 'browser-tab') {
    if (!active) return 'border border-transparent hover:bg-surface-gray-2 hover:text-ink-gray-7'
    if (base === 'left') {
      return 'relative border border-l-0 border-outline-gray-2 bg-surface-base after:absolute after:-left-[3px] after:-top-px after:-bottom-px after:w-[3px] after:bg-surface-base'
    }
    if (base === 'right') {
      return 'relative border border-r-0 border-outline-gray-2 bg-surface-base after:absolute after:-right-[3px] after:-top-px after:-bottom-px after:w-[3px] after:bg-surface-base'
    }
    return 'relative border border-b-0 border-outline-gray-2 bg-surface-base after:absolute after:-inset-x-px after:-bottom-[3px] after:h-[3px] after:bg-surface-base'
  }

  if (variant === 'outline') {
    return active
      ? 'border border-transparent bg-surface-base shadow-sm'
      : 'border border-outline-gray-1 hover:bg-surface-gray-2 hover:text-ink-gray-7'
  }

  if (!active) return 'hover:bg-surface-gray-3/80 hover:text-ink-gray-7'
  return activeStyle === 'subtle' ? 'bg-surface-gray-2' : 'bg-surface-elevation-3 shadow-base'
}

export function Pill({
  label,
  variant = 'default',
  size = 'md',
  active = false,
  icon,
  iconLeft,
  iconRight,
  browserTabBase = 'none',
  orientation = 'horizontal',
  activeStyle = 'raised',
  prefix,
  suffix,
  className,
  children,
}: PillProps) {
  const small = size === 'sm'
  const iconOnly = Boolean(icon)
  const iconClass = small ? 'size-4 shrink-0' : 'size-[18px] shrink-0'

  const sizing = iconOnly
    ? small
      ? 'size-6.5 gap-1.5 p-[5px]'
      : 'size-7 gap-1.5 p-[5px]'
    : variant === 'underline'
      ? orientation === 'vertical'
        ? small
          ? 'h-7 gap-2 pr-2'
          : 'h-7.5 gap-2 pr-2'
        : small
          ? 'h-7 gap-2'
          : 'h-7.5 gap-2'
      : small
        ? 'h-6.5 gap-2 px-2 py-[5px]'
        : 'h-7 gap-2 px-2.5 py-1.5'

  return (
    <span
      data-state={active ? 'active' : 'inactive'}
      className={cn(
        'inline-flex box-border shrink-0 select-none items-center justify-center whitespace-nowrap text-sm leading-[16.1px] outline-none transition-[background-color,color,box-shadow,border-color] duration-150 ease-out motion-reduce:transition-none',
        active ? (variant === 'underline' ? 'text-ink-gray-8 font-medium' : 'text-ink-gray-8') : 'text-ink-gray-5',
        sizing,
        radiusClass(variant, size, browserTabBase),
        variantClass(variant, active, browserTabBase, orientation, activeStyle),
        className,
      )}
    >
      {prefix ??
        (icon ? (
          <Icon source={icon} className={iconClass} />
        ) : iconLeft ? (
          <Icon source={iconLeft} className={iconClass} />
        ) : null)}
      {(hasLabel(label) || children) && (
        <span className={cn('min-w-0 truncate', iconOnly && 'sr-only')}>{children ?? label}</span>
      )}
      {suffix ?? (iconRight && !iconOnly ? <Icon source={iconRight} className={iconClass} /> : null)}
    </span>
  )
}
