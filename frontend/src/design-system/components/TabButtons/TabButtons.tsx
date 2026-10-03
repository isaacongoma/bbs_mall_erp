import * as RadixRadio from '@radix-ui/react-radio-group'
import { useEffect, useRef, type ReactNode } from 'react'
import { Link, type To } from 'react-router-dom'
import type { IconSource } from '../../icons'
import { cn } from '../../utils/cn'
import { Pill, type BrowserTabBase, type PillSize } from './Pill'

export type TabButtonValue = string | number | boolean
export type TabButtonsType = 'subtle' | 'ghost' | 'underline' | 'browser-tab'
export type TabButtonsDirection = 'left' | 'right'

export interface TabButton {
  label?: string | number
  value?: TabButtonValue
  icon?: IconSource
  iconLeft?: IconSource
  iconRight?: IconSource
  active?: boolean
  disabled?: boolean
  tooltip?: string
  className?: string
  route?: To
  href?: string
  onClick?: (event: React.MouseEvent) => void
}

export interface TabButtonsProps {
  options?: TabButton[]
  value?: TabButtonValue
  onChange?: (value: TabButtonValue | undefined) => void
  type?: TabButtonsType
  size?: PillSize
  vertical?: boolean
  direction?: TabButtonsDirection
  className?: string
  prefix?: (props: { button: TabButton; checked: boolean; disabled: boolean }) => ReactNode
  suffix?: (props: { button: TabButton; checked: boolean; disabled: boolean }) => ReactNode
}

function hasLabel(label: TabButton['label']) {
  return label !== undefined && label !== null && label !== ''
}

function horizontalClasses(type: TabButtonsType, size: PillSize) {
  const base = 'inline-flex shrink-0 items-center overflow-hidden'
  const small = size === 'sm'
  switch (type) {
    case 'subtle':
    case 'ghost':
      return cn(
        base,
        'p-px',
        type === 'subtle' ? 'bg-surface-gray-2' : 'bg-surface-base',
        small ? 'gap-1 rounded' : 'gap-1.5 rounded-[10px]',
      )
    case 'underline':
      return cn(base, 'border-b border-outline-gray-1 gap-6')
    case 'browser-tab':
      return cn(base, 'border-b border-outline-gray-1 gap-1')
  }
}

function verticalClasses(type: TabButtonsType, size: PillSize, direction: TabButtonsDirection) {
  const base = 'inline-flex shrink-0 flex-col'
  const small = size === 'sm'
  switch (type) {
    case 'subtle':
    case 'ghost':
      return cn(
        base,
        'p-px',
        type === 'subtle' ? 'bg-surface-gray-2' : 'bg-surface-base',
        small ? 'gap-1 rounded' : 'gap-1.5 rounded-[10px]',
        'items-center',
      )
    case 'underline':
      return cn(base, 'border-r border-outline-gray-1 gap-1.5')
    case 'browser-tab':
      return cn(
        base,
        direction === 'right' ? 'border-r border-outline-gray-1' : 'border-l border-outline-gray-1',
        'gap-1',
      )
  }
}

function browserTabBase(
  type: TabButtonsType,
  vertical: boolean,
  checked: boolean,
  direction: TabButtonsDirection,
): BrowserTabBase {
  if (type !== 'browser-tab') return 'none'
  if (!vertical) return 'default'
  if (!checked) return 'none'
  return direction
}

function radiusClass(type: TabButtonsType, size: PillSize, base: BrowserTabBase) {
  if (type === 'underline') return ''
  const small = size === 'sm'
  if (type === 'browser-tab') {
    if (base === 'left') return small ? 'rounded-r-[7px]' : 'rounded-r-[9px]'
    if (base === 'right') return small ? 'rounded-l-[7px]' : 'rounded-l-[9px]'
    if (base === 'default') return small ? 'rounded-t-[7px]' : 'rounded-t-[9px]'
  }
  return small ? 'rounded-[7px]' : 'rounded-[9px]'
}

