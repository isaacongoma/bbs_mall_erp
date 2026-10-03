import { createResource } from '@/core/resources'

const pendingDeletionsMap = new Map<string, Set<string>>()

export function isFileUrl(value: unknown): value is string {
  return typeof value === 'string' && (value.startsWith('/files/') || value.startsWith('/private/files/'))
}

function deleteFileRecord(doctype: string, docname: string, fileUrl: string) {
  createResource({
    url: 'crm.api.delete_attachment',
    params: { doctype, docname, file_url: fileUrl },
    auto: true,
    onError: (error: unknown) => console.error('Failed to delete file attachment', error),
  })
}

export function getAttachmentTracker(doctype: string, docname: string) {
  const key = `${doctype}::${docname}`
  if (!pendingDeletionsMap.has(key)) pendingDeletionsMap.set(key, new Set())
  const pending = pendingDeletionsMap.get(key) as Set<string>

  function trackOldFile(oldValue: unknown, newValue: unknown) {
    if (isFileUrl(oldValue) && oldValue !== newValue) pending.add(oldValue)
  }

  function processPendingDeletions() {
    if (!pending.size) return
    pending.forEach((fileUrl) => deleteFileRecord(doctype, docname, fileUrl))
    pending.clear()
    pendingDeletionsMap.delete(key)
  }

  return { trackOldFile, processPendingDeletions }
}
