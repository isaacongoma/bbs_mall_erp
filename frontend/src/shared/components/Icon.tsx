import { createElement } from 'react'
import { LucideIcon, cn } from '@/design-system'
import type { IconSource } from '@/design-system'
import { isEmoji } from '../utils/emoji'

export interface IconProps {
  icon: IconSource
  className?: string
}

export function Icon({ icon, className }: IconProps) {
  if (typeof icon === 'string') {
    if (isEmoji(icon)) return <div className={className}>{icon}</div>
    return <LucideIcon name={icon.replace(/^lucide-/, '')} className={cn('shrink-0', className)} strokeWidth={1.5} />
  }
  return createElement(icon, { className })
}
