import type { ReactNode } from 'react'
import { cn } from '@/design-system'
import { __ } from '@/core/i18n'
import { useNumberCardValue } from '../hooks/useNumberCardValue'
import { cardIconFor, cardSubFor } from '../utils/modernDesk'
import type { DeskWorkspace } from '../utils/deskWorkspace'
import { Icon } from './Icon'
import { Shimmer } from './Shimmer'

const DEFAULT_ACCENT = '#b8860b'

export interface ModernStatItem {
  label: ReactNode
  value: ReactNode
  sub?: ReactNode
  icon?: string
  accent?: string
  loading?: boolean
  onClick?: () => void
}

function StatBody({ item }: { item: ModernStatItem }) {
  const accent = item.accent || DEFAULT_ACCENT
  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-6 -top-8 size-24 rounded-full opacity-10 blur-2xl"
        style={{ backgroundColor: accent }}
      />
      <div className="relative min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-gray-5">{item.label}</p>
        <div className="mt-1 flex items-center gap-2">
          {item.icon ? (
            <span
              className="flex size-7 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: `${accent}1f`, color: accent }}
            >
              <Icon icon={item.icon} className="size-3.5" />
            </span>
          ) : null}
          <p className="truncate text-2xl font-bold leading-tight tabular-nums text-ink-gray-9">
            {item.loading ? <Shimmer className="h-7 w-24" /> : item.value}
          </p>
        </div>
        {item.sub ? <p className="mt-0.5 text-[11px] text-ink-gray-5">{item.sub}</p> : null}
      </div>
    </>
  )
}

function tileClass(clickable: boolean) {
  return cn(
    'relative overflow-hidden px-5 py-4 text-left transition-colors hover:bg-surface-gray-1/60',
    clickable && 'cursor-pointer',
  )
}

export function ModernStatCard({ item, className }: { item: ModernStatItem; className?: string }) {
  const Wrapper = item.onClick ? 'button' : 'div'
  return (
    <Wrapper
      type={item.onClick ? 'button' : undefined}
      onClick={item.onClick}
      className={cn(
        'w-full rounded-sm border border-outline-gray-2 bg-white',
        tileClass(Boolean(item.onClick)),
        className,
      )}
    >
      <StatBody item={item} />
    </Wrapper>
  )
}

export function ModernStatStrip({ items, className }: { items: ModernStatItem[]; className?: string }) {
  const columns =
    items.length >= 6
      ? 'lg:grid-cols-6'
      : items.length === 5
        ? 'lg:grid-cols-5'
        : items.length === 4
          ? 'lg:grid-cols-4'
          : items.length === 3
            ? 'lg:grid-cols-3'
            : 'lg:grid-cols-2'
  return (
    <div
      className={cn(
        'grid grid-cols-2 divide-x divide-y divide-outline-gray-2 overflow-hidden rounded-sm border border-outline-gray-2 bg-white',
        items.length <= 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3',
        columns,
        className,
      )}
    >
      {items.map((item, index) => {
        const Wrapper = item.onClick ? 'button' : 'div'
        return (
          <Wrapper
            key={index}
            type={item.onClick ? 'button' : undefined}
            onClick={item.onClick}
            className={tileClass(Boolean(item.onClick))}
          >
            <StatBody item={item} />
          </Wrapper>
        )
      })}
    </div>
  )
}

export function ModernNumberCard({ item }: { item: DeskWorkspace }) {
  const { card, display, loading } = useNumberCardValue(item)
  const label = String(item.label ?? item.number_card_name ?? '')
  return (
    <ModernStatCard
      item={{
        label: __(label),
        value: display,
        sub: cardSubFor(label),
        icon: cardIconFor(label),
        accent: card?.color ? String(card.color) : undefined,
        loading,
      }}
    />
  )
}
