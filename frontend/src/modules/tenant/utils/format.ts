import dayjs from 'dayjs'
import type { BadgeTheme } from '@/design-system'

const money = new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 2 })
const compact = new Intl.NumberFormat('en-KE', { notation: 'compact', maximumFractionDigits: 1 })
const plain = new Intl.NumberFormat('en-KE', { maximumFractionDigits: 2 })

export function formatMoney(value: number | string | null | undefined): string {
  return money
    .format(Number(value ?? 0))
    .replace(/KES|Ksh/, 'KSh')
    .replace(/\s/, ' ')
}

export function formatCompact(value: number | string | null | undefined): string {
  return `KSh ${compact.format(Number(value ?? 0))}`
}

export function formatNumber(value: number | string | null | undefined): string {
  return plain.format(Number(value ?? 0))
}

export function formatDate(value: string | Date | null | undefined, pattern = 'D MMM YYYY'): string {
  if (!value) return '-'
  const parsed = dayjs(value)
  return parsed.isValid() ? parsed.format(pattern) : '-'
}

export function formatDateTime(value: string | null | undefined): string {
  return formatDate(value, 'D MMM YYYY, h:mm A')
}

export function relativeDays(value: string | null | undefined): string {
  if (!value) return ''
  const days = dayjs(value).startOf('day').diff(dayjs().startOf('day'), 'day')
  if (days === 0) return 'today'
  if (days === 1) return 'tomorrow'
  if (days === -1) return 'yesterday'
  return days > 0 ? `in ${days} days` : `${Math.abs(days)} days ago`
}

export function monthLabel(key: string): string {
  return dayjs(`${key}-01`).format('MMM')
}

export function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export function firstName(name: string | undefined): string {
  return (name ?? '').trim().split(/\s+/)[0] ?? ''
}

export function statusTheme(status: string | undefined): BadgeTheme {
  switch (status) {
    case 'Paid':
    case 'Active':
    case 'Resolved':
    case 'Closed':
    case 'Approved':
    case 'Allocated':
    case 'Billed':
    case 'Published':
      return 'green'
    case 'Unpaid':
    case 'Partly Paid':
    case 'Open':
    case 'Pending':
    case 'Pending Approval':
    case 'Assigned':
    case 'Expiring Soon':
    case 'Received':
      return 'amber'
    case 'Overdue':
    case 'Rejected':
    case 'Failed':
    case 'Expired':
    case 'Terminated':
    case 'Urgent':
      return 'red'
    case 'In Progress':
    case 'High':
    case 'Medium':
    case 'Info':
      return 'blue'
    default:
      return 'gray'
  }
}

export function invoiceState(row: { outstanding_amount: number; due_date: string; status: string }): string {
  if (Number(row.outstanding_amount) <= 0) return 'Paid'
  if (dayjs(row.due_date).isBefore(dayjs(), 'day')) return 'Overdue'
  return Number(row.outstanding_amount) < Number((row as { grand_total?: number }).grand_total ?? 0)
    ? 'Partly Paid'
    : 'Unpaid'
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}
