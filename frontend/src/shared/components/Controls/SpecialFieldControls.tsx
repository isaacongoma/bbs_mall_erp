import { useEffect, useRef, useState } from 'react'
import { IconPicker, TextInput, Textarea, cn } from '@/design-system'
import { __ } from '@/core/i18n'

export interface JsonControlProps {
  value?: unknown
  disabled?: boolean
  placeholder?: string
  description?: string
  onCommit?: (value: string) => void
}

export function JsonControl({ value, disabled = false, placeholder, description, onCommit }: JsonControlProps) {
  const current = typeof value === 'string' ? value : value == null ? '' : JSON.stringify(value, null, 2)
  const [draft, setDraft] = useState<string | null>(null)
  const [invalid, setInvalid] = useState(false)
  const shown = draft ?? current

  function commit() {
    if (draft === null) return
    try {
      JSON.parse(draft)
      setDraft(null)
      setInvalid(false)
      if (draft !== current) onCommit?.(draft)
    } catch {
      setInvalid(true)
    }
  }

  return (
    <Textarea
      value={shown}
      placeholder={placeholder}
      description={description}
      error={invalid ? __('Enter valid JSON') : undefined}
      disabled={disabled}
      rows={6}
      onChange={(next) => {
        setDraft(next)
        setInvalid(false)
      }}
      onBlur={commit}
    />
  )
}

export interface SignatureControlProps {
  value?: string | null
  disabled?: boolean
  onChange?: (value: string | null) => void
}

function getContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D | null {
  if (typeof navigator !== 'undefined' && navigator.userAgent.includes('jsdom')) return null
  try {
    return canvas.getContext('2d')
  } catch {
    return null
  }
}

export function SignatureControl({ value = null, disabled = false, onChange }: SignatureControlProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [drawing, setDrawing] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = getContext(canvas)
    if (!context) return
    context.clearRect(0, 0, canvas.width, canvas.height)
    if (!value) return
    const image = new Image()
    image.onload = () => context.drawImage(image, 0, 0, canvas.width, canvas.height)
    image.src = value
  }, [value])

  function point(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    if (!canvas) return null
    const bounds = canvas.getBoundingClientRect()
    return {
      x: ((event.clientX - bounds.left) / bounds.width) * canvas.width,
      y: ((event.clientY - bounds.top) / bounds.height) * canvas.height,
    }
  }

  function start(event: React.PointerEvent<HTMLCanvasElement>) {
    if (disabled) return
    const position = point(event)
    const context = canvasRef.current ? getContext(canvasRef.current) : null
    if (!position || !context) return
    context.beginPath()
    context.moveTo(position.x, position.y)
    setDrawing(true)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function move(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing) return
    const position = point(event)
    const context = canvasRef.current ? getContext(canvasRef.current) : null
    if (!position || !context) return
    context.lineTo(position.x, position.y)
    context.stroke()
  }

  function finish(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing) return
    setDrawing(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId)
    const canvas = canvasRef.current
    if (!canvas) return
    try {
      onChange?.(canvas.toDataURL('image/png'))
    } catch {
      onChange?.(null)
    }
  }

  function clear() {
    const canvas = canvasRef.current
    const context = canvas ? getContext(canvas) : null
    if (!canvas || !context) return
    context.clearRect(0, 0, canvas.width, canvas.height)
    onChange?.(null)
  }

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        width={600}
        height={180}
        className={cn(
          'h-36 w-full rounded border border-outline-gray-2 bg-surface-base touch-none',
          disabled && 'opacity-60',
        )}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={finish}
        onPointerCancel={finish}
        aria-label={__('Signature')}
      />
      {!disabled && (
        <button type="button" className="text-sm text-ink-gray-6 hover:text-ink-gray-9" onClick={clear}>
          {__('Clear signature')}
        </button>
      )}
    </div>
  )
}

export interface ColorControlProps {
  value?: string | null
  disabled?: boolean
  onChange?: (value: string) => void
}

export function ColorControl({ value = '#000000', disabled = false, onChange }: ColorControlProps) {
  return (
    <TextInput
      type="color"
      value={value || '#000000'}
      disabled={disabled}
      className="min-w-14 cursor-pointer p-0.5"
      onChange={onChange}
    />
  )
}

export interface IconControlProps {
  value?: string | null
  disabled?: boolean
  placeholder?: string
  onChange?: (value: string | null) => void
}

export function IconControl({ value, disabled = false, placeholder, onChange }: IconControlProps) {
  return <IconPicker value={value} disabled={disabled} placeholder={placeholder} onChange={onChange} />
}
