import { gemoji } from 'gemoji'

const EMOJI_SET = new Set(gemoji.map((entry) => entry.emoji))

export function isEmoji(value: unknown): boolean {
  return typeof value === 'string' && EMOJI_SET.has(value)
}

export { gemoji }
