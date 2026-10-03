import { __ } from '@/core/i18n'
import { Avatar, Button, ErrorMessage, Tooltip } from '@/design-system'
import { useUsers } from '@/shared/hooks/useUsers'
import { ROUTING_OPTIONS, type AssigneeRow, type AssignmentRuleData } from '../../utils/assignmentRules'
import { AssigneeSearch } from './AssigneeSearch'
import { PopoverSelect } from './PopoverSelect'

export interface AssigneeRulesProps {
  data: AssignmentRuleData
  usersError: string
  onChange: (patch: Partial<AssignmentRuleData>) => void
  onUsersChanged: (users: AssigneeRow[]) => void
}

export function AssigneeRules({ data, usersError, onChange, onUsersChanged }: AssigneeRulesProps) {
  const { getUser } = useUsers()
  const documentType = data.documentType === 'CRM Lead' ? __('leads') : __('deals')

  function remove(email: string) {
    onUsersChanged(data.users.filter((row) => row.user !== email))
  }

  return (
    <div>
      <div className="flex flex-col gap-1">
        <span className="text-lg-semibold text-ink-gray-8">{__('Assignee Rules')}</span>
        <span className="text-p-sm text-ink-gray-6">
          {__('Choose how {0} are assigned among salespeople.', [documentType])}
        </span>
      </div>
      <div className="mt-8 flex items-center justify-between gap-2">
        <div>
          <div className="text-base-medium text-ink-gray-8">
            {__('{0} routing', [data.documentType === 'CRM Lead' ? __('Lead') : __('Deal')])}
          </div>
          <div className="mt-1 text-p-sm text-ink-gray-6">
            {__('Choose how {0} are assigned among the selected assignees.', [documentType])}
          </div>
        </div>
        <div>
          <PopoverSelect
            placement="bottom-end"
            options={ROUTING_OPTIONS}
            value={data.rule}
            onChange={(rule) => onChange({ rule })}
            triggerClassName="min-w-40 select-none"
            bodyClassName="mt-1 w-48 shadow-xl text-ink-gray-7"
            optionClassName="text-sm"
          />
        </div>
      </div>
      <div className="mt-7 flex items-center justify-between gap-2">
        <div>
          <div className="text-base-medium text-ink-gray-8">{__('Assignees')}</div>
          <div className="mt-1 text-p-sm text-ink-gray-6">{__('Select the assignees for {0}.', [documentType])}</div>
        </div>
        <AssigneeSearch assigned={data.users} onAdd={(row) => onUsersChanged([...data.users, row])} />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {data.users.map((row) => {
          const user = getUser(row.user)
          return (
            <div
              key={user.name}
              className="flex w-max select-none items-center gap-2 rounded-md bg-surface-gray-2 p-1 px-2 text-sm"
            >
              <Avatar image={user.user_image} label={user.full_name} size="sm" />
              <div className="text-ink-gray-7">{user.full_name}</div>
              {user.email === data.lastUser && (
                <Tooltip text={__('Last user assigned by this rule')} hoverDelay={0.35} placement="top">
                  <div className="select-none rounded-full bg-blue-600 p-0.5 px-2 text-xs text-white">{__('Last')}</div>
                </Tooltip>
              )}
              <Button variant="ghost" icon="lucide-x" onClick={() => remove(row.user)} />
            </div>
          )
        })}
      </div>
      <ErrorMessage message={usersError} />
    </div>
  )
}
