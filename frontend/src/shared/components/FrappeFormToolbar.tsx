import { __ } from '@/core/i18n'
import { Badge, Breadcrumbs, Button, Dropdown, type BreadcrumbItem } from '@/design-system'
import { indicatorTheme } from '../utils/indicatorTheme'
import type { ActionButtonView, PageView } from '../frappe/formAdapter'
import { LayoutHeader } from './LayoutHeader'
import { toMenuOptions, toolbarIcon } from '../utils/toolbarMenu'

export function ActionButton({
  action,
  variant,
}: {
  action: ActionButtonView
  variant?: 'solid' | 'outline' | 'subtle'
}) {
  return (
    <Button
      label={action.label}
      variant={variant ?? action.variant}
      theme={action.theme === 'red' ? 'red' : undefined}
      iconLeft={action.icon}
      disabled={action.disabled}
      loading={action.loading}
      onClick={action.onClick}
    />
  )
}

function appPath(href: string): string {
  return href.replace(/^\/desk(\/|$)/, '/app$1')
}

export interface FrappeFormToolbarProps {
  page: PageView
  dirty: boolean
  docstatusLabel?: string
  isNew?: boolean
}

export function FrappeFormToolbar({ page, dirty, docstatusLabel, isNew = false }: FrappeFormToolbarProps) {
  const crumbs: BreadcrumbItem[] = page.breadcrumbs.map((entry) => ({
    label: entry.label,
    route: entry.href ? appPath(entry.href) : undefined,
  }))

  return (
    <LayoutHeader
      className="h-12"
      left={
        <div className="flex min-w-0 items-center gap-2">
          <Breadcrumbs items={crumbs} regularParents />
          {page.indicator && (
            <Badge theme={indicatorTheme(page.indicator.color)} variant="subtle" label={page.indicator.label} />
          )}
          {!page.indicator && dirty && <Badge theme="orange" variant="subtle" label={__('Not Saved')} />}
          {docstatusLabel && <span className="hidden text-sm text-ink-gray-5 sm:inline">{docstatusLabel}</span>}
        </div>
      }
      right={
        <div className="flex items-center gap-1">
          {page.inner.map((item) => {
            if (item.kind === 'button' && item.button) {
              return <ActionButton key={item.key} action={item.button} />
            }
            if (item.kind === 'group' && item.options) {
              return (
                <Dropdown key={item.key} options={toMenuOptions(item.options)}>
                  {() => (
                    <Button
                      label={item.label}
                      variant={item.primary ? 'solid' : 'subtle'}
                      iconRight="lucide-chevrons-up-down"
                    />
                  )}
                </Dropdown>
              )
            }
            return null
          })}
          {page.actionsVisible && page.actions.length > 0 && (
            <Dropdown options={toMenuOptions(page.actions)} placement="right">
              {() => <Button label={__('Actions')} variant="solid" iconRight="lucide-chevrons-up-down" />}
            </Dropdown>
          )}
          {page.icons.map((icon) => (
            <Button
              key={icon.key}
              variant="subtle"
              aria-label={icon.label}
              tooltip={icon.label}
              icon={toolbarIcon(icon.icon)}
              onClick={icon.onClick}
            />
          ))}
          {page.menuVisible && page.menu.length > 0 && !isNew && (
            <Dropdown options={toMenuOptions(page.menu)} placement="right">
              <Button variant="subtle" icon="lucide-more-horizontal" aria-label={__('Menu')} />
            </Dropdown>
          )}
          {page.secondary && <ActionButton action={page.secondary} />}
          {page.primary && <ActionButton action={page.primary} variant="solid" />}
        </div>
      }
    />
  )
}
