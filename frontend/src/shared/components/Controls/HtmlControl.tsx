import { useMemo } from 'react'
import { sanitizeHTML } from '../../utils/text'

export interface HtmlControlProps {
  html?: string
  disabled?: boolean
}

export function HtmlControl({ html = '' }: HtmlControlProps) {
  const sanitized = useMemo(() => (html ? sanitizeHTML(html) : ''), [html])
  return <div className="html-control text-sm text-ink-gray-8" dangerouslySetInnerHTML={{ __html: sanitized }} />
}
