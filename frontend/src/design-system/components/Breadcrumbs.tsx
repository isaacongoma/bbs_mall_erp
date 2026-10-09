import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate, type To } from 'react-router-dom'
import { LucideIcon } from '../icons'
import { cn } from '../utils/cn'
import { Button } from './Button'
import { Dropdown } from './Dropdown'

export interface BreadcrumbItem {
  label: string
  route?: To
  href?: string
  onClick?: () => void
  [key: string]: unknown
}

export interface BreadcrumbsProps {
  items: (BreadcrumbItem | null | undefined | false)[]
  prefix?: (props: { item: BreadcrumbItem }) => ReactNode
  suffix?: (props: { item: BreadcrumbItem }) => ReactNode
  className?: string
  regularParents?: boolean
}

const crumbClasses = (last: boolean, regularParents = false) =>
  cn(
    'flex items-center rounded px-0.5 py-1',
    !regularParents ? 'text-lg-medium' : last ? 'text-lg font-[500]' : 'text-lg font-[420]',
    last ? 'min-w-0 text-ink-gray-9' : 'text-ink-gray-5 hover:text-ink-gray-7',
  )

export function Breadcrumbs({ items: rawItems, prefix, suffix, className, regularParents }: BreadcrumbsProps) {
  const navigate = useNavigate()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [overflowed, setOverflowed] = useState(false)
  const items = useMemo(() => rawItems.filter(Boolean) as BreadcrumbItem[], [rawItems])

  useLayoutEffect(() => {
    const element = containerRef.current
    if (!element) return
    let frame = 0
    const measure = () => {
      setOverflowed(false)
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => setOverflowed(element.scrollWidth > element.clientWidth))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [items])

  const dropdownItems = items.slice(0, -2).map((item) => ({
    ...item,
    icon: null,
    label: item.label,
    onClick: () => {
      item.onClick?.()
      if (item.route !== undefined) void navigate(item.route)
    },
  }))

  const crumbs = items.slice(overflowed ? -2 : 0)

  return (
    <div className={cn('flex min-w-0 items-center', className)} ref={containerRef}>
      {overflowed && items.length > 2 && (
        <>
          <Dropdown className="h-7" options={dropdownItems}>
            <Button variant="ghost" iconSlot={<LucideIcon name="ellipsis" className="size-4 text-ink-gray-5" />} />
          </Dropdown>
          <span className="ml-1 mr-0.5 text-base text-ink-gray-4" aria-hidden="true">
            /
          </span>
        </>
      )}

      <div className="flex min-w-0 items-center text-ellipsis whitespace-nowrap">
        {crumbs.map((item, index) => {
          const last = index === crumbs.length - 1
          const content = (
            <>
              {prefix?.({ item })}
              <span className={cn(last && 'min-w-0 truncate')} title={last ? item.label : undefined}>
                {item.label}
              </span>
              {suffix?.({ item })}
            </>
          )

          return (
            <span key={item.label} className="contents">
              {item.route !== undefined ? (
                <Link to={item.route} onClick={() => item.onClick?.()} className={crumbClasses(last, regularParents)}>
                  {content}
                </Link>
              ) : item.href ? (
                <a href={item.href} onClick={() => item.onClick?.()} className={crumbClasses(last, regularParents)}>
                  {content}
                </a>
              ) : (
                <button type="button" onClick={() => item.onClick?.()} className={crumbClasses(last, regularParents)}>
                  {content}
                </button>
              )}
              {!last && (
                <span className="mx-0.5 text-base text-ink-gray-4" aria-hidden="true">
                  /
                </span>
              )}
            </span>
          )
        })}
      </div>
    </div>
  )
}
