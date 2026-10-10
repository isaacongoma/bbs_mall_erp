import type { ReactNode } from 'react'
import { Badge, Button, cn, LucideIcon, Spinner } from '@/design-system'
import { statusTheme } from '../utils/format'

export function Card({
  title,
  action,
  children,
  className,
  bodyClassName,
}: {
  title?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
}) {
  return (
    <section className={cn('rounded-2xl border border-outline-gray-2 bg-surface-base shadow-sm', className)}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 px-5 pb-1 pt-4">
          <h2 className="text-[15px] font-semibold text-ink-gray-9">{title}</h2>
          {action}
        </header>
      )}
      <div className={cn('p-5', title || action ? 'pt-3' : '', bodyClassName)}>{children}</div>
    </section>
  )
}

const TONES: Record<string, string> = {
  gold: 'bg-[#b8860b]/12 text-[#8a6508]',
  green: 'bg-[#16a34a]/12 text-[#15803d]',
  red: 'bg-[#dc2626]/12 text-[#b91c1c]',
  blue: 'bg-[#2563eb]/12 text-[#1d4ed8]',
  violet: 'bg-[#7c3aed]/12 text-[#6d28d9]',
  gray: 'bg-surface-gray-2 text-ink-gray-7',
}

export function IconTile({
  icon,
  tone = 'gold',
  className,
}: {
  icon: string
  tone?: keyof typeof TONES
  className?: string
}) {
  return (
    <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl', TONES[tone], className)}>
      <LucideIcon name={icon} className="size-5" />
    </span>
  )
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = 'gold',
  emphasis,
  onClick,
}: {
  label: string
  value: ReactNode
  hint?: ReactNode
  icon: string
  tone?: keyof typeof TONES
  emphasis?: boolean
  onClick?: () => void
}) {
  const Wrapper = onClick ? 'button' : 'div'
  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'flex items-start gap-3 rounded-2xl border border-outline-gray-2 bg-surface-base p-4 text-left shadow-sm transition',
        onClick && 'hover:-translate-y-0.5 hover:shadow-md',
        emphasis && 'border-[#b8860b]/40 bg-linear-to-br from-[#fff9e8] to-surface-base dark:from-[#2a2208]',
      )}
    >
      <IconTile icon={icon} tone={tone} className="hidden sm:flex" />
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-gray-5">{label}</p>
        <p className="mt-0.5 text-lg font-semibold text-ink-gray-9 sm:truncate sm:text-xl">{value}</p>
        {hint && <p className="mt-0.5 text-xs text-ink-gray-5">{hint}</p>}
      </div>
    </Wrapper>
  )
}

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  return <Badge theme={statusTheme(status)} label={label ?? status} size="md" />
}

export function EmptyState({
  icon,
  title,
  message,
  action,
}: {
  icon: string
  title: string
  message?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-surface-gray-2 text-ink-gray-5">
        <LucideIcon name={icon} className="size-6" />
      </span>
      <div>
        <p className="text-base font-semibold text-ink-gray-8">{title}</p>
        {message && <p className="mt-1 max-w-sm text-sm text-ink-gray-5">{message}</p>}
      </div>
      {action}
    </div>
  )
}

export function Loading({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-sm text-ink-gray-5">
      <Spinner className="size-5" />
      {label}
    </div>
  )
}

export function ErrorPanel({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-[#dc2626]/30 bg-[#dc2626]/5 px-6 py-10 text-center">
      <LucideIcon name="triangle-alert" className="size-6 text-[#dc2626]" />
      <p className="max-w-md text-sm text-ink-gray-7">{message}</p>
      {onRetry && <Button label="Try again" variant="subtle" onClick={onRetry} />}
    </div>
  )
}

export function PageHeading({
  title,
  subtitle,
  actions,
}: {
  title: string
  subtitle?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-gray-9">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-gray-5">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function KeyValue({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-outline-gray-1 py-2 last:border-0">
      <dt className="text-sm text-ink-gray-5">{label}</dt>
      <dd className="text-right text-sm font-medium text-ink-gray-9">{children}</dd>
    </div>
  )
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
}) {
  return (
    <div className="inline-flex rounded-xl bg-surface-gray-2 p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            'rounded-lg px-3 py-1.5 text-sm font-medium transition',
            value === option.value
              ? 'bg-surface-base text-ink-gray-9 shadow-sm'
              : 'text-ink-gray-6 hover:text-ink-gray-8',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
