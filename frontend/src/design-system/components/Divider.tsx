import { Button } from './Button'
import { cn } from '../utils/cn'

export interface DividerAction {
  label: string
  loading?: boolean
  onClick?: () => void
}

export interface DividerProps {
  orientation?: 'horizontal' | 'vertical'
  position?: 'start' | 'center' | 'end'
  flexItem?: boolean
  action?: DividerAction
  className?: string
}

const horizontalPosition = {
  center: 'justify-center',
  start: 'justify-start pl-4',
  end: 'justify-end pr-4',
}

const verticalPosition = {
  center: 'items-center',
  start: 'items-start pt-4',
  end: 'items-end pb-4',
}

export function Divider({
  orientation = 'horizontal',
  position = 'center',
  flexItem = false,
  action,
  className,
}: DividerProps) {
  if (!action) {
    const dimension = orientation === 'horizontal' ? 'border-t-[1px] w-full' : 'border-l-[1px]'
    return (
      <hr
        className={cn(
          'border-0 border-outline-gray-2',
          dimension,
          flexItem ? 'self-stretch h-auto' : 'h-full',
          className,
        )}
      />
    )
  }

  const lineClasses =
    orientation === 'horizontal'
      ? 'inset-x-0 top-1/2 -translate-y-1/2 border-t-[1px]'
      : 'inset-y-0 left-1/2 -translate-x-1/2 border-l-[1px]'

  const containerClasses =
    orientation === 'horizontal'
      ? cn('flex w-full min-h-7 items-center', horizontalPosition[position])
      : cn('flex justify-center', flexItem ? 'self-stretch' : 'h-full', verticalPosition[position])

  return (
    <div className={cn('relative whitespace-nowrap border-0 border-outline-gray-2', containerClasses, className)}>
      <div
        role="separator"
        aria-orientation={orientation}
        className={cn('absolute border-0 border-outline-gray-2', lineClasses)}
      />
      <Button
        label={action.label}
        loading={action.loading}
        className="relative z-10"
        size="sm"
        variant="outline"
        onClick={action.onClick}
      />
    </div>
  )
}
