import { useState, type KeyboardEvent } from 'react'
import { LucideIcon } from '../icons'
import { cn } from '../utils/cn'
import { KeyboardShortcut } from './KeyboardShortcut'
import { TextInput, type TextInputProps } from './TextInput'
import { Tooltip } from './Tooltip'

export type PasswordProps = Omit<TextInputProps, 'type' | 'suffix'>

export function Password({ value, onKeyDown, ...rest }: PasswordProps) {
  const [show, setShow] = useState(false)
  const showEye = !String(value ?? '').includes('*')

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(event)
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'i') {
      event.preventDefault()
      setShow((current) => !current)
    }
  }

  return (
    <TextInput
      {...rest}
      value={value}
      type={show ? 'text' : 'password'}
      onKeyDown={handleKeyDown}
      suffix={
        <Tooltip
          body={
            <div className="rounded bg-surface-gray-10 py-1.5 px-2 text-xs text-ink-base shadow-xl">
              <span className="flex items-center gap-1">
                {show ? 'Hide Password' : 'Show Password'}
                <KeyboardShortcut bg combo="Mod+I" className="!bg-surface-gray-8 !text-ink-gray-2 px-1" />
              </span>
            </div>
          }
        >
          <div>
            <button
              type="button"
              aria-label={show ? 'Hide password' : 'Show password'}
              className={cn('mr-1 cursor-pointer', !showEye && 'hidden')}
              onClick={() => setShow((current) => !current)}
            >
              <LucideIcon name={show ? 'eye-off' : 'eye'} className="size-3" />
            </button>
          </div>
        </Tooltip>
      }
    />
  )
}
