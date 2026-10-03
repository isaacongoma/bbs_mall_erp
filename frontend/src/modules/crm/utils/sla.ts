import { __ } from '@/core/i18n'
import type { ConditionList } from '@/shared/types/conditions'
import { validateConditions } from '@/shared/utils/conditions'

export interface SlaPriority {
  priority: string
  first_response_time: number | null
  default_priority: boolean
}

export interface SlaWorkday {
  workday: string
  start_time: string
  end_time: string
  id?: string
}

export interface SlaData {
  name: string
  sla_name: string
  apply_on: string
  enabled: boolean
  default: boolean
  rolling_responses: boolean
  start_date: string
  end_date: string
  condition: string
  condition_json: ConditionList
  priorities: SlaPriority[]
  holiday_list: string
  working_hours: SlaWorkday[]
  [key: string]: unknown
}

export type SlaErrors = Record<
  | 'sla_name'
  | 'enabled'
  | 'default_sla'
  | 'apply_sla_for_resolution'
  | 'priorities'
  | 'holiday_list'
  | 'default_priority'
  | 'start_date'
  | 'end_date'
  | 'working_hours'
  | 'condition',
  string
>

export const WORKDAY_OPTIONS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(
  (day) => ({ label: day, value: day }),
)

export function defaultWorkingHours(): SlaWorkday[] {
  return ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((workday) => ({
    workday,
    start_time: '09:00:00',
    end_time: '17:00:00',
  }))
}

export function emptySla(): SlaData {
  return {
    name: '',
    sla_name: '',
    apply_on: 'CRM Lead',
    enabled: true,
    default: false,
    rolling_responses: false,
    start_date: '',
    end_date: '',
    condition: '',
    condition_json: [],
    priorities: [],
    holiday_list: '',
    working_hours: defaultWorkingHours(),
  }
}

export function emptySlaErrors(): SlaErrors {
  return {
    sla_name: '',
    enabled: '',
    default_sla: '',
    apply_sla_for_resolution: '',
    priorities: '',
    holiday_list: '',
    default_priority: '',
    start_date: '',
    end_date: '',
    working_hours: '',
    condition: '',
  }
}

export function formatTime(time?: string): string {
  if (!time) return '00:00'
  const [hours, minutes] = time.split(':')
  const date = new Date()
  date.setHours(parseInt(hours ?? '0') || 0, parseInt(minutes ?? '0') || 0, 0)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
}

export function formatTimeToHHMMSS(value: string): string {
  const match = value?.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/)
  if (!match) return ''
  const [, hours = '', minutes = '', seconds = '00'] = match
  return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:${seconds.padStart(2, '0')}`
}

function parseTime(value: string): Date {
  const [hours = 0, minutes = 0] = value.split(':').map(Number)
  const date = new Date()
  date.setHours(hours, minutes || 0, 0, 0)
  return date
}

function validatePriorities(data: SlaData): string {
  if (!Array.isArray(data.priorities) || data.priorities.length === 0) return __('At least one priority is required')
  const problems: string[] = []
  data.priorities.forEach((priority, index) => {
    const number = index + 1
    if (!priority.priority?.trim()) problems.push(__('Priority {0}: priority name is required', [number]))
    if (!priority.first_response_time || priority.first_response_time === 0) {
      problems.push(__('Priority {0}: response time is required', [number]))
    }
  })
  const names = data.priorities.map((priority) => priority.priority?.trim().toLowerCase()).filter(Boolean)
  if (names.length !== new Set(names).size) problems.push(__('Priorities must be unique'))
  return problems.join(', ')
}

function validateWorkingHours(data: SlaData): string {
  const valid = (data.working_hours ?? []).filter(
    (day) => day.workday?.trim() && day.start_time?.trim() && day.end_time?.trim(),
  )
  if (!valid.length) {
    return __('At least one valid workday with a day, start time, and end time is required')
  }
  const seen = new Set<string>()
  const duplicates: string[] = []
  for (const day of valid) {
    if (seen.has(day.workday)) duplicates.push(day.workday)
    else seen.add(day.workday)
  }
  if (duplicates.length) {
    return __('Duplicate Workday found: {0}. Each Workday should be unique.', [duplicates.join(', ')])
  }
  const invalid = valid
    .filter((day) => parseTime(day.start_time.trim()) >= parseTime(day.end_time.trim()))
    .map((day) => `${day.workday} (${day.start_time.trim()} - ${day.end_time.trim()})`)
  return invalid.length ? __('End time must be after start time for: {0}', [invalid.join(', ')]) : ''
}

export function validateSla(data: SlaData, key?: keyof SlaErrors, skipConditionCheck = false): SlaErrors {
  const errors = emptySlaErrors()

  function validateField(field: keyof SlaErrors) {
    if (key && field !== key) return
    switch (field) {
      case 'sla_name':
        errors.sla_name = data.sla_name?.trim() ? '' : __('SLA policy name is required')
        break
      case 'priorities':
        errors.priorities = validatePriorities(data)
        break
      case 'start_date':
        errors.start_date =
          data.end_date && new Date(data.end_date) < new Date(data.start_date)
            ? __('Start date cannot be after end date')
            : ''
        break
      case 'end_date':
        errors.end_date =
          data.start_date && new Date(data.end_date) < new Date(data.start_date)
            ? __('End date cannot be before start date')
            : ''
        break
      case 'condition':
        if (skipConditionCheck) break
        errors.condition =
          data.condition_json.length > 0 && !validateConditions(data.condition_json)
            ? __('Valid conditions are required')
            : ''
        break
      case 'working_hours':
        errors.working_hours = validateWorkingHours(data)
        break
      default:
        break
    }
  }

  if (key) validateField(key)
  else (Object.keys(errors) as (keyof SlaErrors)[]).forEach(validateField)
  return errors
}
