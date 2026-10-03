import type { SVGProps } from 'react'

export interface DotIconProps extends SVGProps<SVGSVGElement> {
  radius?: number
}

export function DotIcon({ radius = 3.5, className, ...props }: DotIconProps) {
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
      <circle cx="8" cy="8" r={radius} fill="currentColor" />
    </svg>
  )
}
