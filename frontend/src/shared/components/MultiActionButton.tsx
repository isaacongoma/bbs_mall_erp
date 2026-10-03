import { useState } from 'react'
import { Button, Dropdown, type ButtonProps } from '@/design-system'
import { DropdownOption } from '../utils/optionComponents'

export interface MultiActionOption {
  label: string
  icon?: ButtonProps['iconLeft']
  onClick: () => void
}

export interface MultiActionButtonProps extends Pick<ButtonProps, 'variant' | 'size' | 'className'> {
  options?: MultiActionOption[]
}

export function MultiActionButton({ options = [], variant, size, className }: MultiActionButtonProps) {
  const [activeLabel, setActiveLabel] = useState<string | null>(null)
  const showDropdown = options.length > 1
  const activeButton = options.find((option) => option.label === activeLabel) ?? options[0]

  const parsedOptions = options.map((option) => ({
    label: option.label,
    component: () => (
      <DropdownOption
        option={option.label}
        selected={option.label === activeButton?.label}
        onClick={() => setActiveLabel(option.label)}
      />
    ),
  }))

  if (!activeButton) return null

  return (
    <div className="flex items-center">
      <Button
        variant={variant}
        className={`border-0 ${className ?? ''} ${showDropdown ? 'rounded-br-none rounded-tr-none' : ''}`}
        label={activeButton.label}
        size={size}
        iconLeft={activeButton.icon}
        onClick={() => activeButton.onClick()}
      />
      {showDropdown && (
        <Dropdown
          options={parsedOptions}
          placement="right"
          button={{
            icon: 'lucide-chevron-down',
            variant,
            size,
            className: '!w-6 justify-start rounded-bl-none rounded-tl-none border-0 pr-0 text-xs',
          }}
        />
      )}
    </div>
  )
}
