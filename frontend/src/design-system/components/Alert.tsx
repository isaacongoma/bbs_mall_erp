import { useState, type ReactNode } from 'react'
import { LucideIcon } from '../icons'
import { cn } from '../utils/cn'

export type AlertTheme = 'yellow' | 'blue' | 'red' | 'green'
export type AlertVariant = 'subtle' | 'outline'

const subtleBackgrounds: Record<AlertTheme, string> = {
  yellow: 'bg-surface-amber-2',
  blue: 'bg-surface-blue-2',
  red: 'bg-surface-red-2',
  green: 'bg-surface-green-2',
}

const themeIcons: Record<AlertTheme, { name: string; className: string }> = {
  yellow: { name: 'triangle-alert', className: 'text-ink-amber-6' },
  blue: { name: 'info', className: 'text-ink-blue-6' },
  red: { name: 'circle-x', className: 'text-ink-red-6' },
  green: { name: 'circle-check', className: 'text-ink-green-6' },
}

export interface AlertProps {
  title?: string
  description?: ReactNode
  theme?: AlertTheme
  variant?: AlertVariant
  dismissible?: boolean
  visible?: boolean
  onVisibleChange?: (visible: boolean) => void
  onDismiss?: () => void
  icon?: ReactNode
  footer?: ReactNode
  className?: string
}

export function Alert({
  title,
  description,
  theme,
  variant = 'subtle',
  dismissible = true,
  visible: controlledVisible,
  onVisibleChange,
  onDismiss,
  icon,
  footer,
  className,
}: AlertProps) {
  const [internalVisible, setInternalVisible] = useState(true)
  const visible = controlledVisible ?? internalVisible
  if (!visible) return null

  const themeIcon = theme ? themeIcons[theme] : null
  const hasIcon = Boolean(icon) || Boolean(themeIcon)
  const surface =
    variant === 'outline' ? 'border border-outline-gray-3' : theme ? subtleBackgrounds[theme] : 'bg-surface-gray-2'

  const dismiss = () => {
    setInternalVisible(false)
    onVisibleChange?.(false)
    onDismiss?.()
  }

  return (
    <div
      role="alert"
      className={cn(
        'grid grid-cols-[auto_1fr_auto] gap-3 rounded-md px-4 py-3.5 text-base items-start',
        surface,
        className,
      )}
    >
      {icon ?? (themeIcon && <LucideIcon name={themeIcon.name} className={cn('size-4', themeIcon.className)} />)}

      <div className={cn('grid gap-2', !hasIcon && 'col-span-2')}>
        <span className="text-ink-gray-9">{title}</span>
        {typeof description === 'string' ? <p className="text-ink-gray-6 prose-sm">{description}</p> : description}
      </div>

      {dismissible && (
        <button type="button" aria-label="Dismiss" onClick={dismiss}>
          <LucideIcon name="x" className="size-4 text-ink-gray-6" />
        </button>
      )}
      {footer}
    </div>
  )
}
