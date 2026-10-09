import type { ReactNode } from 'react'
import { Tooltip, cn } from '@/design-system'
import { ModuleIcon } from '@/shared/components/ModuleIcon'
import { Icon } from '@/shared/components/Icon'
import type { DockEntry } from '@/shared/utils/deskShell'

export interface DockRailProps {
  logo: string | null
  logoIcon?: string
  appTitle: string
  entries: DockEntry[]
  activeShell: string | undefined
  onSelect: (entry: DockEntry) => void
  onLogo: () => void
  footer?: ReactNode
}

export function DockRail({ logo, logoIcon, appTitle, entries, activeShell, onSelect, onLogo, footer }: DockRailProps) {
  return (
    <nav className="flex h-full w-14 shrink-0 flex-col items-center gap-1 overflow-y-auto border-r border-outline-gray-1 bg-surface-gray-1 py-2">
      <Tooltip text={appTitle} placement="right">
        <button
          type="button"
          aria-label={appTitle}
          onClick={onLogo}
          className="mb-1 flex size-8 items-center justify-center overflow-hidden rounded-lg"
        >
          {logo ? (
            <img src={logo} alt="" className="size-8" />
          ) : (
            <Icon icon={logoIcon ?? 'lucide-box'} className="size-5 text-ink-gray-7" />
          )}
        </button>
      </Tooltip>
      <div className="mb-1 h-px w-6 bg-outline-gray-2" />
      {entries.map((entry) => {
        const active = entry.link_to === activeShell
        return (
          <Tooltip key={entry.link_to} text={entry.title} placement="right">
            <button
              type="button"
              aria-label={entry.title}
              aria-current={active ? 'true' : undefined}
              onClick={() => onSelect(entry)}
              className={cn(
                'flex size-10 shrink-0 items-center justify-center rounded-lg transition-colors',
                active ? 'bg-surface-gray-3' : 'hover:bg-surface-gray-2',
              )}
            >
              <ModuleIcon name={entry.icon} className="size-5" />
            </button>
          </Tooltip>
        )
      })}
      {footer && <div className="mt-auto flex shrink-0 items-center justify-center pt-2">{footer}</div>}
    </nav>
  )
}
