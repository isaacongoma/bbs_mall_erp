import type { ReactNode } from 'react'

export interface TimelineGutterProps {
  isLast: boolean
  children: ReactNode
  className?: string
}

export function TimelineGutter({ isLast, children, className = '' }: TimelineGutterProps) {
  return (
    <div
      className={`relative z-0 flex justify-center before:absolute before:left-[50%] before:top-0 before:-z-[1] before:border-l before:border-outline-elevation-2 ${
        isLast ? 'before:h-4' : 'before:h-full'
      } ${className}`}
    >
      {children}
    </div>
  )
}
