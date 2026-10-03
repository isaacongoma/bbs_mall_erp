import { useMemo } from 'react'
import { sanitizeHTML } from '../utils/text'

export function SvgHtmlIcon({ html }: { html: string }) {
  const clean = useMemo(() => sanitizeHTML(html), [html])
  return <div dangerouslySetInnerHTML={{ __html: clean }} />
}
