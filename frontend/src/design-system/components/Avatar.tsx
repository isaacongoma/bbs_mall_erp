import { useState, type HTMLAttributes, type ReactNode } from 'react'
import { cn } from '../utils/cn'

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl'
export type AvatarShape = 'circle' | 'square'
export type AvatarTheme = 'gray' | 'blue' | 'green' | 'amber' | 'red' | 'violet'

const fallbackThemeClasses: Record<AvatarTheme, string> = {
  gray: 'bg-surface-gray-2 text-ink-gray-5',
  blue: 'bg-surface-blue-2 text-ink-blue-8',
  green: 'bg-surface-green-2 text-ink-green-8',
  amber: 'bg-surface-amber-2 text-ink-amber-8',
  red: 'bg-surface-red-2 text-ink-red-8',
  violet: 'bg-surface-violet-2 text-ink-violet-8',
}

const squareRadius: Record<AvatarSize, string> = {
  xs: 'rounded-[4px]',
  sm: 'rounded-[5px]',
  md: 'rounded-[5px]',
  lg: 'rounded-[6px]',
  xl: 'rounded-[6px]',
  '2xl': 'rounded-[8px]',
  '3xl': 'rounded-[10px]',
}

const sizeClasses: Record<AvatarSize, string> = {
  xs: 'w-4 h-4',
  sm: 'w-5 h-5',
  md: 'w-6 h-6',
  lg: 'w-7 h-7',
  xl: 'w-8 h-8',
  '2xl': 'w-10 h-10',
  '3xl': 'w-11.5 h-11.5',
}

const labelSizes: Record<AvatarSize, string> = {
  xs: 'text-2xs',
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-base',
  xl: 'text-lg',
  '2xl': 'text-2xl',
  '3xl': 'text-3xl',
}

const indicatorContainerSizes: Record<AvatarSize, string> = {
  xs: '-mr-[.1rem] -mb-[.1rem] h-2 w-2',
  sm: '-mr-[.1rem] -mb-[.1rem] h-[9px] w-[9px]',
  md: '-mr-[.1rem] -mb-[.1rem] h-2.5 w-2.5',
  lg: '-mr-[.1rem] -mb-[.1rem] h-3 w-3',
  xl: '-mr-[.1rem] -mb-[.1rem] h-3 w-3',
  '2xl': '-mr-[.1rem] -mb-[.1rem] h-3.5 w-3.5',
  '3xl': '-mr-[.2rem] -mb-[.2rem] h-4 w-4',
}

const indicatorSizes: Record<AvatarSize, string> = {
  xs: 'h-1 w-1',
  sm: 'h-[5px] w-[5px]',
  md: 'h-1.5 w-1.5',
  lg: 'h-2 w-2',
  xl: 'h-2 w-2',
  '2xl': 'h-2.5 w-2.5',
  '3xl': 'h-3 w-3',
}

const iconSizes: Record<AvatarSize, string> = {
  xs: 'h-2.5 w-2.5',
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-4 w-4',
  xl: 'h-4 w-4',
  '2xl': 'h-5 w-5',
  '3xl': 'h-5 w-5',
}

const sizeOverridePattern = /^-?(size|w|h|min-w|max-w|min-h|max-h)-/

function hasSizeOverride(className: string | undefined): boolean {
  if (!className) return false
  return className.split(/\s+/).some((token) => {
    const base = token.includes(':') ? token.slice(token.lastIndexOf(':') + 1) : token
    return sizeOverridePattern.test(base)
  })
}

export interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  image?: string | null
  label?: string
  size?: AvatarSize
  shape?: AvatarShape
  theme?: AvatarTheme
  indicator?: ReactNode
}

export function Avatar({
  image,
  label,
  size = 'md',
  shape = 'circle',
  theme = 'gray',
  indicator,
  className,
  children,
  ...rest
}: AvatarProps) {
  const [failedImage, setFailedImage] = useState<string | null>(null)
  const imageFailed = Boolean(image) && failedImage === image
  const shapeClass = shape === 'circle' ? 'rounded-full' : squareRadius[size]

  return (
    <div
      className={cn(
        'relative inline-block shrink-0',
        !hasSizeOverride(className) && sizeClasses[size],
        shapeClass,
        className,
      )}
      {...rest}
    >
      {image && !imageFailed ? (
        <img
          src={image}
          alt={label}
          className={cn(shapeClass, 'h-full w-full object-cover')}
          onError={() => setFailedImage(image)}
        />
      ) : (
        <div
          className={cn(
            'flex h-full w-full items-center justify-center uppercase select-none',
            'font-medium',
            labelSizes[size],
            fallbackThemeClasses[theme],
            shapeClass,
          )}
        >
          {children ? <div className={iconSizes[size]}>{children}</div> : label && label[0]}
        </div>
      )}
      {indicator && (
        <div
          className={cn(
            'absolute bottom-0 right-0 grid place-items-center rounded-full bg-surface-base',
            indicatorContainerSizes[size],
          )}
        >
          <div className={indicatorSizes[size]}>{indicator}</div>
        </div>
      )}
    </div>
  )
}
