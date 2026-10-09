import { useEffect, useState } from 'react'
import { cn } from '@/design-system'
import { buildFieldContext } from '../frappe/formContext'
import { readDashboard, readLayout, readMessages } from '../frappe/formAdapter'
import { sanitizeHTML } from '../utils/text'
import { FieldLayout, type LayoutTab } from './FieldLayout'
import { Icon } from './Icon'
import { DeskFormConnections } from './DeskFormConnections'
import { FrappeFormDashboard } from './FrappeFormDashboard'

type AnyRecord = Record<string, any>

const MESSAGE_CLASSES: Record<string, string> = {
  blue: 'bg-surface-blue-2 text-ink-blue-8',
  green: 'border-outline-green-3 bg-surface-green-2 text-ink-green-8',
  red: 'border-outline-red-1 bg-surface-red-2 text-ink-red-8',
  orange: 'border-outline-amber-2 bg-surface-amber-2 text-ink-amber-8',
  yellow: 'border-outline-amber-2 bg-surface-amber-2 text-ink-amber-8',
  gray: 'border-outline-gray-2 bg-surface-gray-2 text-ink-gray-8',
  grey: 'border-outline-gray-2 bg-surface-gray-2 text-ink-gray-8',
}

function messageText(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  doc.body.querySelectorAll('.close-message, svg').forEach((node) => node.remove())
  return doc.body.innerHTML
}

function MessageBanner({ color, html }: { color?: string; html: string }) {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null
  return (
    <div
      className={cn(
        'mb-4 flex items-center justify-between gap-3 px-4 py-2.5 text-base',
        MESSAGE_CLASSES[color ?? ''] ?? MESSAGE_CLASSES.blue,
      )}
    >
      <div className="min-w-0 [&_p]:m-0" dangerouslySetInnerHTML={{ __html: sanitizeHTML(messageText(html)) }} />
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => setDismissed(true)}
        className="shrink-0 opacity-80 hover:opacity-100"
      >
        <Icon icon="lucide-x" className="size-4" />
      </button>
    </div>
  )
}

export interface FrappeFormBodyProps {
  frm: AnyRecord
}

export function FrappeFormBody({ frm }: FrappeFormBodyProps) {
  const layout = readLayout(frm)
  const context = layout ? buildFieldContext(frm, layout.overrides) : null
  const messages = readMessages(frm)
  const dashboard = readDashboard(frm)

  useEffect(() => {
    const data = frm.dashboard?.data
    if (data?.transactions?.length && !frm.is_new?.()) frm.dashboard.set_open_count?.()
  }, [frm, frm.docname])

  const dashboardTab = Boolean(layout?.tabs.some((tab) => tab.showDashboard))
  const showConnections = dashboardTab && !frm.is_new?.()
  const tabs = (layout?.tabs ?? []).map((tab) => ({
    name: tab.name,
    label: tab.label,
    hidden: tab.showDashboard ? !showConnections : tab.hidden,
    extra:
      tab.showDashboard && showConnections ? (
        <DeskFormConnections bare doctype={frm.doctype} docname={String(frm.docname)} />
      ) : undefined,
    sections: tab.sections.map((section) => ({
      name: section.name,
      label: section.label,
      hidden: section.hidden,
      hideBorder: section.hideBorder,
      collapsible: section.collapsible,
      opened: !section.collapsed,
      columns: section.columns.map((column) => ({ name: column.name, label: column.label, fields: column.fields })),
    })),
  })) as unknown as LayoutTab[]

  if (!layout || !context) return null

  return (
    <div>
      {messages.map((message, index) => (
        <MessageBanner key={`${index}:${message.html}`} color={message.color} html={message.html} />
      ))}
      {dashboard && !dashboardTab && <FrappeFormDashboard frm={frm} dashboard={dashboard} />}
      <FieldLayout
        key={`${frm.doctype}:${frm.docname}`}
        tabs={tabs}
        data={frm.doc}
        doctype={frm.doctype}
        docname={frm.docname}
        context={context}
      />
    </div>
  )
}
