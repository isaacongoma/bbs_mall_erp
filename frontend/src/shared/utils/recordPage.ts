import { __ } from '@/core/i18n'

export interface RecordError {
  title: string
  message: string
}

export function describeRecordError(
  error: { exc_type?: string; messages?: string[] } | null | undefined,
  capitalised = false,
): RecordError {
  if (!error) return { title: '', message: '' }
  const notFound = error.exc_type === 'DoesNotExistError'
  const title = capitalised
    ? notFound
      ? __('Document Not Found')
      : __('Error Occurred')
    : notFound
      ? __('Document not found')
      : __('Error occurred')
  const message = capitalised
    ? __(error.messages?.[0] || __('An Error Occurred'))
    : __(error.messages?.[0] || __('An error occurred'))
  return { title, message }
}

export const RECORD_TABS_CLASS =
  "flex flex-1 overflow-hidden flex-col [&_[role='tab']]:px-0 [&_[role='tab']]:shrink-0 [&_[role='tablist']]:px-5 [&_[role='tablist']::-webkit-scrollbar]:h-0 [&_[role='tablist']]:min-h-[45px] [&_[role='tablist']]:gap-7.5 [&_[role='tabpanel']:not([hidden])]:flex [&_[role='tabpanel']:not([hidden])]:grow"

export const MOBILE_RECORD_TABS_CLASS =
  "flex flex-1 overflow-auto flex-col [&_[role='tab']]:px-0 [&_[role='tab']]:shrink-0 [&_[role='tablist']]:px-3 [&_[role='tablist']]:min-h-[45px] [&_[role='tablist']]:gap-7.5 [&_[role='tabpanel']:not([hidden])]:flex [&_[role='tabpanel']:not([hidden])]:grow"
