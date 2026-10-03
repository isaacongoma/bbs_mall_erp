import type { ReactNode } from 'react'
import { cn } from '@/design-system'

export interface SettingsPanelProps {
  title: string
  description?: string
  actions?: ReactNode
  className?: string
  children?: ReactNode
}

export function SettingsPanel({ title, description, actions, className, children }: SettingsPanelProps) {
  return (
    <div className={cn('flex h-full flex-col gap-6 px-6 py-8 text-ink-gray-8', className)}>
      <div className="flex justify-between gap-4 px-2 text-ink-gray-8">
        <div className="flex flex-col gap-1">
          <h2 className="flex h-5 gap-2 text-2xl-semibold leading-none">{title}</h2>
          {description && <p className="text-p-base text-ink-gray-6">{description}</p>}
        </div>
        {actions && <div className="item-center flex w-3/12 justify-end space-x-2">{actions}</div>}
      </div>
      <div className="flex flex-1 flex-col overflow-y-auto">{children}</div>
    </div>
  )
}

export interface SettingRowProps {
  title: string
  description?: string
  divider?: boolean
  children?: ReactNode
}

export function SettingRow({ title, description, divider = false, children }: SettingRowProps) {
  return (
    <>
      <div className="flex items-center justify-between gap-4 px-2 py-3">
        <div className="flex flex-col">
          <div className="truncate text-p-base-medium text-ink-gray-7">{title}</div>
          {description && <div className="text-p-sm text-ink-gray-5">{description}</div>}
        </div>
        <div>{children}</div>
      </div>
      {divider && <div className="mx-2 h-px border-t border-outline-elevation-2" />}
    </>
  )
}

export interface SettingsLayoutBaseProps {
  title: ReactNode
  description?: string
  headerActions?: ReactNode
  headerBottom?: ReactNode
  children?: ReactNode
}

export function SettingsLayoutBase({
  title,
  description,
  headerActions,
  headerBottom,
  children,
}: SettingsLayoutBaseProps) {
  return (
    <div className="flex h-full w-full flex-col text-ink-gray-8">
      <div className="flex items-start justify-between p-8 text-ink-gray-8">
        <div className="flex flex-col gap-1">
          <h2 className="flex h-5 gap-2 text-2xl-semibold leading-none">{title}</h2>
          {description && <p className="text-p-base text-ink-gray-6">{description}</p>}
        </div>
        {headerActions}
      </div>
      {headerBottom && <div className="p-8 pt-0">{headerBottom}</div>}
      <div className="h-full overflow-y-auto p-8 pt-0">{children}</div>
    </div>
  )
}
