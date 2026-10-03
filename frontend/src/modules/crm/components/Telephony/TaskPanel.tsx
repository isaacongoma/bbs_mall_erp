import '../../styles/telephony.css'
import { __ } from '@/core/i18n'
import { Button, DateTimePicker, Dropdown, FormControl, Tooltip } from '@/design-system'
import { Link } from '@/shared/components/Controls/Link'
import { RichTextField } from '@/shared/components/RichTextField'
import { UserAvatar } from '@/shared/components/UserAvatar'
import { useUsers } from '@/shared/hooks/useUsers'
import { getFormat } from '@/shared/utils/date'
import { taskPriorityOptions, taskStatusOptions } from '../../utils/tasks'
import { type CallTask } from '../../utils/telephony'
import { TaskPriorityIcon, TaskStatusIcon } from '../Icons'

export interface TaskPanelProps {
  task: CallTask
  onChange: (task: CallTask) => void
}

export function TaskPanel({ task, onChange }: TaskPanelProps) {
  const { crmUsers, getUser } = useUsers()

  function patch(values: Partial<CallTask>) {
    onChange({ ...task, ...values })
  }

  return (
    <div className="h-[294px] text-base">
      <FormControl
        type="text"
        variant="ghost"
        className="call-task-title mb-2"
        placeholder={__('Schedule a task...')}
        value={task.title}
        onChange={(value: string) => patch({ title: value })}
      />
      <RichTextField
        editorClass="prose-sm h-[150px] text-ink-base overflow-auto"
        content={task.description}
        placeholder={__('Add description...')}
        onChange={(value) => patch({ description: value })}
      />
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <Dropdown options={taskStatusOptions((status: string) => patch({ status }), null) as never}>
            <Button label={task.status} className="bg-surface-gray-9 text-ink-base hover:bg-surface-gray-8">
              <TaskStatusIcon status={task.status} />
            </Button>
          </Dropdown>
          <Dropdown options={taskPriorityOptions((priority: string) => patch({ priority }), null) as never}>
            <Button label={task.priority} className="bg-surface-gray-9 text-ink-base hover:bg-surface-gray-8">
              <TaskPriorityIcon priority={task.priority} />
            </Button>
          </Dropdown>
        </div>
        <Link
          className="call-task-user"
          value={getUser(task.assigned_to).full_name}
          doctype="User"
          placeholder={__('John Doe')}
          filters={{ name: ['in', crmUsers.map((user) => user.name)], ignore_user_type: 1 }}
          hideMe
          onChange={(option) => patch({ assigned_to: option })}
          prefix={() => <UserAvatar className="mr-2 !h-4 !w-4" user={task.assigned_to} />}
          itemPrefix={({ item }) => <UserAvatar className="mr-2" user={item.value as string} size="sm" />}
          itemLabel={({ item }) => (
            <Tooltip text={item.value as string}>
              <div className="cursor-pointer text-ink-gray-9">{getUser(item.value as string).full_name}</div>
            </Tooltip>
          )}
        />
        <DateTimePicker
          className="call-task-datepicker w-36"
          value={task.due_date}
          placeholder={__('01/04/2024 11:30 PM')}
          format={getFormat('', '', true, true, false)}
          onChange={(value) => patch({ due_date: value })}
        />
      </div>
    </div>
  )
}
