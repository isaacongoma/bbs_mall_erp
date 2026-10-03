import { createElement, type ComponentPropsWithRef, type ReactNode } from 'react'
import { Link, type To } from 'react-router-dom'
import { Icon } from '../icons'
import type { IconSource } from '../icons'
import { cn } from '../utils/cn'
import { Spinner } from './Spinner'
import { Tooltip } from './Tooltip'

export type ButtonTheme = 'gray' | 'blue' | 'green' | 'red'
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg'
export type ButtonVariant = 'solid' | 'subtle' | 'outline' | 'ghost'
type ThemeVariant = `${ButtonTheme}-${ButtonVariant}`

const solid: Record<ButtonTheme, string> = {
  gray: 'text-ink-base bg-surface-gray-10 hover:bg-surface-gray-9 active:bg-surface-gray-8',
  blue: 'text-ink-base bg-surface-blue-6 hover:bg-surface-blue-7 active:bg-surface-blue-8',
  green: 'text-ink-base bg-surface-green-7 hover:bg-surface-green-8 active:bg-surface-green-9',
  red: 'text-ink-base bg-surface-red-7 hover:bg-surface-red-8 active:bg-surface-red-9',
}

const subtle: Record<ButtonTheme, string> = {
  gray: 'text-ink-gray-8 bg-surface-gray-2 hover:bg-surface-gray-3 active:bg-surface-gray-4',
  blue: 'text-ink-blue-6 bg-surface-blue-2 hover:bg-surface-blue-3 active:bg-surface-blue-4',
  green: 'text-ink-green-9 bg-surface-green-2 hover:bg-surface-green-3 active:bg-surface-green-4',
  red: 'text-ink-red-8 bg-surface-red-2 hover:bg-surface-red-3 active:bg-surface-red-4',
}

const outline: Record<ButtonTheme, string> = {
  gray: 'text-ink-gray-8 bg-surface-base border border-outline-gray-2 hover:border-outline-gray-3 active:border-outline-gray-3 active:bg-surface-gray-4',
  blue: 'text-ink-blue-6 bg-surface-base border border-outline-blue-1 hover:border-outline-blue-4 active:border-outline-blue-4 active:bg-surface-blue-4',
  green:
    'text-ink-green-9 bg-surface-base border border-outline-green-3 hover:border-outline-green-5 active:border-outline-green-5 active:bg-surface-green-4',
  red: 'text-ink-red-8 bg-surface-base border border-outline-red-1 hover:border-outline-red-3 active:border-outline-red-3 active:bg-surface-red-3',
}

const ghost: Record<ButtonTheme, string> = {
  gray: 'text-ink-gray-8 bg-transparent hover:bg-surface-gray-3 active:bg-surface-gray-4',
  blue: 'text-ink-blue-6 bg-transparent hover:bg-surface-blue-3 active:bg-surface-blue-4',
  green: 'text-ink-green-9 bg-transparent hover:bg-surface-green-3 active:bg-surface-green-4',
  red: 'text-ink-red-8 bg-transparent hover:bg-surface-red-3 active:bg-surface-red-4',
}

const variantClasses: Record<ButtonVariant, Record<ButtonTheme, string>> = { solid, subtle, outline, ghost }

const focusClasses: Record<ButtonTheme, string> = {
  gray: '',
  blue: 'focus-visible:focus-ring-blue',
  green: 'focus-visible:focus-ring-green',
  red: 'focus-visible:focus-ring-red',
}

const disabledClasses: Record<ThemeVariant, string> = {
  'gray-solid': 'bg-surface-gray-2 text-ink-gray-4',
  'gray-subtle': 'bg-surface-gray-2 text-ink-gray-4',
  'gray-outline': 'bg-surface-gray-2 text-ink-gray-4 border border-outline-gray-2',
  'gray-ghost': 'text-ink-gray-4',
  'blue-solid': 'bg-surface-blue-4 text-ink-base',
  'blue-subtle': 'bg-surface-blue-2 text-ink-blue-link',
  'blue-outline': 'bg-surface-blue-2 text-ink-blue-link border border-outline-blue-1',
  'blue-ghost': 'text-ink-blue-link',
  'green-solid': 'bg-surface-green-2 text-ink-green-5',
  'green-subtle': 'bg-surface-green-2 text-ink-green-5',
  'green-outline': 'bg-surface-green-2 text-ink-green-5 border border-outline-green-3',
  'green-ghost': 'text-ink-green-5',
  'red-solid': 'bg-surface-red-2 text-ink-red-5',
  'red-subtle': 'bg-surface-red-2 text-ink-red-5',
  'red-outline': 'bg-surface-red-2 text-ink-red-5 border border-outline-red-1',
  'red-ghost': 'text-ink-red-5',
}

