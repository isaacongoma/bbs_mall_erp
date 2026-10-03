import type { ComponentType } from 'react'
import { TaskPriorityIcon, TaskStatusIcon } from '../components/Icons'
import { getMeta } from '@/shared/stores/metaStore'

type IconComponent = ComponentType<{ className?: string }>

const statusIcons = new Map<string, IconComponent>()
const priorityIcons = new Map<string, IconComponent>()

function statusIcon(status: string): IconComponent {
  let icon = statusIcons.get(status)
  if (!icon) {
    icon = (props) => <TaskStatusIcon status={status} className={props.className} />
    statusIcons.set(status, icon)
  }
  return icon
}

function priorityIcon(priority: string): IconComponent {
  let icon = priorityIcons.get(priority)
  if (!icon) {
    icon = (props) => <TaskPriorityIcon priority={priority} className={props.className} />
    priorityIcons.set(priority, icon)
  }
  return icon
}

function fieldOptionValues(fieldname: string, fallback: string[]): string[] {
  const field = getMeta('CRM Task')
    .getFields()
    ?.find((candidate) => candidate.fieldname === fieldname)
  if (!field || !Array.isArray(field.options)) return fallback
  return field.options.map((option: { value: string }) => option.value).filter(Boolean)
}

export interface TaskOption {
  label: string
  icon: IconComponent
  onClick: () => unknown
}

export function taskStatusOptions<T>(
  action: ((status: string, data: T) => unknown) | null | undefined,
  data: T,
): TaskOption[] {
  const options = fieldOptionValues('status', ['Backlog', 'Todo', 'In Progress', 'Done', 'Canceled'])
  return options.map((status) => ({
    icon: statusIcon(status),
    label: status,
    onClick: () => action && action(status, data),
  }))
}

export function taskPriorityOptions<T>(
  action: ((priority: string, data: T) => unknown) | null | undefined,
  data: T,
): TaskOption[] {
  const options = fieldOptionValues('priority', ['Low', 'Medium', 'High'])
  return options.map((priority) => ({
    label: priority,
    icon: priorityIcon(priority),
    onClick: () => action && action(priority, data),
  }))
}
