import { __ } from '@/core/i18n'

const STRONG_PASSWORD = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d\s]).{8,}$/

export function isStrongPassword(password: string): boolean {
  return STRONG_PASSWORD.test(password)
}

export function passwordFeedback(current: string, next: string, confirm: string): string {
  if (current && next && current === next) return __('New password cannot be the same as current password')
  if (next && next.length < 8) return __('Password must be at least 8 characters')
  if (next && !isStrongPassword(next)) return __('Password must contain lowercase, uppercase, number, and symbol')
  if (confirm.length && next !== confirm) return __('Passwords do not match')
  if (next === confirm && next.length && confirm.length) return __('Passwords match')
  return ''
}
