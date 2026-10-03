import { __ } from '@/core/i18n'
import { RouteLink } from '@/core/navigation'
import { Button, Dropdown, cn } from '@/design-system'
import type { ViewController } from '../hooks/useViewController'
import '../styles/viewBreadcrumbs.css'
import { Icon } from './Icon'

export interface ViewBreadcrumbsProps {
  routeName: string
  viewControls?: Pick<ViewController, 'viewsDropdownOptions' | 'currentView' | 'viewActions'> | null
}

export function ViewBreadcrumbs({ routeName, viewControls }: ViewBreadcrumbsProps) {
  const hasViews = Boolean(viewControls?.viewsDropdownOptions)

  return (
    <div className="flex items-center">
      <RouteLink
        to={{ name: routeName }}
        className={cn(
          'px-0.5 py-1 text-lg-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-outline-gray-3',
          hasViews ? 'text-ink-gray-5 hover:text-ink-gray-7' : 'text-ink-gray-7',
        )}
      >
        {__(routeName)}
      </RouteLink>
      {hasViews && viewControls && (
        <>
          <span className="mx-0.5 text-base text-ink-gray-4" aria-hidden="true">
            /
          </span>
          <Dropdown
            options={viewControls.viewsDropdownOptions}
            itemSuffix={({ item, close, selected }) => {
              const name = (item as { name?: string | number }).name
              if (!name) return null
              return (
                <div className="flex flex-row-reverse items-center gap-2">
                  <Dropdown
                    side="right"
                    offset={15}
                    options={viewControls.viewActions(
                      { name, label: String((item as { label?: string }).label ?? '') },
                      close,
                    )}
                  >
                    <Button
                      variant="ghost"
                      className="view-action-btn !size-5 opacity-0"
                      icon="lucide-more-horizontal"
                      onClick={(event) => event.stopPropagation()}
                    />
                  </Dropdown>
                  {selected && <span className="lucide-check size-4 text-ink-gray-7" aria-hidden="true" />}
                </div>
              )
            }}
          >
            {({ open }) => (
              <Button
                variant="ghost"
                className="text-nowrap text-lg-medium"
                label={__(viewControls.currentView?.label)}
                iconRight={open ? 'lucide-chevron-up' : 'lucide-chevron-down'}
                prefix={<Icon icon={viewControls.currentView?.icon} className="h-4" />}
              />
            )}
          </Dropdown>
        </>
      )}
    </div>
  )
}
