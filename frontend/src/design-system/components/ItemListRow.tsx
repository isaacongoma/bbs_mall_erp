import type { ElementType, HTMLAttributes, ReactNode } from 'react'
import { cn } from '../utils/cn'

export type ItemListRowSize = 'sm' | 'md' | 'lg' | 'xl'

const sizeClasses: Record<ItemListRowSize, string> = {
  sm: 'min-h-7 px-2 py-1.5 text-base',
  md: 'min-h-8 px-2.5 py-1.5 text-base',
  lg: 'min-h-10 px-3 py-2 text-lg',
  xl: 'min-h-10 px-3 py-2 text-2xl',
}

export interface ItemListRowProps extends Omit<HTMLAttributes<HTMLElement>, 'prefix'> {
  as?: ElementType
  size?: ItemListRowSize
  active?: boolean
  selected?: boolean
  disabled?: boolean
  prefix?: ReactNode
  suffix?: ReactNode
}

export function ItemListRow({
  as: Tag = 'div',
  size = 'sm',
  active = false,
  selected = false,
  disabled = false,
  prefix,
  suffix,
  className,
  children,
  ...rest
}: ItemListRowProps) {
  const emphasized = active || selected
  const stateClasses = disabled
    ? 'cursor-not-allowed text-ink-gray-4'
    : emphasized
      ? 'bg-surface-gray-3 text-ink-gray-8'
      : 'text-ink-gray-7'

  return (
    <Tag
      data-slot="item-list-row"
      data-size={size}
      data-state={emphasized ? 'active' : 'inactive'}
      data-disabled={disabled ? '' : undefined}
      className={cn(
        'flex w-full items-center gap-2 rounded transition-colors',
        sizeClasses[size],
        stateClasses,
        className,
      )}
      {...rest}
    >
      {prefix && (
        <div data-slot="item-prefix" className="flex shrink-0 items-center justify-center">
          {prefix}
        </div>
      )}
      <div data-slot="item-label" className="min-w-0 flex-1">
        {children}
      </div>
      {suffix && (
        <div data-slot="item-suffix" className="flex shrink-0 items-center justify-center">
          {suffix}
        </div>
      )}
    </Tag>
  )
}
