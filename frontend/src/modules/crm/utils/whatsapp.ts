import { sanitizeHTML } from '@/shared/utils/text'

export function formatWhatsAppMessage(input: string | null | undefined): string {
  let message = input ?? ''
  message = message.replace(/_(.*?)_/g, '<i>$1</i>')
  message = message.replace(/\*(.*?)\*/g, '<b>$1</b>')
  message = message.replace(/~(.*?)~/g, '<s>$1</s>')
  message = message.replace(/```(.*?)```/g, '<code>$1</code>')
  message = message.replace(/`(.*?)`/g, '<code>$1</code>')
  message = message.replace(/^> (.*)$/gm, '<blockquote>$1</blockquote>')
  message = message.replace(/\n/g, '<br>')
  message = message.replace(/\* (.*?)(?=\s*\*|$)/g, '<li>$1</li>')
  message = message.replace(/- (.*?)(?=\s*-|$)/g, '<li>$1</li>')
  message = message.replace(/(\d+)\. (.*?)(?=\s*(\d+)\.|$)/g, '<li>$2</li>')
  return sanitizeHTML(message)
}

export function scrollToMessage(name: string): void {
  const element = document.getElementById(name)
  if (!element) return
  element.scrollIntoView({ behavior: 'smooth' })
  element.classList.add('bg-yellow-100')
  setTimeout(() => element.classList.remove('bg-yellow-100'), 1000)
}
