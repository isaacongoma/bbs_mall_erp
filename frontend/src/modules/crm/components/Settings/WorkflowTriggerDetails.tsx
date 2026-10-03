import { __ } from '@/core/i18n'
import { FormControl } from '@/design-system'
import { eventTriggers, triggerValue } from '../../utils/workflowTriggers'

type AnyRecord = Record<string, any>

export interface WorkflowTriggerDetailsProps {
  doc: AnyRecord
  fields: AnyRecord[]
  events: AnyRecord[]
  onUpdate: (patch: AnyRecord) => void
}

export function WorkflowTriggerDetails({ doc, fields, events, onUpdate }: WorkflowTriggerDetailsProps) {
  const isNamedEvent = eventTriggers(doc.document_type).some((trigger) => trigger.value === triggerValue(doc))
  const fieldOptions = fields.map((field) => ({ label: field.label || field.fieldname, value: field.fieldname }))
  const dateFieldOptions = fields
    .filter((field) => ['Date', 'Datetime'].includes(field.fieldtype))
    .map((field) => ({ label: field.label || field.fieldname, value: field.fieldname }))

  return (
    <div className="space-y-4">
      {doc.trigger_type === 'Field Value Changed' && (
        <>
          <FormControl
            type="select"
            variant="outline"
            label={__('Trigger Field')}
            required
            options={fieldOptions}
            value={doc.trigger_field ?? ''}
            onChange={(value: string) => onUpdate({ trigger_field: value })}
          />
          <FormControl
            variant="outline"
            label={__('From Value')}
            value={doc.from_value ?? ''}
            onChange={(value: string) => onUpdate({ from_value: value })}
          />
          <FormControl
            variant="outline"
            label={__('To Value')}
            value={doc.to_value ?? ''}
            onChange={(value: string) => onUpdate({ to_value: value })}
          />
        </>
      )}
      {doc.trigger_type === 'Scheduled' && (
        <FormControl
          variant="outline"
          label={__('Cron Expression')}
          required
          placeholder="0 9 * * *"
          value={doc.cron_expression ?? ''}
          onChange={(value: string) => onUpdate({ cron_expression: value })}
        />
      )}
      {doc.trigger_type === 'Date Based' && (
        <>
          <FormControl
            type="select"
            variant="outline"
            label={__('Date Field')}
            required
            options={dateFieldOptions}
            value={doc.date_field ?? ''}
            onChange={(value: string) => onUpdate({ date_field: value })}
          />
          <FormControl
            type="number"
            variant="outline"
            label={__('Date Offset')}
            value={doc.date_offset ?? 0}
            onChange={(value: string) => onUpdate({ date_offset: value })}
          />
          <FormControl
            type="select"
            variant="outline"
            label={__('Date Direction')}
            options={['Before', 'After']}
            value={doc.date_direction ?? 'Before'}
            onChange={(value: string) => onUpdate({ date_direction: value })}
          />
        </>
      )}
      {doc.trigger_type === 'Custom Event' && !isNamedEvent && (
        <FormControl
          type="select"
          variant="outline"
          label={__('Custom Event')}
          required
          options={events as never}
          value={doc.custom_event ?? ''}
          onChange={(value: string) => onUpdate({ custom_event: value })}
        />
      )}
    </div>
  )
}
