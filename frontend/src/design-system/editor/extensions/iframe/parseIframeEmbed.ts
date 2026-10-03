export interface ParsedIframeEmbed {
  src: string
  width?: number
  height?: number
  title?: string
}

function parseDimension(value: string | null): number | undefined {
  if (!value) return undefined
  const n = parseInt(value, 10)
  return Number.isNaN(n) ? undefined : n
}

function parseWithDom(html: string): ParsedIframeEmbed | null | undefined {
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html')
    const iframe = doc.querySelector('iframe')
    if (iframe) {
      const src = iframe.getAttribute('src')
      if (!src) return null
      return {
        src,
        width: parseDimension(iframe.getAttribute('width')),
        height: parseDimension(iframe.getAttribute('height')),
        title: iframe.getAttribute('title') || undefined,
      }
    }
  } catch {
    return undefined
  }
  return undefined
}

export function parseIframeFromHTML(html: string): ParsedIframeEmbed | null {
  const parsed = parseWithDom(html)
  if (parsed !== undefined) return parsed

  const srcMatch = html.match(/<iframe[^>]*\ssrc=["']([^"']+)["'][^>]*>/i)
  if (!srcMatch) return null
  return {
    src: srcMatch[1]!,
    width: parseDimension(html.match(/\swidth=["'](\d+)["']/i)?.[1] ?? null),
    height: parseDimension(html.match(/\sheight=["'](\d+)["']/i)?.[1] ?? null),
    title: html.match(/\stitle=["']([^"']+)["']/i)?.[1] || undefined,
  }
}
