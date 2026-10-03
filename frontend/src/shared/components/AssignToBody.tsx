import { __ } from '@/core/i18n'
import { Switch, Tooltip } from '@/design-system'
import { useUsers } from '../hooks/useUsers'
import type { Assignee } from './AssignmentModal'
import { Link } from './Controls/Link'
import { UserAvatar } from './UserAvatar'

export interface AssignToBodyProps {
  assignees: Assignee[]
  onAssigneesChange: (assignees: Assignee[]) => void
}

export function AssignToBody({ assignees, onAssigneesChange }: AssignToBodyProps) {
  const { crmUsers, getUser } = useUsers()
  const me = getUser('')
  const assignToMe = assignees.some((assignee) => assignee.name === me.name)

  function removeValue(name: string) {
    onAssigneesChange(assignees.filter((assignee) => assignee.name !== name))
  }

  function addValue(name: string) {
    if (!name) return
    const user = getUser(name)
    if (!assignees.some((assignee) => assignee.name === name)) {
      onAssigneesChange([...assignees, { name, image: user.user_image, label: user.full_name }])
    }
  }

  function toggleAssignToMe(value: boolean) {
    if (value) addValue(me.name)
    else onAssigneesChange(assignees.filter((assignee) => assignee.name !== me.name))
  }

  return (
    <div className="my-2 flex w-[470px] flex-col gap-2 rounded-lg bg-surface-elevation-2 p-3 shadow-2xl ring-1 ring-black/5 focus:outline-none">
      <div className="text-base text-ink-gray-5">{__('Assign To')}</div>
      <Link
        className="form-control"
        value=""
        doctype="User"
        placeholder={__('John Doe')}
        filters={{ name: ['in', crmUsers.map((user) => user.name)], ignore_user_type: 1 }}
        hideMe
        onChange={addValue}
        target={({ togglePopover }) => (
          <div
            className="flex min-h-12 w-full cursor-text flex-wrap items-center gap-1.5 rounded-lg bg-surface-gray-2 p-1.5 pb-5"
            onClick={(event) => {
              event.stopPropagation()
              togglePopover()
            }}
          >
            {assignees.map((assignee) => (
              <Tooltip key={assignee.name} text={assignee.name}>
                <div
                  className="flex cursor-pointer items-center rounded-full border border-outline-gray-1 bg-surface-elevation-2 p-0.5 text-sm text-ink-gray-6"
                  onClick={(event) => event.stopPropagation()}
                >
                  <UserAvatar user={assignee.name} size="sm" />
                  <div className="ml-1">{getUser(assignee.name).full_name}</div>
                  <button
                    type="button"
                    className="m-1 grid size-4 place-items-center rounded-full hover:bg-surface-gray-3"
                    onClick={(event) => {
                      event.stopPropagation()
                      removeValue(assignee.name)
                    }}
                  >
                    <span className="lucide-x h-3 w-3 text-ink-gray-6" aria-hidden="true" />
                  </button>
                </div>
              </Tooltip>
            ))}
          </div>
        )}
        itemPrefix={({ item }) => <UserAvatar className="mr-2" user={String(item.value)} size="sm" />}
        itemLabel={({ item }) => (
          <Tooltip text={String(item.value)}>
            <div className="cursor-pointer text-ink-gray-9">{getUser(String(item.value)).full_name}</div>
          </Tooltip>
        )}
      />
      <div className="flex items-center justify-between gap-2">
        <div
          className="cursor-pointer select-none text-base text-ink-gray-5"
          onClick={() => toggleAssignToMe(!assignToMe)}
        >
          {__('Assign To Me')}
        </div>
        <span onClick={(event) => event.stopPropagation()}>
          <Switch value={assignToMe} onChange={toggleAssignToMe} />
        </span>
      </div>
    </div>
  )
}
