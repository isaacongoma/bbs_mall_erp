import { useState, type KeyboardEvent } from 'react'
import {
  Password,
  TextInput,
  Textarea,
  type PasswordProps,
  type TextareaProps,
  type TextInputProps,
} from '@/design-system'

type CommitKind = 'text' | 'password'

export interface CommitInputProps extends Omit<TextInputProps, 'onChange' | 'type'> {
  kind?: CommitKind
  type?: TextInputProps['type']
  onCommit?: (value: string) => void
}

export function CommitInput({ kind = 'text', type, value, onCommit, onBlur, onKeyDown, ...rest }: CommitInputProps) {
  const [draft, setDraft] = useState<string | null>(null)
  const current = value === null || value === undefined ? '' : String(value)
  const shown = draft ?? current

  function commit() {
    if (draft === null) return
    setDraft(null)
    if (draft !== current) onCommit?.(draft)
  }

  const shared = {
    ...rest,
    value: shown,
    onChange: setDraft,
    onBlur: (event: React.FocusEvent<HTMLInputElement>) => {
      commit()
      onBlur?.(event)
    },
    onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') commit()
      onKeyDown?.(event)
    },
  }

  if (kind === 'password') return <Password {...(shared as PasswordProps)} />
  return <TextInput {...shared} type={type} />
}

export interface CommitTextareaProps extends Omit<TextareaProps, 'onChange'> {
  onCommit?: (value: string) => void
}

export function CommitTextarea({ value, onCommit, onBlur, ...rest }: CommitTextareaProps) {
  const [draft, setDraft] = useState<string | null>(null)
  const current = value ?? ''
  const shown = draft ?? current

  return (
    <Textarea
      {...rest}
      value={shown}
      onChange={setDraft}
      onBlur={(event) => {
        if (draft !== null) {
          setDraft(null)
          if (draft !== current) onCommit?.(draft)
        }
        onBlur?.(event)
      }}
    />
  )
}
