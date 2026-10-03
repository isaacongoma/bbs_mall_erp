import { Tooltip, cn } from '@/design-system'
import type { ModuleDefinition } from '@/core/modules/types'
import { Icon } from '@/shared/components/Icon'

export interface ModuleRailProps {
  modules: ModuleDefinition[]
  activeId: string | undefined
  onSelect: (id: string) => void
}

export function ModuleRail({ modules, activeId, onSelect }: ModuleRailProps) {
  return (
    <nav className="flex h-full w-14 shrink-0 flex-col items-center gap-2 overflow-y-auto bg-surface-gray-10 py-3">
      {modules.map((module) => {
        const active = module.id === activeId
        return (
          <Tooltip key={module.id} text={module.label} placement="right">
            <button
              type="button"
              aria-label={module.label}
              aria-current={active ? 'true' : undefined}
              onClick={() => onSelect(module.id)}
              className={cn(
                'group relative flex w-12 flex-col items-center gap-0.5 rounded-xl py-1.5 text-ink-gray-5 transition-colors duration-200 hover:text-ink-base',
                active && 'text-ink-base',
              )}
            >
              <span
                className={cn(
                  'absolute -left-1 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-surface-base transition-opacity duration-200',
                  active ? 'opacity-100' : 'opacity-0',
                )}
                aria-hidden="true"
              />
              <span
                className={cn(
                  'flex size-8 items-center justify-center rounded-lg transition-colors duration-200',
                  active ? 'bg-white/15' : 'group-hover:bg-white/10',
                )}
              >
                {module.icon && <Icon icon={module.icon} className="size-[18px]" />}
              </span>
              <span className="max-w-full truncate text-[9px] font-semibold uppercase tracking-wider">
                {module.label}
              </span>
            </button>
          </Tooltip>
        )
      })}
    </nav>
  )
}
