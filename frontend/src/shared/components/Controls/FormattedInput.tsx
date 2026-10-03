import { useState, type FocusEvent, type KeyboardEvent } from 'react'
import { TextInput, type TextInputProps } from '@/design-system'

export interface FormattedInputProps extends Omit<TextInputProps, 'value' | 'onChange'> {
  value?: string | number
  formattedValue?: string | number
  onCommit?: (value: string) => void
}

export function FormattedInput({
  value = '',
  formattedValue = '',
  onCommit,
  onFocus,
  onBlur,
  onKeyDown,
  ...rest
}: FormattedInputProps) {
  const [draft, setDraft] = useState<string | null>(null)
  const focused = draft !== null
  const current = String(value)
  const displayValue = focused ? draft : formattedValue || value

  function commit() {
    if (draft === null) return
    setDraft(null)
    if (draft !== current) onCommit?.(draft)
  }

  return (
    <TextInput
      {...rest}
      value={displayValue}
      onChange={setDraft}
      onFocus={(event: FocusEvent<HTMLInputElement>) => {
        setDraft(current)
        const input = event.currentTarget
        requestAnimationFrame(() => input.select())
        onFocus?.(event)
      }}
      onBlur={(event: FocusEvent<HTMLInputElement>) => {
        commit()
        onBlur?.(event)
      }}
      onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') commit()
        onKeyDown?.(event)
      }}
    />
  )
}
