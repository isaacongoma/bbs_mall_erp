import { __ } from '@/core/i18n'
import { toast } from '@/design-system'

interface NavigatorWithUserAgentData extends Navigator {
  userAgentData?: { platform?: string }
}

export const isMac =
  typeof navigator !== 'undefined' &&
  /Mac|iPod|iPhone|iPad/i.test(
    (navigator as NavigatorWithUserAgentData).userAgentData?.platform || navigator.platform || '',
  )

export const submitShortcutLabel = isMac ? '⌘⏎' : 'Ctrl+⏎'

export function isTouchScreenDevice(): boolean {
  return 'ontouchstart' in document.documentElement
}

export function copyToClipboard(text: string): void {
  const showSuccessAlert = () => {
    toast.success(__('Copied to Clipboard'))
  }

  if (navigator.clipboard && window.isSecureContext) {
    void navigator.clipboard.writeText(text).then(showSuccessAlert)
    return
  }

  const input = document.createElement('textarea')
  document.body.appendChild(input)
  input.value = text
  input.select()
  document.execCommand('copy')
  showSuccessAlert()
  document.body.removeChild(input)
}
