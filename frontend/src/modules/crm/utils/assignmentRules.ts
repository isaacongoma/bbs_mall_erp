import { __ } from '@/core/i18n'
import type { ConditionList } from '@/shared/types/conditions'
import { validateConditions } from '@/shared/utils/conditions'

export interface AssigneeRow {
  user: string
  weight?: number
  full_name?: string
  email?: string
  user_image?: string | null
}

export interface AssignmentRuleData {
  assignCondition: string
  unassignCondition: string
  assignConditionJson: ConditionList
  unassignConditionJson: ConditionList
  rule: string
  priority: string | number
  users: AssigneeRow[]
  disabled: boolean
  description: string
  name: string
  assignmentRuleName: string
  assignmentDays: string[]
  documentType: string
  lastUser?: string
}

export interface AssignmentRuleErrors {
  assignmentRuleName: string
  assignCondition: string
  assignConditionError: string
  unassignConditionError: string
  users: string
  description: string
  assignmentDays: string
}

export type RuleField = keyof AssignmentRuleErrors | 'unassignCondition'

export const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export const PRIORITY_OPTIONS = [
  { label: 'Low', value: '0' },
  { label: 'Low-Medium', value: '1' },
  { label: 'Medium', value: '2' },
  { label: 'Medium-High', value: '3' },
  { label: 'High', value: '4' },
]

export const ROUTING_OPTIONS = [
  { label: 'Auto-rotate', value: 'Round Robin' },
  { label: 'Assign by workload', value: 'Load Balancing' },
]

export function emptyRule(): AssignmentRuleData {
  return {
    assignCondition: '',
    unassignCondition: '',
    assignConditionJson: [],
    unassignConditionJson: [],
    rule: 'Round Robin',
    priority: 1,
    users: [],
    disabled: false,
    description: '',
    name: '',
    assignmentRuleName: '',
    assignmentDays: [...WEEK_DAYS],
    documentType: 'CRM Lead',
  }
}

export function emptyErrors(): AssignmentRuleErrors {
  return {
    assignmentRuleName: '',
    assignCondition: '',
    assignConditionError: '',
    unassignConditionError: '',
    users: '',
    description: '',
    assignmentDays: '',
  }
}

export function ruleFromDoc(data: Record<string, any>): AssignmentRuleData {
  return {
    assignCondition: data.assign_condition,
    unassignCondition: data.unassign_condition,
    assignConditionJson: JSON.parse(data.assign_condition_json || '[]'),
    unassignConditionJson: JSON.parse(data.unassign_condition_json || '[]'),
    rule: data.rule,
    priority: data.priority,
    users: data.users ?? [],
    disabled: data.disabled,
    description: data.description,
    name: data.name,
    assignmentRuleName: data.name,
    assignmentDays: (data.assignment_days ?? []).map((day: { day: string }) => day.day),
    documentType: data.document_type,
    lastUser: data.last_user,
  }
}

export function validateRule(
  data: AssignmentRuleData,
  current: AssignmentRuleErrors,
  key?: RuleField,
  skipConditionCheck = false,
): AssignmentRuleErrors {
  const errors = { ...current }

  function validateField(field: RuleField) {
    if (key && field !== key) return
    switch (field) {
      case 'assignmentRuleName':
        errors.assignmentRuleName = data.assignmentRuleName?.length ? '' : __('Name is required')
        break
      case 'description':
        errors.description = data.description?.length > 0 ? '' : __('Description is required')
        break
      case 'assignCondition':
        if (skipConditionCheck) break
        errors.assignCondition = data.assignConditionJson?.length > 0 ? '' : __('Assign condition is required')
        errors.assignConditionError = validateConditions(data.assignConditionJson)
          ? ''
          : __('Assign conditions are invalid')
        break
      case 'unassignCondition':
        if (skipConditionCheck) break
        errors.unassignConditionError =
          data.unassignConditionJson?.length > 0 && !validateConditions(data.unassignConditionJson)
            ? __('Unassign conditions are invalid')
            : ''
        break
      case 'users':
        errors.users = data.users?.length > 0 ? '' : __('Users are required')
        break
      case 'assignmentDays':
        errors.assignmentDays = data.assignmentDays?.length > 0 ? '' : __('Assignment Days are required')
        break
      default:
        break
    }
  }

  if (key) validateField(key)
  else (Object.keys(errors) as RuleField[]).forEach(validateField)
  return errors
}

export function describeErrors(errors: AssignmentRuleErrors): string {
  const labels: Record<string, string> = {
    assignmentRuleName: __('Name'),
    description: __('Description'),
    assignCondition: __('Assignment Condition'),
    assignConditionError: __('Assignment Condition'),
    unassignConditionError: __('Unassignment Condition'),
    users: __('Users'),
    assignmentDays: __('Assignment Days'),
  }
  const entries = Object.entries(errors)
    .filter(([, message]) => message)
    .map(([key, message]) => ({ label: labels[key] ?? key, message }))
  const missing = entries.filter((entry) => entry.message.toLowerCase().includes('required')).map((e) => e.label)
  const invalid = entries.filter((entry) => !entry.message.toLowerCase().includes('required')).map((e) => e.label)
  if (missing.length) return __('Missing mandatory fields: {0}', [missing.join(', ')])
  if (invalid.length) return __('Invalid fields: {0}', [invalid.join(', ')])
  return ''
}
