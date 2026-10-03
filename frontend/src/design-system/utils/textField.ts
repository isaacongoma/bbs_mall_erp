import type { InputVariant } from '../types/input'

export function variantClasses(variant: InputVariant, disabled: boolean): string {
  const resolved = disabled ? 'disabled' : variant
  switch (resolved) {
    case 'subtle':
      return 'border border-(--surface-gray-2) bg-surface-gray-2 placeholder:text-ink-gray-4 hover:border-outline-elevation-2 hover:bg-surface-gray-3 focus:bg-surface-base focus:border-outline-gray-4 focus:shadow-sm focus:ring-0'
    case 'outline':
      return 'border border-outline-gray-2 bg-surface-base placeholder:text-ink-gray-4 hover:border-outline-gray-3 hover:shadow-sm focus:bg-surface-base focus:border-outline-gray-4 focus:shadow-sm focus:ring-0'
    case 'disabled':
      return `border bg-surface-gray-1 placeholder:text-ink-gray-3 ${variant === 'outline' ? 'border-outline-gray-2' : 'border-transparent'}`
    case 'ghost':
      return 'border-0 focus:ring-0 focus-visible:outline-none'
  }
}
