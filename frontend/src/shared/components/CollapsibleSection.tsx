import { useState, type ReactNode } from 'react'
import { __ } from '@/core/i18n'
import { Badge, cn } from '@/design-system'
import { Icon } from './Icon'

export interface CollapsibleSectionApi {
  opened: boolean
  hide: boolean
  open: () => void
  close: () => void
  toggle: () => void
}

export interface CollapsibleSectionProps {
  label?: string
  count?: string | number
  countVariant?: 'solid' | 'subtle' | 'outline' | 'ghost'
  countTheme?: 'gray' | 'blue' | 'green' | 'orange' | 'red'
  hideLabel?: boolean
  opened?: boolean
  collapsible?: boolean
  collapseIconPosition?: 'left' | 'right'
  labelClass?: string
  headerClass?: string
  className?: string
  header?: (api: CollapsibleSectionApi) => ReactNode
  actions?: ReactNode
  children?: ReactNode | ((api: Omit<CollapsibleSectionApi, 'hide'>) => ReactNode)
}

function Chevron({ opened }: { opened: boolean }) {
  return (
    <Icon
      icon="lucide-chevron-right"
      className={cn('size-4 transition-all duration-300 ease-in-out', opened && 'rotate-90')}
    />
  )
}

export function CollapsibleSection({
  label = '',
  count = '',
  countVariant = 'subtle',
  countTheme = 'gray',
  hideLabel = false,
  opened: initialOpened = true,
  collapsible = true,
  collapseIconPosition = 'left',
  labelClass,
  headerClass,
  className,
  header,
  actions,
  children,
}: CollapsibleSectionProps) {
  const [opened, setOpened] = useState(initialOpened)
  const api: CollapsibleSectionApi = {
    opened,
    hide: hideLabel,
    open: () => setOpened(true),
    close: () => setOpened(false),
    toggle: () => setOpened((value) => !value),
  }

  return (
    <div>
      {header
        ? header(api)
        : !hideLabel && (
            <div className={cn('section-header flex items-center justify-between', headerClass)}>
              <div
                className={cn('flex max-w-fit cursor-pointer items-center gap-2 text-base text-ink-gray-9', labelClass)}
                onClick={() => collapsible && api.toggle()}
              >
                {collapsible && collapseIconPosition === 'left' && <Chevron opened={opened} />}
                <span>{__(label) || __('Untitled')}</span>
                {count !== '' && count !== 0 && (
                  <Badge label={String(count)} variant={countVariant} theme={countTheme} />
                )}
                {collapsible && collapseIconPosition === 'right' && <Chevron opened={opened} />}
              </div>
              {actions}
            </div>
          )}
      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-300 ease-in',
          opened ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <div className={cn('columns min-h-0', !opened && 'overflow-hidden', className)}>
          {typeof children === 'function'
            ? children({ opened, open: api.open, close: api.close, toggle: api.toggle })
            : children}
        </div>
      </div>
    </div>
  )
}
