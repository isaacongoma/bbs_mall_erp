import type { ExistingImage } from '../shared/upload-types'

export const ALLOWED_COLUMNS = [2, 3, 4] as const
export type AllowedColumns = (typeof ALLOWED_COLUMNS)[number]

export const DEFAULT_COLUMNS = 4

export function clampColumns(value: unknown): AllowedColumns {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_COLUMNS
  let closest: AllowedColumns = ALLOWED_COLUMNS[0]
  let bestDelta = Infinity
  for (const allowed of ALLOWED_COLUMNS) {
    const delta = Math.abs(allowed - n)
    if (delta < bestDelta) {
      bestDelta = delta
      closest = allowed
    }
  }
  return closest
}

export function getDefaultColumns(count: number): AllowedColumns {
  if (count <= 0) return DEFAULT_COLUMNS
  if (count <= 4) return clampColumns(count)
  if (count % 4 === 0) return 4
  if (count % 3 === 0) return 3
  return 4
}

export function fileItemId(file: File): string {
  return `file-${file.name}-${file.size}`
}

export function existingItemId(existing: ExistingImage): string {
  return `existing-${existing.src}`
}

export function isImageSupported(file: File): boolean {
  const unsupportedTypes = ['image/heic', 'image/heif']
  const unsupportedExtensions = ['.heic', '.heif']
  const hasUnsupportedType = unsupportedTypes.includes(file.type)
  const hasUnsupportedExtension = unsupportedExtensions.some((ext) => file.name?.toLowerCase().endsWith(ext))
  return !hasUnsupportedType && !hasUnsupportedExtension
}

export function filterImageFiles(files: File[]): File[] {
  return files.filter((file) => file.type.startsWith('image/'))
}

export function columnSelectOptions(): { label: string; value: string }[] {
  return ALLOWED_COLUMNS.map((n) => ({
    label: `${n} columns`,
    value: String(n),
  }))
}
