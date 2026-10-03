import { __ } from '@/core/i18n'
import { capabilitiesFor } from '../stores/workflowCapabilitiesStore'
import { ICON_TONES, type IconStyle } from './workflowIcons'

type AnyRecord = Record<string, any>

export interface TriggerOption extends IconStyle {
  value: string
  label: string
  description: string
}

export function documentTriggers(): TriggerOption[] {
  return [
    {
      value: 'Doc Created',
      icon: 'lucide-file-plus-corner',
      ...ICON_TONES.blue,
      label: __('Record is created'),
      description: __('Start a run whenever a new record is created.'),
    },
    {
      value: 'Doc Updated',
      icon: 'lucide-refresh-cw',
      ...ICON_TONES.cyan,
      label: __('Record is updated'),
      description: __('Start a run whenever an existing record is saved.'),
    },
    {
      value: 'Field Value Changed',
      icon: 'lucide-pencil-line',
      ...ICON_TONES.violet,
      label: __('Field value changes'),
      description: __('Watch one field and run when it moves to a new value.'),
    },
    {
      value: 'Doc Deleted',
      icon: 'lucide-trash-2',
      ...ICON_TONES.red,
      label: __('Record is deleted'),
      description: __('Start a run just after a record is deleted.'),
    },
    {
      value: 'Doc Submitted',
      icon: 'lucide-send',
      ...ICON_TONES.green,
      label: __('Record is submitted'),
      description: __('Start a run when a submittable record is submitted.'),
    },
    {
      value: 'Doc Cancelled',
      icon: 'lucide-circle-slash',
      ...ICON_TONES.gray,
      label: __('Record is cancelled'),
      description: __('Start a run when a submitted record is cancelled.'),
    },
  ]
}

export function otherTriggers(): TriggerOption[] {
  return [
    {
      value: 'Manual',
      icon: 'lucide-hand',
      ...ICON_TONES.teal,
      label: __('Launch manually'),
      description: __('Run only when someone starts it from a record.'),
    },
    {
      value: 'Scheduled',
      icon: 'lucide-clock',
      ...ICON_TONES.amber,
      label: __('On a schedule'),
      description: __('Run on a repeating schedule you define with cron.'),
    },
    {
      value: 'Date Based',
      icon: 'lucide-calendar-clock',
      ...ICON_TONES.orange,
      label: __('On a date'),
      description: __('Run before or after a date stored on the record.'),
    },
    {
      value: 'Custom Event',
      icon: 'lucide-webhook',
      ...ICON_TONES.pink,
      label: __('Custom event'),
      description: __('Run when the app raises a named event you pick.'),
    },
  ]
}

const EVENT_STYLES: Record<string, IconStyle> = {
  'crm.prospect_message_sent': { icon: 'lucide-mail', ...ICON_TONES.blue },
  'crm.prospect_message_received': { icon: 'lucide-inbox', ...ICON_TONES.teal },
  'crm.lead_qualified': { icon: 'lucide-badge-check', ...ICON_TONES.green },
  'crm.lead_converted': { icon: 'lucide-handshake', ...ICON_TONES.purple },
  'crm.deal_stage_changed': { icon: 'lucide-git-branch', ...ICON_TONES.violet },
  'crm.deal_won': { icon: 'lucide-trophy', ...ICON_TONES.green },
  'crm.deal_lost': { icon: 'lucide-circle-x', ...ICON_TONES.red },
  'crm.task_overdue': { icon: 'lucide-alarm-clock', ...ICON_TONES.amber },
}

function eventStyle(eventName: string): IconStyle {
  return EVENT_STYLES[eventName] || { icon: 'lucide-webhook', ...ICON_TONES.pink }
}

export function eventTriggers(doctype?: string | null): TriggerOption[] {
  return (capabilitiesFor(doctype)?.trigger_events || []).map((event: AnyRecord) => ({
    ...eventStyle(event.value),
    value: `Custom Event:${event.value}`,
    label: event.label,
    description: event.description,
  }))
}

export function triggerValue(doc?: AnyRecord | null): string {
  if (doc?.trigger_type === 'Custom Event' && doc.custom_event) return `Custom Event:${doc.custom_event}`
  return doc?.trigger_type || ''
}

export function triggerFromValue(value: string): { trigger_type: string; custom_event: string } {
  const [type = '', event = ''] = String(value || '').split(/:(.*)/)
  return { trigger_type: type, custom_event: event }
}

export function triggerGroups(doctype?: string | null) {
  const events = eventTriggers(doctype)
  return [
    { group: __('Records'), options: documentTriggers() },
    ...(events.length ? [{ group: __('Activity'), options: events }] : []),
    { group: __('Others'), options: otherTriggers() },
  ]
}

export function triggerDefinition(doc?: AnyRecord | null): TriggerOption | undefined {
  const value = triggerValue(doc)
  return [...documentTriggers(), ...otherTriggers(), ...eventTriggers(doc?.document_type)].find(
    (trigger) => trigger.value === value,
  )
}
