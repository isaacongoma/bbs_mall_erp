import DOMPurify from 'dompurify'
import { useMemo } from 'react'
import { cn } from '../utils/cn'

export interface ErrorMessageProps {
  message?: string | Error | null
  className?: string
}

function toMessage(message: string | Error): string {
  if (message instanceof Error) {
    const withMessages = message as Error & { messages?: string | string[] }
    const messages = withMessages.messages
    if (Array.isArray(messages)) return messages.join('\n')
    return messages || message.message
  }
  return message
}

export function ErrorMessage({ message, className }: ErrorMessageProps) {
  const html = useMemo(() => (message ? DOMPurify.sanitize(toMessage(message)) : ''), [message])
  if (!message) return null
  return (
    <div
      role="alert"
      className={cn('whitespace-pre-line text-sm text-ink-red-8', className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
