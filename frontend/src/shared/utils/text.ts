import DOMPurify from 'dompurify'
import { __ } from '@/core/i18n'
import { cstr } from './numberFormat'

export function htmlToText(html: string): string {
  const div = document.createElement('div')
  div.innerHTML = html
  return div.textContent || div.innerText || ''
}

export function isContentEmpty(html: string | null | undefined): boolean {
  if (!html) return true
  if (/<(img|video|iframe|table|hr)\b/i.test(html)) return false
  return htmlToText(html).trim() === ''
}

export function startCase(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export function interpolateTemplate(
  template: string | null | undefined,
  doc: Record<string, unknown> | null | undefined,
): string {
  if (!template) return ''
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => {
    const val = doc?.[key]
    return val !== undefined && val !== null ? String(val) : ''
  })
}

export function convertSize(size: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let value = size
  let unitIndex = 0
  while (value > 1024) {
    value /= 1024
    unitIndex++
  }
  return `${value?.toFixed(2)} ${units[unitIndex]}`
}

export function isImage(extension: string | null | undefined): boolean {
  if (!extension) return false
  return ['png', 'jpg', 'jpeg', 'gif', 'svg', 'bmp', 'webp'].includes(extension.toLowerCase())
}

export function validateIsImageFile(file: { name: string }): string | undefined {
  const extension = file.name.split('.').pop()?.toLowerCase()
  if (!isImage(extension)) return __('Only image files are allowed')
  return undefined
}

export function isNull(value: unknown): boolean {
  return value === undefined || value === null || value === '' || cstr(value).trim() === ''
}

export function getRandom(len = 4): string {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
  let text = ''
  for (let i = 0; i < len; i++) text += possible.charAt(Math.floor(Math.random() * possible.length))
  return text
}

export function sanitizeHTML(html: unknown = '', options: Record<string, unknown> = {}): string {
  if (typeof html !== 'string') return html as string
  return DOMPurify.sanitize(html, options) as unknown as string
}

export function sanitizeText(text: unknown = ''): string {
  if (typeof text !== 'string') return text as string
  return text.replace(/\p{Cf}/gu, '')
}
