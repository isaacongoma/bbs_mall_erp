import { cn } from '@/design-system'

export interface TaskPriorityIconProps {
  priority?: string
  className?: string
}

export function TaskPriorityIcon({ className }: TaskPriorityIconProps) {
  return (
    <div className="grid place-items-center">
      <div className={cn('h-3 w-3 rounded-full', className)} />
    </div>
  )
}
