import { __ } from '@/core/i18n'

export function validateTemplate(template: Record<string, any>): string {
  if (!template.name) return __('Name is required')
  if (!template.subject) return __('Subject is required')
  if (template.content_type === 'Rich Text' && !template.response) return __('Content is required')
  if (template.content_type === 'HTML' && !template.response_html) return __('Content is required')
  return ''
}
