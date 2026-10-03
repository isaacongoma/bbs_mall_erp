import feather from 'feather-icons'
import { cn } from '../utils/cn'
import type { SvgProps } from '../types/icons'

export interface FeatherIconProps extends Omit<SvgProps, 'name' | 'color'> {
  name: string
  color?: string
  strokeWidth?: number
}

export function FeatherIcon({ name, color, strokeWidth = 1.5, className, ...rest }: FeatherIconProps) {
  const icon = feather.icons[name as keyof typeof feather.icons] ?? feather.icons.circle
  if (!icon) return null
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      color={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
      className={cn(icon.attrs.class as string | undefined, 'shrink-0', className)}
      dangerouslySetInnerHTML={{ __html: icon.contents }}
      {...rest}
    />
  )
}
