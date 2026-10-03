export interface CallTask {
  name: string
  title: string
  description: string
  assigned_to: string
  due_date: string
  status: string
  priority: string
}

export const EMPTY_CALL_TASK: CallTask = {
  name: '',
  title: '',
  description: '',
  assigned_to: '',
  due_date: '',
  status: 'Backlog',
  priority: 'Low',
}
