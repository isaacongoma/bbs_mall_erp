import { useEffect } from 'react'
import { cn } from '@/design-system'
import { Icon } from './Icon'
import erpnextSprite from '../assets/desk/erpnext-module-icons.svg?raw'
import frappeSprite from '../assets/desk/frappe-module-icons.svg?raw'
import hrmsSprite from '../assets/desk/hrms-module-icons.svg?raw'
import propertySprite from '../assets/desk/property-module-icons.svg?raw'

const SPRITE_HOST_ID = 'desk-module-icon-sprites'

const LUCIDE_ALIASES: Record<string, string> = {
  'sliders-duotone': 'sliders-horizontal',
}

function ensureSprites(): void {
  if (document.getElementById(SPRITE_HOST_ID)) return
  const host = document.createElement('div')
  host.id = SPRITE_HOST_ID
  host.style.display = 'none'
  host.innerHTML = [erpnextSprite, frappeSprite, hrmsSprite, propertySprite].join('')
  document.body.appendChild(host)
}

export function ModuleIcon({ name, className }: { name?: string | null; className?: string }) {
  useEffect(ensureSprites, [])
  if (!name) return null
  const symbol = typeof document === 'undefined' ? null : document.getElementById(`icon-${name}`)
  if (!symbol && !document.getElementById(SPRITE_HOST_ID)) ensureSprites()
  const present = Boolean(document.getElementById(`icon-${name}`))
  if (present) {
    return (
      <svg
        className={cn('size-5 shrink-0', className)}
        style={
          { '--duotone-light': 'var(--outline-gray-3)', '--duotone-dark': 'var(--ink-gray-6)' } as React.CSSProperties
        }
        aria-hidden="true"
      >
        <use href={`#icon-${name}`} />
      </svg>
    )
  }
  const lucide = LUCIDE_ALIASES[name] ?? name.replace(/-duotone$/, '')
  return <Icon icon={`lucide-${lucide}`} className={cn('size-5 text-ink-gray-6', className)} />
}
