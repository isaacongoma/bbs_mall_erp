import { __ } from '@/core/i18n'
import { AxisChart, DonutChart, NumberChart, Tooltip } from '@/design-system'

type AnyRecord = Record<string, any>

export interface DashboardItemProps {
  item: AnyRecord
  editing?: boolean
}

export function DashboardItem({ item, editing = false }: DashboardItemProps) {
  if (item.type === 'number_chart') {
    return (
      <div className="h-full w-full">
        <div className="flex h-full w-full cursor-pointer overflow-hidden rounded shadow">
          <Tooltip text={__(item.data?.tooltip)}>
            <div className="h-full w-full">
              {item.data && <NumberChart className="!items-start" config={item.data} />}
            </div>
          </Tooltip>
        </div>
      </div>
    )
  }
  if (item.type === 'spacer') {
    return (
      <div className="h-full w-full">
        <div
          className={`flex h-full items-center justify-center overflow-hidden rounded bg-surface-base text-ink-gray-5 ${
            editing ? 'border border-dashed border-outline-gray-2' : ''
          }`}
        >
          {editing ? __('Spacer') : ''}
        </div>
      </div>
    )
  }
  if (item.type === 'axis_chart') {
    return (
      <div className="h-full w-full">
        <div className="h-full w-full rounded-md bg-surface-base shadow">
          {item.data && <AxisChart config={item.data} />}
        </div>
      </div>
    )
  }
  if (item.type === 'donut_chart') {
    return (
      <div className="h-full w-full">
        <div className="h-full w-full overflow-hidden rounded-md bg-surface-base shadow">
          {item.data && <DonutChart config={item.data} />}
        </div>
      </div>
    )
  }
  return null
}
