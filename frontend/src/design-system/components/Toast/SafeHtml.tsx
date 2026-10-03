export function SafeHtml({ html }: { html: string }) {
  return <span dangerouslySetInnerHTML={{ __html: html }} />
}
