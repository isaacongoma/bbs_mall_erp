import { __ } from '@/core/i18n'
import { actionSchema, stepParams } from '../stores/workflowCapabilitiesStore'
import { toRows } from './workflowSteps'

type AnyRecord = Record<string, any>

function triggerRequirements(): Record<string, { field: string; label: string }> {
  return {
    'Field Value Changed': { field: 'trigger_field', label: __('a field to watch') },
    Scheduled: { field: 'cron_expression', label: __('a schedule') },
    'Date Based': { field: 'date_field', label: __('a date field') },
    'Custom Event': { field: 'custom_event', label: __('an event') },
  }
}

function isBlank(value: unknown): boolean {
  return value === undefined || value === null || value === ''
}

export function hasValues(value: unknown): boolean {
  if (!value) return false
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'object') return Object.keys(value as object).length > 0
  return true
}

function isEmpty(value: unknown): boolean {
  if (isBlank(value)) return true
  if (typeof value === 'object') return !hasValues(value)
  return ['[]', '{}'].includes(String(value).trim())
}

export function triggerIssue(doc: AnyRecord): string {
  if (!doc.trigger_type) return ''
  const required = triggerRequirements()[doc.trigger_type]
  if (!required || !isBlank(doc[required.field])) return ''
  return __('Pick {0}', [required.label])
}

function setFieldIssue(step: AnyRecord): string {
  const params = stepParams(step)
  return params.field || hasValues(params.values) ? '' : __('Choose a field to set')
}

function missingParamIssue(step: AnyRecord): string {
  const params = stepParams(step)
  const missing = (actionSchema(null, step.action_type)?.params_schema || [])
    .filter((param: AnyRecord) => param.reqd)
    .find((param: AnyRecord) => isEmpty(params[param.fieldname]))
  return missing ? __('{0} is required', [missing.label]) : ''
}

function actionIssue(step: AnyRecord): string {
  if (!step.action_type) return __('Pick an action')
  if (step.action_type === 'SetFieldValue') return setFieldIssue(step)
  return missingParamIssue(step)
}

export function stepIssue(step: AnyRecord): string {
  if (step.step_type === 'If') return step.step_condition ? '' : __('Set a condition')
  if (step.step_type === 'Wait') return stepParams(step).value ? '' : __('Set how long to wait')
  if (step.step_type === 'WaitForEvent') return stepParams(step).event_name ? '' : __('Pick an event')
  return actionIssue(step)
}

export function firstBlockingRow(actions: any[]): { row: AnyRecord; issue: string } | undefined {
  return toRows(actions)
    .map((row) => ({ row, issue: stepIssue(row) }))
    .find(({ issue }) => issue)
}
