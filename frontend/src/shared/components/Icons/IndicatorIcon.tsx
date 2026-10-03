import type { SVGProps } from 'react'

export interface IndicatorIconProps extends SVGProps<SVGSVGElement> {
  fill?: string
  filled?: boolean
}

export function IndicatorIcon({ filled = false, className, ...props }: IndicatorIconProps) {
  if (!filled) {
    return (
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        {...props}
      >
        <circle cx="8" cy="8" r="3.5" fill="currentColor" stroke="currentColor" strokeWidth="1" />
      </svg>
    )
  }
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <circle cx="8" cy="8" r="4.5" fill="currentColor" stroke="currentColor" strokeWidth="3" />
    </svg>
  )
}
