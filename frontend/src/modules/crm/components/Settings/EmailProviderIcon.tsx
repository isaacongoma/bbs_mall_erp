import { cn } from '@/design-system'

export interface EmailProviderIconProps {
  logo: string
  label?: string
  selected?: boolean
}

export function EmailProviderIcon({ logo, label = '', selected = false }: EmailProviderIconProps) {
  return (
    <>
      <div
        className={cn(
          'flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl bg-surface-gray-2 hover:bg-surface-gray-3',
          selected && 'ring-2 ring-outline-gray-4',
        )}
      >
        <img src={logo} className="h-4 w-4" alt="" />
      </div>
      {label && <p className="mt-2 text-center text-xs text-ink-gray-6">{label}</p>}
    </>
  )
}
