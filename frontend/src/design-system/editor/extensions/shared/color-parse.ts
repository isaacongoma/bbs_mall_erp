import { EXCLUDE_FROM_PASTE, legacyHighlightColorMap, legacyTextColorMap } from './color-palette'

export interface Rgb {
  r: number
  g: number
  b: number
}

export function parseHexToRgb(hex: string): Rgb | null {
  const clean = hex.trim().replace(/^#/, '')
  if (!/^[0-9a-f]{6}$/i.test(clean)) return null
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  }
}

function toByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)))
}

function channelToByte(token: string): number | null {
  const t = token.trim()
  if (t.endsWith('%')) {
    const pct = parseFloat(t.slice(0, -1))
    if (Number.isNaN(pct)) return null
    return toByte((pct / 100) * 255)
  }
  const n = parseFloat(t)
  if (Number.isNaN(n)) return null
  return toByte(n)
}

export function parseRgbToRgb(rgb: string): Rgb | null {
  const match = /rgba?\(([^)]+)\)/i.exec(rgb.trim())
  if (!match) return null

  const body = (match[1] ?? '').split('/')[0] ?? ''
  const parts = body
    .split(/[\s,]+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)

  if (parts.length < 3) return null

  const r = channelToByte(parts[0]!)
  const g = channelToByte(parts[1]!)
  const b = channelToByte(parts[2]!)
  if (r === null || g === null || b === null) return null

  return { r, g, b }
}

export function getClosestNamedColor(
  rgb: Rgb,
  colorMap: Record<string, string>,
  allowed?: readonly string[],
): string | null {
  let closest: string | null = null
  let minDistance = Infinity

  const candidates = allowed ?? Object.keys(colorMap)
  for (const name of candidates) {
    const anchorHex = colorMap[name]
    if (!anchorHex) continue
    const anchor = parseHexToRgb(anchorHex)
    if (!anchor) continue

    const distance = Math.sqrt((rgb.r - anchor.r) ** 2 + (rgb.g - anchor.g) ** 2 + (rgb.b - anchor.b) ** 2)
    if (distance < minDistance) {
      minDistance = distance
      closest = name
    }
  }

  if (closest !== null && EXCLUDE_FROM_PASTE.includes(closest)) {
    return null
  }
  return closest
}

export function matchLegacyHex(hex: string, variant: 'text' | 'highlight'): string | null {
  const map = variant === 'text' ? legacyTextColorMap : legacyHighlightColorMap
  const direct = map[hex]
  if (direct) return EXCLUDE_FROM_PASTE.includes(direct) ? null : direct
  return null
}
