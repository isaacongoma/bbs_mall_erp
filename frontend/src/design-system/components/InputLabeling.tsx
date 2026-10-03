import type { ReactNode } from 'react'
import { cn } from '../utils/cn'

export function RequiredIndicator({ required }: { required?: boolean }) {
  if (!required) return null
  return (
    <>
      <span className="text-ink-red-6 select-none" aria-hidden="true">
        *
      </span>
      <span className="sr-only">(required)</span>
    </>
  )
}

export interface InputLabelProps {
  id: string
  forId?: string
  label?: string
  required?: boolean
  color?: 'gray-5' | 'gray-7'
  className?: string
  children?: ReactNode | ((props: { required: boolean }) => ReactNode)
}

export function InputLabel({ id, forId, label, required, color = 'gray-5', className, children }: InputLabelProps) {
  if (!label && !children) return null
  return (
    <label
      id={id}
      htmlFor={forId}
      data-slot="label"
      className={cn('block text-base', color === 'gray-7' ? 'text-ink-gray-7' : 'text-ink-gray-5', className)}
    >
      {children ? (
        typeof children === 'function' ? (
          children({ required: Boolean(required) })
        ) : (
          children
        )
      ) : (
        <>
          {label}
          <RequiredIndicator required={required} />
        </>
      )}
    </label>
  )
}

export interface InputDescriptionProps {
  id: string
  description?: string
  children?: ReactNode
}

export function InputDescription({ id, description, children }: InputDescriptionProps) {
  if (!children && !description) return null
  return (
    <p id={id} data-slot="description" className="text-p-sm text-ink-gray-5">
      {children ?? description}
    </p>
  )
}

export interface InputErrorProps {
  id: string
  lines: string[]
}

export function InputError({ id, lines }: InputErrorProps) {
  if (!lines.length) return null
  return (
    <div id={id} data-slot="error" role="alert" className="text-p-sm whitespace-pre-line text-ink-red-6">
      {lines.join('\n')}
    </div>
  )
}

export interface FormLabelProps {
  label: string
  size?: 'sm' | 'md'
  id?: string
  required?: boolean
  className?: string
}

export function FormLabel({ label, size = 'sm', id, required, className }: FormLabelProps) {
  return (
    <label className={cn('block text-ink-gray-5', size === 'sm' ? 'text-xs' : 'text-base', className)} htmlFor={id}>
      {label}
      <RequiredIndicator required={required} />
    </label>
  )
}
