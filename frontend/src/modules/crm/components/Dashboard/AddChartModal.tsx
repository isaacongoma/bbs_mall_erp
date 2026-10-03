import { useEffect, useState } from 'react'
import { rpc } from '@/core/api/rpc'
import { __ } from '@/core/i18n'
import { Button, Dialog, FormControl, toast } from '@/design-system'
import { getRandom } from '@/shared/utils/text'
import { ensureChartOptionsLoaded, useDashboardStore } from '../../stores/dashboardStore'

type AnyRecord = Record<string, any>

export interface AddChartModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: AnyRecord[]
  onItemsChange: (items: AnyRecord[]) => void
  fromDate: string | null
  toDate: string | null
  user: string | null
}

export function AddChartModal({
  open,
  onOpenChange,
  items,
  onItemsChange,
  fromDate,
  toDate,
  user,
}: AddChartModalProps) {
  const chartTypes = useDashboardStore((state) => state.chartTypes)
  const chartOptionsByType = useDashboardStore((state) => state.chartOptionsByType)
  const [chartType, setChartType] = useState('spacer')
  const [selected, setSelected] = useState<Record<string, string>>({})

  useEffect(() => {
    ensureChartOptionsLoaded()
  }, [])

  const currentOptions: AnyRecord[] = chartOptionsByType[chartType] || []
  const currentLabel = chartTypes.find((option) => option.value === chartType)?.label || ''
  const selectedValue = currentOptions.some((option) => option.value === selected[chartType])
    ? selected[chartType]
    : currentOptions[0]?.value
  const canAdd = chartType === 'spacer' || Boolean(selectedValue)

  async function addChart() {
    if (!canAdd) return
    onOpenChange(false)
    if (chartType === 'spacer') {
      onItemsChange([
        ...items,
        { name: 'spacer', type: 'spacer', layout: { x: 0, y: 0, w: 4, h: 2, i: 'spacer_' + getRandom(4) } },
      ])
      return
    }
    const data = await rpc<AnyRecord>({
      url: 'crm.api.dashboard.get_chart',
      params: { name: selectedValue, type: chartType, from_date: fromDate, to_date: toDate, user },
    })
    if (data?.error) {
      toast.error(data.error)
      return
    }
    const large = ['axis_chart', 'donut_chart'].includes(chartType)
    onItemsChange([
      ...items,
      {
        name: selectedValue,
        type: chartType,
        layout: { x: 0, y: 0, w: large ? 10 : 4, h: large ? 7 : 2, i: selectedValue + '_' + getRandom(4) },
        data,
      },
    ])
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={__('Add Chart')}
      actionsContent={() => (
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" label={__('Cancel')} onClick={() => onOpenChange(false)} />
          <Button variant="solid" label={__('Add')} disabled={!canAdd} onClick={() => void addChart()} />
        </div>
      )}
    >
      <div className="flex flex-col gap-4">
        <FormControl
          type="select"
          label={__('Chart Type')}
          value={chartType}
          options={chartTypes as never}
          onChange={setChartType}
        />
        {currentOptions.length > 0 && (
          <FormControl
            type="select"
            label={currentLabel}
            value={selectedValue}
            options={currentOptions as never}
            onChange={(value: string) => setSelected((current) => ({ ...current, [chartType]: value }))}
          />
        )}
      </div>
    </Dialog>
  )
}
