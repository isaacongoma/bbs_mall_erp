import { FormControl } from '@/design-system'
import { incomingOutgoingFields, type EmailAccountState, type EmailField } from '../../utils/emailConfig'

export interface EmailAccountFieldsProps {
  fields: EmailField[]
  state: EmailAccountState
  onChange: (patch: Partial<EmailAccountState>) => void
}

export function EmailAccountFields({ fields, state, onChange }: EmailAccountFieldsProps) {
  return (
    <>
      <div className="grid grid-cols-1 gap-4">
        {fields.map((field) => (
          <div key={field.name} className="flex flex-col gap-1">
            <FormControl
              type={field.type as 'text'}
              label={field.label}
              name={field.name}
              placeholder={field.placeholder}
              value={(state[field.name] as string | null) ?? ''}
              onChange={(value: string) => onChange({ [field.name]: value })}
            />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4">
        {incomingOutgoingFields()
          .filter((field) => !field.condition || field.condition(state))
          .map((field) => (
            <div key={field.name} className="flex flex-col gap-1">
              <FormControl
                type="checkbox"
                label={field.label}
                name={field.name}
                value={Boolean(state[field.name])}
                onChange={(value: boolean) => onChange({ [field.name]: value })}
              />
              <p className="text-p-sm text-ink-gray-4">{field.description}</p>
            </div>
          ))}
      </div>
    </>
  )
}
