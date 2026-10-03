import type { ReactNode } from 'react'
import type { Dayjs } from '@/core/datetime'
import type { FormError } from '../hooks/useInputLabeling'
import type { InputSize, InputVariant } from './input'
import type { PickerTriggerProps } from '../components/DatePicker/PickerShell'

export type PickerSide = 'top' | 'right' | 'bottom' | 'left'
export type PickerAlign = 'start' | 'center' | 'end'
export type PickerPlacement =
  | 'top-start'
  | 'top-end'
  | 'bottom-start'
  | 'bottom-end'
  | 'left-start'
  | 'left-end'
  | 'right-start'
  | 'right-end'
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'

export interface CommonPickerProps {
  id?: string
  label?: string
  description?: string
  error?: string | FormError | null
  required?: boolean
  side?: PickerSide
  align?: PickerAlign
  offset?: number
  placement?: PickerPlacement
  format?: string
  size?: InputSize
  variant?: InputVariant
  placeholder?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
  openOnFocus?: boolean
  openOnClick?: boolean
  typeable?: boolean
  disabled?: boolean
  clearable?: boolean
  keepOpen?: boolean
  min?: string
  max?: string
  isDateUnavailable?: (date: Dayjs) => boolean
  className?: string
  trigger?: (props: PickerTriggerProps) => ReactNode
  prefix?: (props: PickerTriggerProps) => ReactNode
  suffix?: (props: PickerTriggerProps) => ReactNode
}