const iconButtonSizes: Record<ButtonSize, string> = {
  xs: 'h-6 w-6 rounded-3',
  sm: 'h-7 w-7 rounded-4',
  md: 'h-8 w-8 rounded-4',
  lg: 'h-10 w-10 rounded-5',
}

const textButtonSizes: Record<ButtonSize, string> = {
  xs: 'h-6 text-xs px-1.5 rounded-3',
  sm: 'h-7 text-base px-2 rounded-4',
  md: 'h-8 text-base-medium px-2.5 rounded-4',
  lg: 'h-10 text-lg-medium px-3 rounded-5',
}

const iconSlotSizes: Record<ButtonSize, string> = {
  xs: 'h-3.5',
  sm: 'h-4',
  md: 'h-4.5',
  lg: 'h-5',
}

const lucideSlotSizes: Record<ButtonSize, string> = {
  xs: 'size-3.5',
  sm: 'size-4',
  md: 'size-4.5',
  lg: 'size-5',
}

const spinnerSizes: Record<ButtonSize, string> = {
  xs: 'size-3.5',
  sm: 'size-4',
  md: 'size-4.5',
  lg: 'size-5',
}

export interface ButtonProps extends Omit<ComponentPropsWithRef<'button'>, 'type' | 'prefix'> {
  theme?: ButtonTheme
  size?: ButtonSize
  variant?: ButtonVariant
  label?: string
  icon?: IconSource
  iconLeft?: IconSource
  iconRight?: IconSource
  iconSlot?: ReactNode
  prefix?: ReactNode
  suffix?: ReactNode
  tooltip?: string
  loading?: boolean
  loadingText?: string
  to?: To
  link?: string
  type?: 'button' | 'submit' | 'reset'
}

export function Button({
  theme = 'gray',
  size = 'sm',
  variant = 'subtle',
  label,
  icon,
  iconLeft,
  iconRight,
  iconSlot,
  prefix,
  suffix,
  tooltip,
  loading = false,
  loadingText,
  disabled = false,
  to,
  link,
  type = 'button',
  className,
  children,
  ...rest
}: ButtonProps) {
  const inactive = disabled || loading
  const isIconButton = Boolean(icon) || iconSlot !== undefined

  const classes = cn(
    'inline-flex items-center justify-center gap-2 transition-colors shrink-0',
    disabled ? disabledClasses[`${theme}-${variant}`] : variantClasses[variant][theme],
    loading && !disabled && 'pointer-events-none',
    focusClasses[theme],
    isIconButton ? iconButtonSizes[size] : textButtonSizes[size],
    className,
  )

  const renderIcon = (source: IconSource | undefined, hidden: boolean) => {
    if (!source) return null
    if (typeof source === 'string' && source.startsWith('lucide-')) {
      return <Icon source={source} className={lucideSlotSizes[size]} />
    }
    if (typeof source === 'string') return <Icon source={source} className={iconSlotSizes[size]} hidden={hidden} />
    return createElement(source, { className: iconSlotSizes[size] })
  }

  const renderPrefix = () => {
    if (loading) return <Spinner className={spinnerSizes[size]} />
    if (prefix) return prefix
    return renderIcon(iconLeft, true)
  }

  const renderMain = () => {
    if (loading && loadingText) return loadingText
    if (isIconButton && !loading) {
      if (icon) return renderIcon(icon, false)
      return iconSlot
    }
    return <span className={cn('truncate', isIconButton && 'sr-only')}>{children ?? label}</span>
  }

  const content = (
    <>
      {renderPrefix()}
      {renderMain()}
      {suffix ?? renderIcon(iconRight, true)}
    </>
  )

  const commonProps = {
    className: classes,
    'aria-label': label ?? rest['aria-label'] ?? (isIconButton ? tooltip : undefined),
    'aria-busy': loading || undefined,
  }

  let element: ReactNode
  if (!inactive && to !== undefined) {
    element = (
      <Link to={to} {...(rest as object)} {...commonProps}>
        {content}
      </Link>
    )
  } else if (!inactive && link) {
    element = (
      <a href={link} target="_blank" rel="noreferrer noopener" {...(rest as object)} {...commonProps}>
        {content}
      </a>
    )
  } else {
    element = (
      <button type={type} disabled={inactive} {...rest} {...commonProps}>
        {content}
      </button>
    )
  }

  if (!tooltip) return element
  return <Tooltip text={tooltip}>{element as React.ReactElement}</Tooltip>
}
