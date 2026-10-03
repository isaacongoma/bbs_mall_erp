import { useMemo, type SyntheticEvent } from 'react'
import { collapseReplies } from '../utils/emailContent'
import emailContentStyles from '../styles/emailContent.css?inline'

export interface EmailContentProps {
  content: string
}

function fitIframe(iframe: HTMLIFrameElement): void {
  const html = iframe.contentWindow?.document.documentElement
  if (html) iframe.style.height = `${html.offsetHeight + 1}px`
}

function setupIframe(iframe: HTMLIFrameElement): void {
  const frameDocument = iframe.contentWindow?.document
  const emailContent = frameDocument?.querySelector('.email-content')
  const root = emailContent?.closest('html')
  if (!frameDocument || !emailContent || !root) return

  root.setAttribute('data-theme', document.documentElement.getAttribute('data-theme') ?? 'light')
  fitIframe(iframe)

  emailContent.querySelectorAll('.replyCollapser').forEach((collapser) => {
    collapser.addEventListener('change', () => fitIframe(iframe))
  })
}

export function EmailContent({ content }: EmailContentProps) {
  const html = useMemo(() => collapseReplies(content), [content])
  const srcDoc = `<!DOCTYPE html><html><head><style>${emailContentStyles}</style></head><body><div class="email-content prose-f">${html}</div></body></html>`

  return (
    <iframe
      srcDoc={srcDoc}
      className="prose-f block h-10 max-h-[500px] w-full"
      onLoad={(event: SyntheticEvent<HTMLIFrameElement>) => setupIframe(event.currentTarget)}
    />
  )
}
