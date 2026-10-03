import { __ } from '@/core/i18n'
import { Button, Combobox } from '@/design-system'

type AnyRecord = Record<string, any>

export interface WorkflowFieldTokenProps {
  fields: AnyRecord[]
  onInsert: (token: string) => void
}

export function WorkflowFieldToken({ fields, onInsert }: WorkflowFieldTokenProps) {
  const options = fields
    .filter((field) => field.fieldname)
    .map((field) => ({
      label: field.label || field.fieldname,
      description: field.fieldname,
      value: field.fieldname,
    }))
  if (!options.length) return null

  return (
    <Combobox
      value={null}
      options={options}
      placeholder={__('Search fields')}
      onChange={(value) => value && onInsert(`{{ doc.${value} }}`)}
      trigger={({ open, setOpen }) => (
        <Button
          variant="ghost"
          size="sm"
          iconLeft="lucide-braces"
          label={__('Insert field')}
          onClick={() => setOpen(!open)}
        />
      )}
    />
  )
}
