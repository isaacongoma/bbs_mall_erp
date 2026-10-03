import { createElement } from 'react'
import { cn } from '../utils/cn'
import { FeatherIcon } from './FeatherIcon'
import { isEmojiIconString, isLucideIconString } from '../utils/iconString'
import { LucideIcon } from './LucideIcon'
import type { IconSource } from '../types/icons'

export interface IconProps {
  source: IconSource
  className?: string
  hidden?: boolean
}

export function Icon({ source, className, hidden }: IconProps) {
  if (typeof source === 'string') {
    if (isLucideIconString(source)) return <LucideIcon name={source} className={className} />
    if (isEmojiIconString(source)) {
      return (
        <span
          aria-hidden="true"
          className={cn('inline-flex items-center justify-center text-base leading-none', className)}
        >
          {source}
        </span>
      )
    }
    return <FeatherIcon name={source} className={className} aria-hidden={hidden ? true : undefined} />
  }
  return createElement(source, { className })
}
