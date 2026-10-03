import { __ } from '@/core/i18n'
import { Button, Dropdown, Tooltip, createDialog } from '@/design-system'
import { CalendarIcon } from '@/shared/components/Icons'
import { DotIcon } from '@/shared/components/Icons'
import { UserAvatar } from '@/shared/components/UserAvatar'
import { useUsers } from '@/shared/hooks/useUsers'
import { formatDate } from '@/shared/utils/date'
import { TaskPriorityIcon, TaskStatusIcon } from '../Icons'
import { taskStatusOptions } from '../../utils/tasks'
import type { ActivityModals } from '../../types/activities'

export interface TaskAreaProps {
  tasks: Array<Record<string, any>>
  modalRef: ActivityModals
  doctype?: string
}

export function TaskArea({ tasks, modalRef }: TaskAreaProps) {
  const { getUser } = useUsers()

  function confirmDelete(name: string) {
    createDialog({
      title: __('Delete Task'),
      message: __('Are you sure you want to delete this task?'),
      actions: [
        {
          label: __('Delete'),
          theme: 'red',
          variant: 'solid',
          onClick: ({ close }) => {
            void modalRef.deleteTask(name)
            close()
          },
        },
      ],
    })
  }

  if (!tasks.length) return null

  return (
    <div>
      {tasks.map((task, index) => (
        <div key={task.name}>
          <div
            className="activity flex cursor-pointer gap-6 rounded p-2.5 duration-300 ease-in-out hover:bg-surface-gray-1"
            onClick={() => modalRef.showTask(task)}
          >
            <div className="flex flex-1 flex-col gap-1.5 truncate text-base">
              <div className="truncate font-medium text-ink-gray-9">{task.title}</div>
              <div className="flex gap-1.5 text-ink-gray-8">
                <div className="flex items-center gap-1.5">
                  <UserAvatar user={task.assigned_to} size="xs" />
                  {getUser(task.assigned_to).full_name}
                </div>
                {task.due_date && (
                  <>
                    <div className="flex items-center justify-center">
                      <DotIcon className="h-2.5 w-2.5 text-ink-gray-5" radius={2} />
                    </div>
                    <div>
                      <Tooltip text={formatDate(task.due_date, 'ddd, MMM D, YYYY | hh:mm a')}>
                        <div className="flex gap-2">
                          <CalendarIcon />
                          <div>{formatDate(task.due_date, 'D MMM, hh:mm a')}</div>
                        </div>
                      </Tooltip>
                    </div>
                  </>
                )}
                <div className="flex items-center justify-center">
                  <DotIcon className="h-2.5 w-2.5 text-ink-gray-5" radius={2} />
                </div>
                <div className="flex gap-2">
                  <TaskPriorityIcon className="!h-2 !w-2" priority={task.priority} />
                  {task.priority}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Dropdown options={taskStatusOptions(modalRef.updateTaskStatus, task) as never}>
                <Button
                  tooltip={__('Change Status')}
                  variant="ghost"
                  className="hover:bg-surface-gray-4"
                  onClick={(event) => {
                    event.stopPropagation()
                    event.preventDefault()
                  }}
                >
                  <TaskStatusIcon status={task.status} />
                </Button>
              </Dropdown>
              <Dropdown
                options={[{ label: __('Delete'), icon: 'lucide-trash-2', onClick: () => confirmDelete(task.name) }]}
              >
                <Button
                  icon="lucide-more-horizontal"
                  variant="ghost"
                  className="text-ink-gray-9 hover:bg-surface-gray-4"
                  onClick={(event) => {
                    event.stopPropagation()
                    event.preventDefault()
                  }}
                />
              </Dropdown>
            </div>
          </div>
          {index < tasks.length - 1 && <div className="mx-2 h-px border-t border-outline-elevation-2" />}
        </div>
      ))}
    </div>
  )
}
