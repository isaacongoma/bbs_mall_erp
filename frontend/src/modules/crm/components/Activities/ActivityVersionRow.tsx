import { __ } from '@/core/i18n'
import { Button } from '@/design-system'
import { SelectIcon } from '@/shared/components/Icons'
import { UserAvatar } from '@/shared/components/UserAvatar'
import { useUsers } from '@/shared/hooks/useUsers'
import { startCase } from '@/shared/utils/text'
import { sortByCreation } from '../../utils/activities'
import { TimelineTimestamp } from './TimelineTimestamp'

type AnyRecord = Record<string, any>

export interface ActivityVersionRowProps {
  activity: AnyRecord
  showOthers: boolean
  onToggleOthers: () => void
}

function ValueCell({ value, options }: { value: string; options?: string }) {
  const { getUser } = useUsers()
  return (
    <span className="max-w-xs font-medium text-ink-gray-8">
      {options === 'User' ? (
        <div className="flex items-center gap-1">
          <UserAvatar user={value} size="xs" />
          {getUser(value).full_name}
        </div>
      ) : (
        <div className="truncate">{value}</div>
      )}
    </span>
  )
}

export function ActivityVersionRow({ activity, showOthers, onToggleOthers }: ActivityVersionRowProps) {
  return (
    <div className="mb-4 flex flex-col gap-2 py-1.5">
      <div className="flex items-center justify-stretch gap-2 text-base">
        {activity.other_versions ? (
          <div className="inline-flex flex-wrap gap-1.5 font-medium text-ink-gray-8">
            <span>{showOthers ? __('Hide') : __('Show')}</span>
            <span> +{activity.other_versions.length + 1} </span>
            <span>{__('changes from')}</span>
            <span>{activity.owner_name}</span>
            <Button className="!size-4" variant="ghost" icon={SelectIcon} onClick={onToggleOthers} />
          </div>
        ) : (
          <div className="inline-flex flex-wrap items-center gap-1 text-ink-gray-5">
            <span className="font-medium text-ink-gray-8">{activity.owner_name}</span>
            {activity.type && <span>{__(activity.type)}</span>}
            {activity.data?.field_label && (
              <span className="max-w-xs truncate font-medium text-ink-gray-8">{__(activity.data.field_label)}</span>
            )}
            {activity.value && <span>{__(activity.value)}</span>}
            {activity.data?.old_value && <ValueCell value={activity.data.old_value} options={activity.options} />}
            {activity.to && <span>{__('to')}</span>}
            {activity.data?.value && <ValueCell value={activity.data.value} options={activity.options} />}
          </div>
        )}
        <div className="ml-auto whitespace-nowrap">
          <TimelineTimestamp date={activity.creation} />
        </div>
      </div>
      {activity.other_versions && showOthers && (
        <div className="flex flex-col gap-0.5">
          {sortByCreation([activity, ...activity.other_versions]).map((version) => (
            <div key={version.creation} className="flex items-start justify-stretch gap-2 py-1.5 text-base">
              <div className="inline-flex flex-wrap gap-1 text-ink-gray-5">
                {version.data?.field_label && (
                  <span className="max-w-xs truncate text-ink-gray-5">{__(version.data.field_label)}</span>
                )}
                <span className="lucide-arrow-right mx-1 h-4 w-4 text-ink-gray-5" aria-hidden="true" />
                {version.type && <span>{startCase(__(version.type))}</span>}
                {version.data?.old_value && <ValueCell value={version.data.old_value} options={version.options} />}
                {version.to && <span>{__('to')}</span>}
                {version.data?.value && <ValueCell value={version.data.value} options={version.options} />}
              </div>
              <div className="ml-auto whitespace-nowrap">
                <TimelineTimestamp date={version.creation} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
