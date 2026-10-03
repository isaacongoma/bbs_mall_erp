import type { MouseEvent } from 'react'
import { __ } from '@/core/i18n'
import { Button, type ButtonProps } from '@/design-system'

export interface ButtonControlProps extends Omit<ButtonProps, 'label' | 'icon'> {
  label: string
  icon?: string | null
}

export function ButtonControl({ label, icon, onClick, ...rest }: ButtonControlProps) {
  return (
    <Button
      {...rest}
      label={__(label)}
      iconLeft={icon ? `lucide-${icon}` : undefined}
      onClick={(event: MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation()
        onClick?.(event)
      }}
    />
  )
}
