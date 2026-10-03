import { __ } from '@/core/i18n'

export const ROLE_DESCRIPTIONS: Record<string, string> = {
  'System Manager': 'Can manage all aspects of the CRM, including user management, customizations and settings.',
  'Sales Manager': 'Can manage and invite new users, and create public & private views (reports).',
  'Sales User': 'Can work with leads and deals and create private views (reports).',
}

export function roleSelectOptions(admin: boolean) {
  return [
    { value: 'Sales User', label: __('Sales User') },
    ...(admin ? [{ value: 'Sales Manager', label: __('Manager') }] : []),
    ...(admin ? [{ value: 'System Manager', label: __('Admin') }] : []),
  ]
}

export function roleLabel(role: string): string {
  if (role === 'System Manager') return __('Admin')
  if (role === 'Sales Manager') return __('Manager')
  return __('Sales User')
}
