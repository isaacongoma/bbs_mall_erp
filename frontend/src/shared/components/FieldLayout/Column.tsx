import type { DocField } from '../../types/meta'
import { Field } from './Field'

export interface LayoutColumn {
  name: string
  label?: string
  hideLabel?: boolean
  fields: DocField[]
}

export interface ColumnProps {
  column: LayoutColumn
  className?: string
}

export function Column({ column, className }: ColumnProps) {
  return (
    <div className={`column flex min-w-0 flex-1 flex-col gap-4 ${className ?? ''}`} data-name={column.name}>
      {column.label && !column.hideLabel && <div className="max-w-fit text-base text-ink-gray-9">{column.label}</div>}
      {column.fields?.map((field) => (
        <Field key={field.fieldname} field={field} />
      ))}
    </div>
  )
}
