import { cn } from '@/design-system'
import { CRMLogo } from './Icons'

export interface BrandLogoProps {
  brand?: { logo?: string | null } | null
  className?: string
}

export function BrandLogo({ brand, className }: BrandLogoProps) {
  if (brand?.logo) {
    return (
      <div className={className}>
        <img src={brand.logo} className="h-full w-full object-cover" alt="" />
      </div>
    )
  }
  return <CRMLogo className={cn('size-8 shrink-0 rounded', className)} />
}
