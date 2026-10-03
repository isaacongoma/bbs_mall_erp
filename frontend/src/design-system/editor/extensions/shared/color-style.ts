import { highlightColorHexMap, textColorHexMap } from './color-palette'
import { getClosestNamedColor, matchLegacyHex, parseHexToRgb, parseRgbToRgb } from './color-parse'

type ColorVariant = 'text' | 'highlight'

const CSS_PROPERTY: Record<ColorVariant, string> = {
  text: 'color',
  highlight: 'background-color',
}

const HEX_MAP: Record<ColorVariant, Record<string, string>> = {
  text: textColorHexMap,
  highlight: highlightColorHexMap,
}

function extractPropertyValue(style: string, property: string): string | null {
  const re = new RegExp(`(?:^|;)\\s*${property}\\s*:\\s*([^;]+)`, 'i')
  const match = re.exec(style)
  return match ? (match[1] ?? '').trim() : null
}

function resolveColorValue(rawValue: string, variant: ColorVariant, allowed?: readonly string[]): string | null {
  const varName = variant === 'text' ? 'prose-color' : 'prose-highlight'
  const varMatch = new RegExp(`var\\(--${varName}-([a-z0-9]+)\\)`, 'i').exec(rawValue)
  if (varMatch) {
    const name = (varMatch[1] ?? '').toLowerCase()
    if (!allowed || allowed.includes(name)) return name
    return null
  }

  const hexLiteral = /#[0-9a-f]{3,8}/i.exec(rawValue)?.[0]
  if (hexLiteral) {
    const legacy = matchLegacyHex(hexLiteral, variant)
    if (legacy && (!allowed || allowed.includes(legacy))) return legacy
  }

  const rgb = hexLiteral ? parseHexToRgb(hexLiteral) : parseRgbToRgb(rawValue)
  if (!rgb) return null

  const closest = getClosestNamedColor(rgb, HEX_MAP[variant], allowed)
  return closest
}

export function extractColorFromStyle(
  style: string,
  variant: ColorVariant,
  allowed?: readonly string[],
): string | null {
  const rawValue = extractPropertyValue(style, CSS_PROPERTY[variant])
  if (!rawValue) return null
  return resolveColorValue(rawValue, variant, allowed)
}

export function extractTextColorFromStyle(style: string, allowed?: readonly string[]): string | null {
  return extractColorFromStyle(style, 'text', allowed)
}

export function extractHighlightColorFromStyle(style: string, allowed?: readonly string[]): string | null {
  return extractColorFromStyle(style, 'highlight', allowed)
}

export function textColorStyle(name: string): string {
  return `color: var(--prose-color-${name})`
}

export function highlightColorStyle(name: string): string {
  return `background-color: var(--prose-highlight-${name})`
}
