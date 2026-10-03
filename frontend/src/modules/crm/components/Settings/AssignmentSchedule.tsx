import { __ } from '@/core/i18n'
import { ErrorMessage, Switch } from '@/design-system'
import { WEEK_DAYS } from '../../utils/assignmentRules'

export interface AssignmentScheduleProps {
  days: string[]
  error: string
  onChange: (days: string[]) => void
}

export function AssignmentSchedule({ days, error, onChange }: AssignmentScheduleProps) {
  function toggle(day: string, active: boolean) {
    onChange(active ? (days.includes(day) ? days : [...days, day]) : days.filter((entry) => entry !== day))
  }

  return (
    <>
      <div className="rounded-md border border-outline-gray-2 px-2 text-sm">
        <div className="grid items-center p-2 px-4" style={{ gridTemplateColumns: '3fr 1fr' }}>
          {['Days', 'Active'].map((label) => (
            <div key={label} className="overflow-hidden text-ellipsis whitespace-nowrap text-ink-gray-5">
              {__(label)}
            </div>
          ))}
        </div>
        <hr />
        {WEEK_DAYS.map((day, index) => (
          <div key={day}>
            <div className="grid items-center px-4 py-3.5" style={{ gridTemplateColumns: '3fr 1fr' }}>
              <div className="font-medium text-ink-gray-7">{__(day)}</div>
              <div className="flex justify-start">
                <Switch value={days.includes(day)} onChange={(active) => toggle(day, active)} />
              </div>
            </div>
            {index !== WEEK_DAYS.length - 1 && <hr />}
          </div>
        ))}
      </div>
      <ErrorMessage message={error} className="mt-2" />
    </>
  )
}
