import { useMemo } from 'react'
import { sanitizeHTML } from '../../utils/text'

export interface HtmlControlProps {
  html?: string
  disabled?: boolean
  hostRef?: (element: HTMLDivElement | null) => void
}

export function HtmlControl({ html = '', hostRef }: HtmlControlProps) {
  const sanitized = useMemo(() => (html ? sanitizeHTML(html) : ''), [html])
  return (
    <div
      ref={hostRef}
      className="html-control text-sm text-ink-gray-8"
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  )
}
