import type { DocField } from '../../types/meta'
import { useFieldLayout } from '../../hooks/useFieldLayout'
import { Field } from './Field'

const FULL_WIDTH_TYPES = new Set([
  'Table',
  'Table MultiSelect',
  'Text',
  'Small Text',
  'Long Text',
  'Code',
  'Text Editor',
  'Markdown Editor',
  'HTML Editor',
  'JSON',
  'HTML',
  'Button',
  'Heading',
  'Image',
  'Geolocation',
  'Attach Image',
])

export interface LayoutColumn {
  name: string
  label?: string
  hideLabel?: boolean
  fields: DocField[]
}

export interface ColumnProps {
  column: LayoutColumn
  className?: string
  single?: boolean
}

export function Column({ column, className, single = false }: ColumnProps) {
  const { standalone, doctype } = useFieldLayout()
  const limitWidth = single && standalone && Boolean(doctype)
  return (
    <div className={`column flex min-w-0 flex-1 flex-col gap-4 ${className ?? ''}`} data-name={column.name}>
      {column.label && !column.hideLabel && <div className="max-w-fit text-base text-ink-gray-9">{column.label}</div>}
      {column.fields?.map((field) => (
        <Field key={field.fieldname} field={field} limitWidth={limitWidth && !FULL_WIDTH_TYPES.has(field.fieldtype)} />
      ))}
    </div>
  )
}
