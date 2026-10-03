export interface ActivityModals {
  showTask: (task?: Record<string, any> | null) => void
  deleteTask: (name: string) => Promise<void>
  updateTaskStatus: (status: string, task: Record<string, any>) => void
  showNote: (note?: Record<string, any> | null) => void
  createCallLog: () => void
}

export interface ActivityData {
  versions: Array<Record<string, any>>
  calls: Array<Record<string, any>>
  notes: Array<Record<string, any>>
  tasks: Array<Record<string, any>>
  attachments: Array<Record<string, any>>
}
