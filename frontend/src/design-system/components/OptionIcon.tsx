import { createElement } from 'react'
import { isEmojiIconString, isLucideIconString, LucideIcon, type IconSource } from '../icons'

export interface OptionIconProps {
  icon?: IconSource | null
}

export function OptionIcon({ icon }: OptionIconProps) {
  if (!icon) return null
  if (isLucideIconString(icon)) return <LucideIcon name={icon} className="size-4 shrink-0 text-ink-gray-6" />
  if (isEmojiIconString(icon)) {
    return (
      <span
        aria-hidden="true"
        className="inline-flex size-4 shrink-0 items-center justify-center text-base leading-none"
      >
        {icon}
      </span>
    )
  }
  if (typeof icon !== 'string') return createElement(icon, { className: 'size-4 shrink-0 text-ink-gray-6' })
  return null
}
