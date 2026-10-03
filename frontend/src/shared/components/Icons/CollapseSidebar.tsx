import type { SVGProps } from 'react'

export function CollapseSidebar({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"

      className={className}
      {...props}
    >
      <path d="M10.875 9.06223L3 9.06232" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M6.74537 5.31699L3 9.06236L6.74527 12.8076"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M14.1423 4L14.1423 14.125" stroke="currentColor" strokeLinecap="round" />
    </svg>
  )
}
