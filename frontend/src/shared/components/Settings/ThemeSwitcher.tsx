import type { ComponentType } from 'react'
import { __ } from '@/core/i18n'
import { cn } from '@/design-system'
import { useThemeStore, type Theme } from '@/design-system/stores/themeStore'

export interface ThemeSwitcherProps {
  logo?: string | ComponentType<{ className?: string }>
  name?: string
}

function Logo({ logo }: { logo?: ThemeSwitcherProps['logo'] }) {
  if (typeof logo === 'string' && logo) return <img src={logo} className="size-5 object-cover" alt="" />
  if (logo && typeof logo !== 'string') {
    const Component = logo
    return <Component className="size-5 shrink-0 rounded" />
  }
  return null
}

function WindowDots({ dark }: { dark: boolean }) {
  return (
    <div className={cn('flex gap-[3px] border-b px-1 py-[3px]', dark ? 'border-gray-800' : 'border-gray-100')}>
      <div className="size-1.5 rounded-full bg-[#FF5F57]" />
      <div className="size-1.5 rounded-full bg-[#FEBC2D]" />
      <div className="size-1.5 rounded-full bg-[#28C840]" />
    </div>
  )
}

function Preview({
  dark,
  logo,
  name,
  bars = true,
}: {
  dark: boolean
  logo?: ThemeSwitcherProps['logo']
  name: string
  bars?: boolean
}) {
  return (
    <div className={cn('rounded-tl-sm', dark ? 'bg-gray-900' : 'bg-white')}>
      <WindowDots dark={dark} />
      <div className="flex items-start justify-between gap-2 p-2.5 pb-1 pr-0">
        <div className="flex flex-1 items-center gap-1 text-xs-semibold text-ink-gray-5">
          <Logo logo={logo} />
          <div>{__(name)}</div>
        </div>
        {bars && (
          <div className="flex flex-1 flex-col gap-[5px]">
            <div className={cn('h-1.5 w-full', dark ? 'bg-gray-800' : 'bg-gray-100')} />
            <div className={cn('h-1.5 w-full', dark ? 'bg-gray-800' : 'bg-gray-100')} />
            <div className={cn('h-1.5 w-full', dark ? 'bg-gray-800' : 'bg-gray-100')} />
          </div>
        )}
      </div>
    </div>
  )
}

function Footer({ label, selected }: { label: string; selected: boolean }) {
  return (
    <div className="flex items-center justify-between border-t px-3 py-2">
      <div className="text-base text-ink-gray-7">{label}</div>
      <div
        className={cn(
          'size-3.5 rounded-full',
          selected ? 'border-4 border-outline-gray-7' : 'border border-outline-gray-4',
        )}
      />
    </div>
  )
}

export function ThemeSwitcher({ logo, name = '' }: ThemeSwitcherProps) {
  const theme = useThemeStore((state) => state.currentTheme)
  const setTheme = useThemeStore((state) => state.setTheme)
  const current: Theme = theme === 'light' ? 'light' : theme === 'dark' ? 'dark' : 'system'

  function frame(value: Theme) {
    return cn(
      'flex-1 cursor-pointer rounded-lg border',
      current === value ? 'border-outline-gray-7' : 'border-outline-elevation-2',
    )
  }

  return (
    <div className="flex gap-3">
      <div className={frame('light')} onClick={() => setTheme('light')}>
        <div className="rounded-t-[10.5px] bg-surface-gray-2 pl-5 pt-3.5">
          <Preview dark={false} logo={logo} name={name} />
        </div>
        <Footer label={__('Light')} selected={current === 'light'} />
      </div>
      <div className={frame('dark')} onClick={() => setTheme('dark')}>
        <div className="rounded-t-[10.5px] bg-surface-gray-2 pl-5 pt-3.5">
          <Preview dark logo={logo} name={name} />
        </div>
        <Footer label={__('Dark')} selected={current === 'dark'} />
      </div>
      <div className={frame('system')} onClick={() => setTheme('system')}>
        <div className="flex">
          <div className="flex flex-1 rounded-tl-[10.5px] bg-surface-gray-2 pl-5 pt-3.5">
            <div className="w-full">
              <Preview dark={false} logo={logo} name={name} bars={false} />
            </div>
          </div>
          <div className="flex flex-1 rounded-tr-[10.5px] bg-surface-gray-3 pl-5 pt-3.5">
            <div className="w-full">
              <Preview dark logo={logo} name={name} bars={false} />
            </div>
          </div>
        </div>
        <Footer label={__('System')} selected={current === 'system'} />
      </div>
    </div>
  )
}
