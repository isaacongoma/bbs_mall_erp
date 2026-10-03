import DOMPurify from 'dompurify'
import { isValidElement, type ReactElement, type ReactNode } from 'react'
import { toast as sonnerToast, type ExternalToast } from 'sonner'
import { LucideIcon } from '../../icons'
import { SafeHtml } from './SafeHtml'

type ToastType = 'success' | 'error' | 'warning' | 'info'
type ToastMessage = string | ReactElement
type ToastIcon = string | ReactElement | (() => ReactElement)

const ALLOWED_TAGS = ['a', 'em', 'strong', 'i', 'b', 'u']

function renderSafe(message: ToastMessage): ReactNode {
  if (typeof message !== 'string') return message
  return <SafeHtml html={DOMPurify.sanitize(message, { ALLOWED_TAGS })} />
}

function secondsToMs(seconds?: number): number | undefined {
  if (seconds === undefined) return undefined
  if (seconds === 0) return Infinity
  return seconds * 1000
}

function resolveIcon(icon?: ToastIcon, iconClasses?: string): ReactNode {
  if (icon === undefined || icon === null) return undefined
  if (typeof icon === 'string')
    return <LucideIcon name={icon} className={['size-4', iconClasses].filter(Boolean).join(' ')} />
  if (typeof icon === 'function') return icon()
  return icon
}

export interface LegacyToastObject {
  title?: string
  text?: string
  message?: string
  icon?: ToastIcon
  iconClasses?: string
  timeout?: number
  duration?: number
  type?: ToastType
}

export interface ToastCreateOptions {
  id?: string | number
  message: string
  type?: ToastType
  icon?: ToastIcon
  duration?: number
  closable?: boolean
  action?: { label: string; onClick: () => void; altText?: string }
}

function dispatch(type: ToastType | undefined, message: ToastMessage, data?: ExternalToast) {
  const safe = renderSafe(message)
  switch (type) {
    case 'success':
      return sonnerToast.success(safe, data)
    case 'error':
      return sonnerToast.error(safe, data)
    case 'warning':
      return sonnerToast.warning(safe, data)
    case 'info':
      return sonnerToast.info(safe, data)
    default:
      return sonnerToast(safe, data)
  }
}

function isLegacyObject(value: unknown): value is LegacyToastObject {
  if (!value || typeof value !== 'object' || isValidElement(value)) return false
  return 'title' in value || 'text' in value || 'message' in value
}

function toastFn(message: string | LegacyToastObject | ReactElement, options?: ExternalToast) {
  if (isLegacyObject(message)) {
    return dispatch(message.type, message.title ?? message.message ?? '', {
      description: message.text,
      icon: resolveIcon(message.icon, message.iconClasses),
      duration: secondsToMs(message.timeout ?? message.duration),
    })
  }
  return sonnerToast(renderSafe(message as ToastMessage), options)
}

function create({ id, message, type, icon, duration, action, closable }: ToastCreateOptions) {
  return dispatch(type, message, {
    id,
    duration: closable === false ? Infinity : secondsToMs(duration),
    action: action ? { label: action.label, onClick: action.onClick } : undefined,
    icon: resolveIcon(icon),
    closeButton: closable,
    dismissible: closable !== false,
  })
}

export const toast = Object.assign(toastFn, {
  success: (message: ToastMessage, data?: ExternalToast) => dispatch('success', message, data),
  error: (message: ToastMessage, data?: ExternalToast) => dispatch('error', message, data),
  warning: (message: ToastMessage, data?: ExternalToast) => dispatch('warning', message, data),
  info: (message: ToastMessage, data?: ExternalToast) => dispatch('info', message, data),
  loading: sonnerToast.loading,
  promise: sonnerToast.promise,
  dismiss: sonnerToast.dismiss,
  message: sonnerToast.message,
  custom: sonnerToast.custom,
  create,
  remove: (id: string | number) => sonnerToast.dismiss(id),
  removeAll: () => sonnerToast.dismiss(),
})
