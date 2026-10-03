import { cn } from '@/design-system'
import { IndicatorIcon, PhoneIcon } from '../Icons'
import { MultipleAvatar } from '../MultipleAvatar'
import type { DocCellApi } from './DocListView'

export function visitedLabelClass(isVisited: boolean): string {
  return isVisited ? 'text-ink-gray-6' : 'font-medium text-ink-gray-9'
}

export function assignPrefix(api: DocCellApi) {
  if (api.column.key !== '_assign') return undefined
  return (
    <div className="flex items-center truncate">
      <MultipleAvatar
        avatars={api.item}
        size="sm"
        labelClass={cn(visitedLabelClass(api.isVisited))}
        onClick={api.applyFilter}
      />
    </div>
  )
}

export function statusPrefix(api: DocCellApi) {
  if (api.column.key !== 'status') return undefined
  return (
    <div>
      <IndicatorIcon className={api.item.color} />
    </div>
  )
}

export function mobilePrefix(api: DocCellApi) {
  if (api.column.key !== 'mobile_no' || !api.item) return undefined
  return (
    <div>
      <PhoneIcon className="h-4 w-4" />
    </div>
  )
}
