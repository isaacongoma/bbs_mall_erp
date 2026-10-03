let maxFileSize: number | null = null

export function setMaxFileSize(bytes: number | null | undefined) {
  maxFileSize = typeof bytes === 'number' && Number.isFinite(bytes) && bytes > 0 ? bytes : null
}

export function getMaxFileSize(): number | null {
  return maxFileSize
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    const mb = bytes / 1024 / 1024
    return `${Number.isInteger(mb) ? mb : mb.toFixed(1)} MB`
  }
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`
  return `${bytes} B`
}

export function fileSizeLimitMessage(file: File | null): string | null {
  if (!file) return null
  const limit = getMaxFileSize()
  if (!limit || file.size <= limit) return null
  return `This file is ${formatBytes(file.size)}; the limit is ${formatBytes(limit)}.`
}
