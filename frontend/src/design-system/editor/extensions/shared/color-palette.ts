export interface PaletteColor {
  name: string
  textVar: string
  highlightVar: string
}

export const PALETTE_COLORS: readonly PaletteColor[] = [
  { name: 'red', textVar: 'var(--prose-color-red)', highlightVar: 'var(--prose-highlight-red)' },
  { name: 'orange', textVar: 'var(--prose-color-orange)', highlightVar: 'var(--prose-highlight-orange)' },
  { name: 'yellow', textVar: 'var(--prose-color-yellow)', highlightVar: 'var(--prose-highlight-yellow)' },
  { name: 'green', textVar: 'var(--prose-color-green)', highlightVar: 'var(--prose-highlight-green)' },
  { name: 'teal', textVar: 'var(--prose-color-teal)', highlightVar: 'var(--prose-highlight-teal)' },
  { name: 'cyan', textVar: 'var(--prose-color-cyan)', highlightVar: 'var(--prose-highlight-cyan)' },
  { name: 'blue', textVar: 'var(--prose-color-blue)', highlightVar: 'var(--prose-highlight-blue)' },
  { name: 'indigo', textVar: 'var(--prose-color-indigo)', highlightVar: 'var(--prose-highlight-indigo)' },
  { name: 'purple', textVar: 'var(--prose-color-purple)', highlightVar: 'var(--prose-highlight-purple)' },
  { name: 'pink', textVar: 'var(--prose-color-pink)', highlightVar: 'var(--prose-highlight-pink)' },
  { name: 'gray', textVar: 'var(--prose-color-gray)', highlightVar: 'var(--prose-highlight-gray)' },
] as const

export const PALETTE_NAMES: readonly string[] = PALETTE_COLORS.map((c) => c.name)

export const textColorHexMap: Record<string, string> = {
  red: '#dc2626',
  orange: '#ea580c',
  yellow: '#ca8a04',
  green: '#16a34a',
  teal: '#0d9488',
  cyan: '#06b6d4',
  blue: '#1579D0',
  indigo: '#5f46c7',
  purple: '#9333ea',
  pink: '#db2777',
  gray: '#6b7280',
}

export const highlightColorHexMap: Record<string, string> = {
  red: '#fecaca',
  orange: '#fed7aa',
  yellow: '#fef08a',
  green: '#bbf7d0',
  teal: '#99f6e4',
  cyan: '#a5f3fc',
  blue: '#bfdbfe',
  indigo: '#dbd5ff',
  purple: '#e9d5ff',
  pink: '#fbcfe8',
  gray: '#e5e7eb',
}

export const EXCLUDE_FROM_PASTE: readonly string[] = ['gray'] as const

export const legacyTextColorMap: Record<string, string> = {
  '#1F272E': 'gray',
  '#ca8a04': 'yellow',
  '#ea580c': 'orange',
  '#dc2626': 'red',
  '#16a34a': 'green',
  '#1579D0': 'blue',
  '#9333ea': 'purple',
  '#db2777': 'pink',
}

export const legacyHighlightColorMap: Record<string, string> = {
  '#fef9c3': 'yellow',
  '#ffedd5': 'orange',
  '#fee2e2': 'red',
  '#dcfce7': 'green',
  '#D3E9FC': 'blue',
  '#f3e8ff': 'purple',
  '#fce7f3': 'pink',
}
