import { __ } from '@/core/i18n'
import { Badge, Button } from '@/design-system'
import type { DashboardView } from '../frappe/formAdapter'
import { frappe } from '../frappe/runtime'
import { indicatorTheme } from '../utils/indicatorTheme'

type AnyRecord = Record<string, any>

export interface FrappeFormDashboardProps {
  frm: AnyRecord
  dashboard: DashboardView
}

function openList(frm: AnyRecord, doctype: string, fieldname?: string) {
  const data = (frm.dashboard?.data ?? {}) as AnyRecord
  const filter: AnyRecord = {}
  const dynamic = data.dynamic_links?.[fieldname ?? '']
  if (dynamic) filter[dynamic[1]] = dynamic[0]
  if (fieldname) filter[fieldname] = frm.doc.name
  frappe.route_options = filter
  void frappe.set_route('List', doctype, 'List')
}

export function FrappeFormDashboard({ frm, dashboard }: FrappeFormDashboardProps) {
  return (
    <div className="mx-auto flex w-full max-w-[870px] flex-col gap-4 border-b border-outline-gray-2 px-0 pb-5 pt-4">
      {dashboard.indicators.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {dashboard.indicators.map((indicator) => (
            <Badge
              key={indicator.label}
              theme={indicatorTheme(indicator.color)}
              variant="subtle"
              size="lg"
              label={indicator.label}
            />
          ))}
        </div>
      )}
      {dashboard.progress.map((progress) => (
        <div key={progress.title}>
          <div className="mb-1 flex items-center justify-between text-sm text-ink-gray-6">
            <span>{progress.title}</span>
            <span>{progress.message}</span>
          </div>
          <div className="flex h-2 overflow-hidden rounded-full bg-surface-gray-2">
            {progress.bars.map((bar, index) => (
              <div
                key={index}
                className={bar.className.includes('danger') ? 'bg-surface-red-6' : 'bg-surface-green-6'}
                style={{ width: bar.width }}
                title={bar.title}
              />
            ))}
          </div>
        </div>
      ))}
      {dashboard.groups.length > 0 && (
        <div
          className="grid gap-x-6 gap-y-4"
          style={{ gridTemplateColumns: `repeat(${Math.min(dashboard.groups.length, 3)}, minmax(0, 1fr))` }}
        >
          {dashboard.groups.map((group) => (
            <div key={group.label}>
              <div className="mb-2 text-base font-medium text-ink-gray-9">{__(group.label)}</div>
              <div className="flex flex-col gap-2">
                {group.items.map((item) => (
                  <div
                    key={item.doctype}
                    className="flex h-[32px] items-center justify-between gap-2 rounded-md border border-outline-gray-2 bg-surface-base pl-3 pr-1"
                  >
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 items-center gap-2 text-left text-base text-ink-gray-8 hover:text-ink-gray-9"
                      onClick={() => openList(frm, item.doctype, item.fieldname)}
                    >
                      <span className="truncate">{__(item.doctype)}</span>
                      {item.count ? <Badge theme="gray" variant="subtle" label={item.count} /> : null}
                      {item.openCount ? <Badge theme="orange" variant="subtle" label={item.openCount} /> : null}
                    </button>
                    {item.canCreate && (
                      <Button
                        variant="ghost"
                        size="sm"
                        icon="lucide-plus"
                        aria-label={__('New {0}', [__(item.doctype)])}
                        onClick={() => void frm.make_new(item.doctype, item.fieldname)}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      {dashboard.reports.length > 0 && (
        <div className="grid grid-cols-3 gap-x-6">
          {dashboard.reports.map((group) => (
            <div key={group.label}>
              {group.label && <div className="mb-2 text-base font-medium text-ink-gray-9">{__(group.label)}</div>}
              <div className="flex flex-col gap-2">
                {group.items.map((name) => (
                  <button
                    key={name}
                    type="button"
                    className="flex h-[32px] items-center rounded-md border border-outline-gray-2 bg-surface-base px-3 text-left text-base text-ink-gray-8"
                    onClick={() => {
                      const data = (frm.dashboard?.data ?? {}) as AnyRecord
                      const fieldname = data.non_standard_fieldnames?.[name] ?? data.fieldname
                      frappe.route_options = { [fieldname]: frm.doc.name }
                      void frappe.set_route('query-report', name)
                    }}
                  >
                    {__(name)}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
