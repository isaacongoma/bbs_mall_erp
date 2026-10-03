import { __ } from '@/core/i18n'
import { capabilitiesFor } from '../stores/workflowCapabilitiesStore'
import { actionIcon, type IconStyle } from './workflowIcons'

type AnyRecord = Record<string, any>

export interface BlockOption extends Partial<IconStyle> {
  value: string
  label: string
  description: string
  values: AnyRecord
}

export interface BlockGroup {
  group: string
  options: BlockOption[]
}

function flowBlocks(): BlockOption[] {
  return [
    {
      value: 'If',
      icon: 'lucide-git-branch',
      tone: 'text-ink-green-7',
      label: __('If / Else'),
      description: __('Split the run into two arms on a condition.'),
      values: { step_type: 'If' },
    },
    {
      value: 'Wait',
      icon: 'lucide-timer',
      tone: 'text-ink-amber-7',
      label: __('Wait'),
      description: __('Pause the run for a fixed amount of time.'),
      values: { step_type: 'Wait', params: JSON.stringify({ unit: 'Minutes' }) },
    },
    {
      value: 'WaitForEvent',
      icon: 'lucide-webhook',
      tone: 'text-ink-amber-7',
      label: __('Wait for event'),
      description: __('Pause until an event is raised for this record.'),
      values: { step_type: 'WaitForEvent', params: JSON.stringify({ timeout_unit: 'Days' }) },
    },
  ]
}

function shortTitle(title?: string): string {
  return (title || '').replace(/^Frappe\s+/, '')
}

function groupLabel(action: AnyRecord): string {
  if (action.app === 'frappe') return __('Core')
  return shortTitle(action.app_title) || action.app || __('Other')
}

export function groupActionsByApp<T>(actions: AnyRecord[], toOption: (action: AnyRecord) => T) {
  const groups = new Map<string, T[]>()
  actions.forEach((action) => {
    const name = groupLabel(action)
    if (!groups.has(name)) groups.set(name, [])
    groups.get(name)?.push(toOption(action))
  })
  return [...groups].map(([group, options]) => ({ group, options }))
}

function actionBlock(action: AnyRecord): BlockOption {
  return {
    value: action.action_type,
    ...actionIcon(action.action_type),
    label: action.label || action.action_type,
    description: action.description || '',
    values: { step_type: 'Action', action_type: action.action_type },
  }
}

export function blockGroups(doctype?: string | null): BlockGroup[] {
  const actions = capabilitiesFor(doctype)?.actions || []
  return [{ group: __('Flow'), options: flowBlocks() }, ...groupActionsByApp(actions, actionBlock)].filter(
    (group) => group.options.length,
  )
}
