import { useEffect, useMemo, useState } from 'react'
import { __ } from '@/core/i18n'
import { Dialog } from '@/design-system'
import { frappe } from '@/shared/frappe'
import { useMeta } from '../hooks/useMeta'
import type { ReportFilterDef } from '../frappe/queryReport'
import { filterable, type ListFilter } from '../utils/listFilters'
import { FilterPopover } from './DeskListFilters'
import { Icon } from './Icon'
import { ReportFilterControl } from './ReportFilterControl'

type AnyRecord = Record<string, any>

interface ChartFilterButtonProps {
  definition: AnyRecord | null
  chartLabel: string
  sourceFilters?: ReportFilterDef[]
  documentFilters: ListFilter[]
  valueFilters: AnyRecord
  onApplyDocument: (filters: ListFilter[]) => void
  onApplyValues: (values: AnyRecord) => void
}

const BUTTON_CLASS = 'flex size-7 items-center justify-center rounded-lg bg-surface-gray-2 hover:bg-surface-gray-3'

export function ChartFilterButton({
  definition,
  chartLabel,
  sourceFilters,
  documentFilters,
  valueFilters,
  onApplyDocument,
  onApplyValues,
}: ChartFilterButtonProps) {
  const chartType = String(definition?.chart_type ?? '')
  const isDocument = Boolean(definition) && chartType !== 'Report' && chartType !== 'Custom'
  const meta = useMeta(isDocument ? String(definition?.document_type ?? '') : '')
  const fields = useMemo(
    () => (meta.doctypeMeta ? filterable(meta.getFields({ restrictNoValueFields: false })) : []),
    [meta],
  )
  const [open, setOpen] = useState(false)
  const [reportFilters, setReportFilters] = useState<ReportFilterDef[]>([])
  const [draft, setDraft] = useState<AnyRecord>({})

  useEffect(() => {
    if (!open || isDocument || !definition) return undefined
    let cancelled = false
    void (async () => {
      const defs: ReportFilterDef[] =
        chartType === 'Custom'
          ? (sourceFilters ?? [])
          : (((await frappe.dashboard_utils.get_filters_for_chart_type(definition)) as ReportFilterDef[] | undefined) ??
            [])
      if (!cancelled) setReportFilters(defs.filter((entry) => entry.fieldname))
    })().catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [open, isDocument, definition, chartType, sourceFilters])

  if (!definition) return null
  if (isDocument)
    return (
      <FilterPopover
        fields={fields}
        filters={documentFilters}
        count={documentFilters.length}
        onApply={onApplyDocument}
        trigger={({ toggle }) => (
          <button type="button" aria-label={__('Filters')} className={BUTTON_CLASS} onClick={toggle}>
            <Icon icon="lucide-filter" className="size-4" />
          </button>
        )}
      />
    )
  return (
    <>
      <button
        type="button"
        aria-label={__('Filters')}
        className={BUTTON_CLASS}
        onClick={() => {
          setDraft({ ...valueFilters })
          setOpen(true)
        }}
      >
        <Icon icon="lucide-filter" className="size-4" />
      </button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title={__('Set Filters for {0}', [__(chartLabel)])}
        actions={[
          {
            label: __('Set'),
            variant: 'solid',
            onClick: ({ close }: { close: () => void }) => {
              onApplyValues(draft)
              close()
            },
          },
        ]}
      >
        {reportFilters.length ? (
          <div className="flex flex-col gap-3">
            {reportFilters.map((filter) => (
              <div key={filter.fieldname}>
                <div className="mb-1 text-[13px] text-ink-gray-6">{__(String(filter.label ?? filter.fieldname))}</div>
                <ReportFilterControl
                  filter={filter}
                  value={draft[filter.fieldname] ?? ''}
                  onChange={(value) => setDraft((current) => ({ ...current, [filter.fieldname]: value }))}
                />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-ink-gray-6">{__('No Filters Set')}</p>
        )}
      </Dialog>
    </>
  )
}
