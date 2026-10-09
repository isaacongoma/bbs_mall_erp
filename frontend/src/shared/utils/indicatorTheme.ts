import type { BadgeTheme } from '@/design-system'

const INDICATOR_THEMES: Record<string, BadgeTheme> = {
  green: 'green',
  orange: 'orange',
  red: 'red',
  blue: 'blue',
  'light-blue': 'blue',
  lightblue: 'blue',
  cyan: 'blue',
  yellow: 'amber',
  amber: 'amber',
  purple: 'violet',
  violet: 'violet',
  pink: 'violet',
}

export function indicatorTheme(color: string): BadgeTheme {
  return INDICATOR_THEMES[color] ?? 'gray'
}

