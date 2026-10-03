import { __ } from '@/core/i18n'
import { cn } from '@/design-system'
import { Icon, type IconProps } from '../Icon'

export interface EmptyStateProps {
  name: string
  title?: string
  description?: string
  icon?: IconProps['icon']
  top?: string
  width?: 'sm' | 'md' | 'lg'
}

const WIDTH_CLASSES = { sm: 'w-2/12', md: 'w-4/12', lg: 'w-8/12' } as const

export function EmptyState({
  name,
  title = '',
  description = '',
  icon = 'file-text',
  top = '35%',
  width = 'md',
}: EmptyStateProps) {
  const computedTitle = title || __('No {0} Found', [__(name)])
  const computedDescription =
    description ||
    __('It appears that there are currently no {0} available. You can create more {0} by using the Create button.', [
      __(name),
    ])

  return (
    <div className="relative flex h-full w-full justify-center">
      <div
        className={cn('absolute left-1/2 flex -translate-x-1/2 flex-col items-center gap-3', WIDTH_CLASSES[width])}
        style={{ top }}
      >
        <Icon icon={icon} className="size-7.5 text-ink-gray-5" />
        <div className="flex flex-col items-center gap-1">
          <span className="text-lg-medium text-ink-gray-8">{computedTitle}</span>
          <span className="text-center text-p-base text-ink-gray-6">{computedDescription}</span>
        </div>
      </div>
    </div>
  )
}
