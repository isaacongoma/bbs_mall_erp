import { getConfig } from '@/core/resources/config'

export type Replacements = ReadonlyArray<string | number | null | undefined> | Record<string | number, unknown>

function format(message: string, replace: Replacements): string {
  return message.replace(/{(\d+)}/g, (match, index: string) => {
    const value = (replace as Record<string, unknown>)[index]
    return typeof value !== 'undefined' ? String(value) : match
  })
}

export function translate(
  message: string | null | undefined,
  replace?: Replacements,
  context: string | null = null,
): string {
  if (!message) return ''
  const translatedMessages = getConfig('translatedMessages') || {}
  let translated = ''

  if (context) {
    const key = `${message}:${context}`
    if (translatedMessages[key]) translated = translatedMessages[key]
  }

  if (!translated) translated = translatedMessages[message] || message

  if (!/{\d+}/.test(message) || !replace) return translated
  return format(translated, replace)
}

export const __ = translate
