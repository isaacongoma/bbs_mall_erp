import { useEffect, useRef, type ClipboardEvent, type KeyboardEvent } from 'react'

interface OtpInputProps {
  length: number
  value: string
  disabled?: boolean
  invalid?: boolean
  onChange: (value: string) => void
  onComplete?: (value: string) => void
}

export function OtpInput({ length, value, disabled, invalid, onChange, onComplete }: OtpInputProps) {
  const refs = useRef<Array<HTMLInputElement | null>>([])

  useEffect(() => {
    refs.current[0]?.focus()
  }, [])

  function update(next: string) {
    const clean = next.replace(/\D/g, '').slice(0, length)
    onChange(clean)
    if (clean.length === length) onComplete?.(clean)
  }

  function change(index: number, entry: string) {
    const digits = entry.replace(/\D/g, '')
    if (!digits) return
    const chars = value.padEnd(length, ' ').split('')
    const incoming = digits.slice(0, length - index).split('')
    incoming.forEach((digit, offset) => {
      chars[index + offset] = digit
    })
    update(chars.join('').replace(/ /g, ''))
    refs.current[Math.min(index + incoming.length, length - 1)]?.focus()
  }

  function keyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace') {
      event.preventDefault()
      const chars = value.padEnd(length, ' ').split('')
      if (chars[index] !== ' ') {
        chars[index] = ' '
        update(chars.join('').trimEnd())
      } else if (index > 0) {
        chars[index - 1] = ' '
        update(chars.join('').trimEnd())
        refs.current[index - 1]?.focus()
      }
    } else if (event.key === 'ArrowLeft' && index > 0) refs.current[index - 1]?.focus()
    else if (event.key === 'ArrowRight' && index < length - 1) refs.current[index + 1]?.focus()
  }

  function paste(event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault()
    update(event.clipboardData.getData('text'))
    refs.current[Math.min(event.clipboardData.getData('text').replace(/\D/g, '').length, length - 1)]?.focus()
  }

  return (
    <div className="flex w-full justify-between gap-2 sm:gap-3" role="group" aria-label="Verification code">
      {Array.from({ length }, (_, index) => (
        <input
          key={index}
          ref={(element) => {
            refs.current[index] = element
          }}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          aria-label={`Digit ${index + 1}`}
          maxLength={length}
          disabled={disabled}
          value={value[index] ?? ''}
          onChange={(event) => change(index, event.target.value)}
          onKeyDown={(event) => keyDown(index, event)}
          onPaste={paste}
          onFocus={(event) => event.target.select()}
          className={`h-14 min-w-0 flex-1 rounded-[10px] border bg-[#f3f4f6] text-center text-[22px] font-semibold text-black outline-none transition focus:border-[#9a6f00] focus:bg-white focus:ring-0 sm:h-16 ${
            invalid ? 'border-[#b42318]' : 'border-transparent'
          }`}
        />
      ))}
    </div>
  )
}
