export function isLucideIconString(icon: unknown): icon is string {
  return typeof icon === 'string' && icon.startsWith('lucide-')
}

export function isEmojiIconString(icon: unknown): icon is string {
  if (typeof icon !== 'string' || !icon) return false
  if (icon.startsWith('lucide-')) return false
  return !/[a-zA-Z0-9]/.test(icon)
}
