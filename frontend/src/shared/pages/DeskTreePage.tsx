import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useNavigate } from 'react-router-dom'
import { __ } from '@/core/i18n'
import { Button, Dropdown, ErrorMessage, usePageMeta } from '@/design-system'
import '../frappe/styles/frappePage.css'
import { ActionButton } from '../components/FrappeFormToolbar'
import { toMenuOptions, toolbarIcon } from '../utils/toolbarMenu'
import { LayoutHeader } from '../components/LayoutHeader'
import { readPage } from '../frappe/formAdapter'
import { formsVersion, subscribeForms } from '../frappe/formStore'
import { closeTree, openTree, type TreeHandle } from '../frappe/treeView'

interface DeskTreePageProps {
  doctype: string
}

function viewSwitcherOptions(doctype: string, navigate: (to: string) => void, active: string) {
  const base = `/app/${encodeURIComponent(doctype)}`
  return [
    {
      label: __('List View'),
      icon: 'lucide-list',
      submenu: [{ label: __('Default Layout'), onClick: () => navigate(base) }],
    },
    {
      label: __('Report View'),
      icon: 'lucide-table',
      submenu: [{ label: __('Default Layout'), onClick: () => navigate(`${base}/view/report`) }],
    },
    { label: __('Dashboard View'), icon: 'lucide-layout-dashboard', onClick: () => navigate(`${base}/view/dashboard`) },
    {
      label: __('Kanban View'),
      icon: 'lucide-kanban-square',
      submenu: [{ label: __('New Kanban Board'), onClick: () => navigate(`${base}/view/kanban`) }],
    },
    {
      label: __('Tree View'),
      icon: 'lucide-list-tree',
      onClick: () => navigate(`${base}/view/tree`),
      active: active === 'tree',
    },
  ]
}

export default function DeskTreePage({ doctype }: DeskTreePageProps) {
  const navigate = useNavigate()
  const host = useRef<HTMLDivElement>(null)
  const [handle, setHandle] = useState<TreeHandle | null>(null)
  const [error, setError] = useState<string | null>(null)
  useSyncExternalStore(subscribeForms, formsVersion, formsVersion)
  usePageMeta({ title: `${doctype} ${__('Tree')}` })

  useEffect(() => {
    let cancelled = false
    openTree(doctype).then(
      (next) => {
        if (cancelled) return
        host.current?.replaceChildren(next.wrapper)
        setHandle(next)
      },
      (reason: unknown) => {
        console.error(reason)
        if (!cancelled) setError(reason instanceof Error ? reason.message : String(reason))
      },
    )
    return () => {
      cancelled = true
      closeTree(doctype)
    }
  }, [doctype])

  const page = handle ? readPage({ page: handle.treeview.page, doctype }) : null
  const title = String(handle?.treeview.page?.title ?? '')

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <LayoutHeader
        className="h-12"
        left={<h1 className="text-lg font-medium text-ink-gray-9">{title}</h1>}
        right={
          page ? (
            <div className="flex items-center gap-1">
              <Dropdown options={viewSwitcherOptions(doctype, navigate, 'tree')}>
                {() => (
                  <Button
                    label={__('Tree View')}
                    variant="subtle"
                    iconLeft="lucide-list-tree"
                    iconRight="lucide-chevrons-up-down"
                  />
                )}
              </Dropdown>
              {page.inner.map((item) => {
                if (item.kind === 'button' && item.button) return <ActionButton key={item.key} action={item.button} />
                if (item.kind === 'group' && item.options) {
                  return (
                    <Dropdown key={item.key} options={toMenuOptions(item.options)}>
                      {() => <Button label={item.label} variant="subtle" iconRight="lucide-chevrons-up-down" />}
                    </Dropdown>
                  )
                }
                return null
              })}
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
              {page.menu.length > 0 && (
                <Dropdown options={toMenuOptions(page.menu)} placement="right">
                  <Button variant="subtle" icon="lucide-more-horizontal" aria-label={__('Menu')} />
                </Dropdown>
              )}
              {page.primary && <ActionButton action={page.primary} variant="solid" />}
            </div>
          ) : null
        }
      />
      {error && <ErrorMessage className="m-6" message={error} />}
      <div className="min-h-0 flex-1 overflow-auto">
        <div
          ref={host}
          className="frappe-page-host mx-auto w-full max-w-[900px] [&_.page-head]:!hidden [&_.tooltip-content]:hidden"
        />
      </div>
    </main>
  )
}
