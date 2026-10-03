import { rpc } from '@/core/api/rpc'
import { currentSessionUser } from '../stores/usersStore'

export function useVisitedRecords(doctype: string) {
  function isVisited(seen?: string | string[] | null): boolean {
    if (!seen) return false
    const seenBy: string[] = typeof seen === 'string' ? JSON.parse(seen) : seen
    return seenBy.includes(currentSessionUser() ?? '')
  }

  function markVisited(name?: string) {
    if (!name) return
    void rpc({ url: 'crm.api.doc.add_seen', params: { doctype, name }, method: 'POST' })
  }

  return { isVisited, markVisited }
}