export function TabButtons({
  options = [],
  value,
  onChange,
  type = 'subtle',
  size = 'sm',
  vertical = false,
  direction = 'left',
  className,
  prefix,
  suffix,
}: TabButtonsProps) {
  const buttons = options.map((button, index) => ({
    ...button,
    key: `tab-button-${index}`,
    modelValue: button.value ?? button.label ?? index,
  }))

  const selected =
    buttons.find((button) => Object.is(button.modelValue, value)) ?? buttons.find((button) => button.active)

  const lastEmitted = useRef<TabButtonValue | undefined>(undefined)

  useEffect(() => {
    if (buttons.some((button) => Object.is(button.modelValue, value))) return
    const fallback = buttons.find((button) => button.active)
    if (!fallback || Object.is(fallback.modelValue, value) || Object.is(lastEmitted.current, fallback.modelValue))
      return
    lastEmitted.current = fallback.modelValue
    onChange?.(fallback.modelValue)
  })

  const pillVariant = type === 'underline' ? 'underline' : type === 'browser-tab' ? 'browser-tab' : 'default'

  return (
    <RadixRadio.Root
      className={className}
      orientation={vertical ? 'vertical' : 'horizontal'}
      value={selected?.key ?? ''}
      onValueChange={(key) => {
        const next = buttons.find((button) => button.key === key)
        onChange?.(next?.modelValue)
      }}
    >
      <div className={vertical ? verticalClasses(type, size, direction) : horizontalClasses(type, size)}>
        {buttons.map((button) => {
          const checked = button.key === selected?.key
          const iconOnly = Boolean(button.icon)
          const visibleLabel = hasLabel(button.label) && !iconOnly
          const accessibleLabel = hasLabel(button.label) ? String(button.label) : button.tooltip
          const base = browserTabBase(type, vertical, checked, direction)
          const classes = cn(
            'inline-flex appearance-none border-0 bg-transparent p-0 text-inherit no-underline disabled:pointer-events-none disabled:opacity-60',
            radiusClass(type, size, base),
            vertical && 'w-full',
            button.className,
          )
          const common = {
            'data-slot': 'tab-button',
            'data-state': checked ? 'checked' : 'unchecked',
            'data-disabled': button.disabled ? '' : undefined,
            'aria-label': accessibleLabel && !visibleLabel ? accessibleLabel : undefined,
            title: accessibleLabel && !visibleLabel ? accessibleLabel : button.tooltip,
            className: classes,
            onClick: (event: React.MouseEvent) => button.onClick?.(event),
          }
          const pill = (
            <Pill
              className={vertical ? 'w-full !justify-start' : ''}
              label={button.label}
              icon={button.icon}
              iconLeft={button.iconLeft}
              iconRight={button.iconRight}
              active={checked}
              size={size}
              variant={pillVariant}
              browserTabBase={base}
              orientation={vertical ? 'vertical' : 'horizontal'}
              activeStyle={type === 'ghost' ? 'subtle' : 'raised'}
              prefix={prefix?.({ button, checked, disabled: Boolean(button.disabled) })}
              suffix={suffix?.({ button, checked, disabled: Boolean(button.disabled) })}
            />
          )

          if (!button.disabled && button.route !== undefined) {
            return (
              <RadixRadio.Item key={button.key} asChild value={button.key} disabled={button.disabled}>
                <Link to={button.route} {...common}>
                  {pill}
                </Link>
              </RadixRadio.Item>
            )
          }
          if (!button.disabled && button.href) {
            return (
              <RadixRadio.Item key={button.key} asChild value={button.key} disabled={button.disabled}>
                <a href={button.href} target="_blank" rel="noreferrer noopener" {...common}>
                  {pill}
                </a>
              </RadixRadio.Item>
            )
          }
          return (
            <RadixRadio.Item key={button.key} value={button.key} disabled={button.disabled} {...common}>
              {pill}
            </RadixRadio.Item>
          )
        })}
      </div>
    </RadixRadio.Root>
  )
}
