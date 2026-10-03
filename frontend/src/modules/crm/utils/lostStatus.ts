import { getDealStatus, getLeadStatus } from '../stores/statusesStore'

export function isLostStatus(doctype: string, status: string): boolean {
  if (doctype === 'CRM Lead') return getLeadStatus(status)?.type === 'Lost'
  if (doctype === 'CRM Deal') return getDealStatus(status)?.type === 'Lost'
  return false
}

export function isKanbanLostStatusFor(doctype: string): (status: string) => boolean {
  return (status) => isLostStatus(doctype, status)
}
