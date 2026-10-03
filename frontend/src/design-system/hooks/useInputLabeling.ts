import { useId } from 'react'

export interface FormError extends Error {
  messages?: string[]
}

export interface InputLabelingProps {
  label?: string
  description?: string
  error?: string | FormError | null
  required?: boolean
  id?: string
}

export interface InputLabelingOptions {
  size?: string
  variant?: string
  disabled?: boolean
  state?: string
}

export function useInputLabeling(props: InputLabelingProps, options: InputLabelingOptions = {}) {
  const fallbackId = useId()
  const inputId = props.id ?? fallbackId
  const labelId = `${inputId}-label`
  const descriptionId = `${inputId}-description`
  const errorMessageId = `${inputId}-error`

  const error = props.error
  let errorLines: string[] = []
  if (error) {
    if (typeof error === 'string') errorLines = [error]
    else if (error.messages && error.messages.length) errorLines = error.messages.slice()
    else if (error.message) errorLines = [error.message]
  }
  const hasError = errorLines.length > 0
  const showDescription = Boolean(props.description) && !hasError

  const describedBy = [showDescription ? descriptionId : null, hasError ? errorMessageId : null]
    .filter(Boolean)
    .join(' ')

  const dataAttrs: Record<string, string> = { 'data-state': hasError ? 'invalid' : (options.state ?? 'valid') }
  if (options.size) dataAttrs['data-size'] = options.size
  if (options.variant) dataAttrs['data-variant'] = options.variant
  if (options.disabled) dataAttrs['data-disabled'] = 'true'
  if (props.required) dataAttrs['data-required'] = 'true'

  return {
    inputId,
    labelId,
    descriptionId,
    errorMessageId,
    labelledBy: props.label ? labelId : undefined,
    describedBy: describedBy || undefined,
    hasError,
    errorLines,
    showDescription,
    dataAttrs,
  }
}
