export interface LocalFileEntry {
  b64?: string
  poster?: string
  file: File
}

export interface UploadProgressEntry {
  loaded: number
  total: number
  percent: number
  abort?: () => void
}

export const localFileMap = new Map<string, LocalFileEntry>()

const progressMap = new Map<string, UploadProgressEntry>()
const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of [...listeners]) listener()
}

export function subscribeUploadProgress(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function setLocalFile(uploadId: string, entry: LocalFileEntry): void {
  localFileMap.set(uploadId, entry)
}

export function updateLocalFile(uploadId: string, patch: Partial<LocalFileEntry>): void {
  const current = localFileMap.get(uploadId)
  if (current) localFileMap.set(uploadId, { ...current, ...patch })
}

export function getLocalFile(uploadId: string): LocalFileEntry | undefined {
  return localFileMap.get(uploadId)
}

export function deleteLocalFile(uploadId: string): void {
  localFileMap.delete(uploadId)
}

export function setUploadProgress(uploadId: string, entry: UploadProgressEntry): void {
  progressMap.set(uploadId, entry)
  emit()
}

export function getUploadProgress(uploadId: string): UploadProgressEntry | undefined {
  return progressMap.get(uploadId)
}

export function updateUploadProgress(uploadId: string, patch: Partial<UploadProgressEntry>): void {
  const current = progressMap.get(uploadId) ?? { loaded: 0, total: 0, percent: 0 }
  progressMap.set(uploadId, { ...current, ...patch })
  emit()
}

export function abortUpload(uploadId: string): void {
  progressMap.get(uploadId)?.abort?.()
}

export function deleteUploadProgress(uploadId: string): void {
  if (progressMap.delete(uploadId)) emit()
}
