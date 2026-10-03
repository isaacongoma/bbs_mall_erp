import { cn } from '@/design-system'
import type { SVGProps } from 'react'

export function CheckIcon({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"

      className={cn('lucide lucide-check', className)}
      {...props}
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}
