import * as RadixTabs from '@radix-ui/react-tabs'
import { createElement, useLayoutEffect, useRef, useState, type ElementType, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../icons'
import type { IconSource } from '../types/icons'
import { cn } from '../utils/cn'

export interface Tab {
  label: string
  icon?: IconSource
  route?: string
  [key: string]: unknown
}

export interface TabsProps {
  tabs: Tab[]
  value?: number
  defaultValue?: number
  onChange?: (value: number) => void
  vertical?: boolean
  dir?: 'rtl' | 'ltr'
  as?: ElementType
  className?: string
  tabItem?: (props: { tab: Tab; selected: boolean }) => ReactNode
  tabPanel?: (props: { tab: Tab }) => ReactNode
}

const indicatorHorizontal = 'left-0 bottom-0 h-[2px] translate-y-[1px] transition-[width,transform]'
const indicatorVertical = 'end-0 top-0 w-[2px] transition-[height,transform]'

export function Tabs({
  tabs,
  value,
  defaultValue = 0,
  onChange,
  vertical = false,
  dir,
  as: Tag = 'div',
  className,
  tabItem,
  tabPanel,
}: TabsProps) {
  const [internal, setInternal] = useState(value ?? defaultValue)
  const current = value ?? internal
  const listRef = useRef<HTMLDivElement | null>(null)
  const [indicator, setIndicator] = useState<{ size: number; position: number } | null>(null)
  const resolvedDir = dir ?? (typeof document !== 'undefined' && document.documentElement.dir === 'rtl' ? 'rtl' : 'ltr')

  useLayoutEffect(() => {
    const list = listRef.current
    if (!list) return
    const measure = () => {
      const active = list.querySelector<HTMLElement>('[data-state="active"]')
      if (!active) return
      setIndicator(
        vertical
          ? { size: active.offsetHeight, position: active.offsetTop }
          : { size: active.offsetWidth, position: active.offsetLeft },
      )
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(list)
    return () => observer.disconnect()
  }, [current, tabs, vertical])

  const select = (next: string) => {
    const index = Number(next)
    setInternal(index)
    onChange?.(index)
  }

  const renderLabel = (tab: Tab) => (
    <>
      {tab.icon && <Icon source={tab.icon} className="size-4" />}
      {tab.label}
    </>
  )

  const triggerClasses = cn(
    'flex items-center gap-1.5 text-base text-ink-gray-5 duration-300 ease-in-out hover:text-ink-gray-9 data-[state=active]:text-ink-gray-9',
    vertical ? 'px-2.5' : 'py-2.5',
  )

  return (
    <RadixTabs.Root
      asChild
      dir={resolvedDir}
      orientation={vertical ? 'vertical' : 'horizontal'}
      value={String(current)}
      onValueChange={select}
    >
      <Tag className={cn('flex flex-1 overflow-hidden flex-col data-[orientation=vertical]:flex-row', className)}>
        <RadixTabs.List
          ref={listRef}
          className={cn(
            'relative min-h-fit flex data-[orientation=vertical]:flex-col p-1 border-b data-[orientation=vertical]:border-e gap-5',
            vertical ? 'py-3' : 'overflow-x-auto overflow-y-hidden px-5',
          )}
        >
          {indicator && (
            <span
              aria-hidden="true"
              className={cn('absolute rounded-full duration-300', vertical ? indicatorVertical : indicatorHorizontal)}
              style={
                vertical
                  ? { height: indicator.size, transform: `translateY(${indicator.position}px)` }
                  : { width: indicator.size, transform: `translate(${indicator.position}px, 1px)` }
              }
            >
              <span className="block h-full w-full bg-surface-gray-10" />
            </span>
          )}

          {tabs.map((tab, index) => (
            <RadixTabs.Trigger key={`${tab.label}-${index}`} value={String(index)} asChild>
              {tabItem ? (
                (tabItem({ tab, selected: current === index }) as React.ReactElement)
              ) : tab.route ? (
                <Link to={tab.route} className={triggerClasses}>
                  {renderLabel(tab)}
                </Link>
              ) : (
                createElement('button', { type: 'button', className: triggerClasses }, renderLabel(tab))
              )}
            </RadixTabs.Trigger>
          ))}
        </RadixTabs.List>

        {tabs.map((tab, index) => (
          <RadixTabs.Content
            key={`${tab.label}-${index}`}
            value={String(index)}
            className="flex flex-col overflow-auto"
          >
            {tabPanel?.({ tab })}
          </RadixTabs.Content>
        ))}
      </Tag>
    </RadixTabs.Root>
  )
}
